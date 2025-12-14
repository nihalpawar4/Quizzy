'use client';

/**
 * Incoming Call Modal Component
 * Shows when someone is calling the user
 * WhatsApp-like incoming call UI
 * 
 * By Nihal Pawar
 */

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Video, User } from 'lucide-react';
import { useCall } from '@/contexts/CallContext';

export default function IncomingCallModal() {
    const { incomingCall, answerCall, rejectCall } = useCall();
    const ringtoneRef = useRef<HTMLAudioElement | null>(null);

    // Play ringtone when incoming call
    useEffect(() => {
        if (incomingCall) {
            // Create and play ringtone
            ringtoneRef.current = new Audio('/sounds/ringtone.mp3');
            ringtoneRef.current.loop = true;
            ringtoneRef.current.volume = 0.5;
            ringtoneRef.current.play().catch(() => {
                // Autoplay might be blocked
                console.log('Ringtone autoplay blocked');
            });
        } else {
            // Stop ringtone
            if (ringtoneRef.current) {
                ringtoneRef.current.pause();
                ringtoneRef.current.currentTime = 0;
                ringtoneRef.current = null;
            }
        }

        return () => {
            if (ringtoneRef.current) {
                ringtoneRef.current.pause();
                ringtoneRef.current = null;
            }
        };
    }, [incomingCall]);

    const handleAnswer = async () => {
        try {
            await answerCall();
        } catch (error) {
            console.error('Failed to answer call:', error);
            alert('Failed to answer call. Please check your camera/microphone permissions.');
        }
    };

    const handleReject = async () => {
        try {
            await rejectCall();
        } catch (error) {
            console.error('Failed to reject call:', error);
        }
    };

    return (
        <AnimatePresence>
            {incomingCall && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                >
                    <motion.div
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 20 }}
                        className="bg-gradient-to-b from-gray-900 to-gray-950 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl border border-gray-800"
                    >
                        {/* Call Type Indicator */}
                        <div className="flex items-center justify-center gap-2 mb-6">
                            {incomingCall.type === 'video' ? (
                                <Video className="w-5 h-5 text-blue-400" />
                            ) : (
                                <Phone className="w-5 h-5 text-green-400" />
                            )}
                            <span className="text-gray-400 text-sm font-medium">
                                Incoming {incomingCall.type === 'video' ? 'Video' : 'Audio'} Call
                            </span>
                        </div>

                        {/* Caller Avatar with Pulse Animation */}
                        <div className="relative mx-auto w-28 h-28 mb-6">
                            {/* Pulse rings */}
                            <motion.div
                                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="absolute inset-0 rounded-full bg-green-500/30"
                            />
                            <motion.div
                                animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
                                transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                                className="absolute inset-0 rounded-full bg-green-500/20"
                            />

                            {/* Avatar */}
                            {incomingCall.callerPhotoURL ? (
                                <img
                                    src={incomingCall.callerPhotoURL}
                                    alt={incomingCall.callerName}
                                    className="w-28 h-28 rounded-full object-cover border-4 border-gray-700 relative z-10"
                                />
                            ) : (
                                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center border-4 border-gray-700 relative z-10">
                                    <User className="w-14 h-14 text-white" />
                                </div>
                            )}
                        </div>

                        {/* Caller Name */}
                        <h3 className="text-2xl font-bold text-white mb-2">
                            {incomingCall.callerName}
                        </h3>
                        <p className="text-gray-400 mb-8">
                            {incomingCall.type === 'video' ? 'Video Call' : 'Audio Call'}
                        </p>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-center gap-8">
                            {/* Reject Button */}
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={handleReject}
                                className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/30 hover:bg-red-600 transition-colors"
                            >
                                <PhoneOff className="w-7 h-7 text-white" />
                            </motion.button>

                            {/* Answer Button */}
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={handleAnswer}
                                className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/30 hover:bg-green-600 transition-colors"
                            >
                                {incomingCall.type === 'video' ? (
                                    <Video className="w-7 h-7 text-white" />
                                ) : (
                                    <Phone className="w-7 h-7 text-white" />
                                )}
                            </motion.button>
                        </div>

                        {/* Hint text */}
                        <p className="text-gray-500 text-xs mt-6">
                            Slide up to see more options
                        </p>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
