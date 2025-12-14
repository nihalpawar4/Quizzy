'use client';

/**
 * Call Screen Component
 * Main interface during an active call
 * WhatsApp-like full-screen call UI
 * 
 * By Nihal Pawar
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Phone,
    PhoneOff,
    Mic,
    MicOff,
    Video,
    VideoOff,
    Volume2,
    User,
    Maximize,
    Minimize,
    RotateCcw
} from 'lucide-react';
import { useCall } from '@/contexts/CallContext';

export default function CallScreen() {
    const {
        currentCall,
        callStatus,
        isInCall,
        isMuted,
        isCameraOff,
        callDuration,
        localStream,
        remoteStream,
        endCall,
        toggleMute,
        toggleCamera,
        formatDuration
    } = useCall();

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const remoteAudioRef = useRef<HTMLAudioElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);

    // Set up LOCAL video element when local stream changes
    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
            console.log('Local stream attached to video element');
        }
    }, [localStream]);

    // Set up REMOTE video element when remote stream changes (for video calls)
    useEffect(() => {
        if (remoteVideoRef.current && remoteStream && currentCall?.type === 'video') {
            remoteVideoRef.current.srcObject = remoteStream;
            console.log('Remote stream attached to video element');
            // Ensure video plays
            remoteVideoRef.current.play().catch(err => {
                console.log('Video autoplay blocked:', err);
            });
        }
    }, [remoteStream, currentCall?.type]);

    // ALWAYS set up REMOTE audio element when remote stream changes
    // This works for BOTH audio and video calls - ensures audio always plays
    useEffect(() => {
        const audioElement = remoteAudioRef.current;
        if (!audioElement || !remoteStream) return;

        console.log('[CallScreen] Setting up remote audio, call type:', currentCall?.type);
        console.log('[CallScreen] Remote stream tracks:', remoteStream.getTracks().map(t => `${t.kind}:${t.enabled}`));

        // Set the stream
        audioElement.srcObject = remoteStream;

        // Ensure audio element is properly configured
        audioElement.muted = false;
        audioElement.volume = 1.0;
        audioElement.autoplay = true;

        console.log('[CallScreen] Audio element config - muted:', audioElement.muted, 'volume:', audioElement.volume);

        // Aggressively try to play with multiple retries
        let retryCount = 0;
        const maxRetries = 5;

        const playAudio = async () => {
            try {
                console.log('[CallScreen] Attempting to play remote audio, attempt:', retryCount + 1);
                await audioElement.play();
                console.log('[CallScreen] ✅ Remote audio is playing! Paused:', audioElement.paused, 'ReadyState:', audioElement.readyState);
            } catch (err) {
                console.error('[CallScreen] ❌ Audio play failed, attempt', retryCount + 1, ':', err);

                if (retryCount < maxRetries) {
                    retryCount++;
                    const delay = retryCount * 500; // Increasing delay
                    console.log('[CallScreen] Retrying in', delay, 'ms...');
                    setTimeout(() => playAudio(), delay);
                } else {
                    console.error('[CallScreen] CRITICAL: Failed to play audio after', maxRetries, 'attempts');
                    // Try one last time by reloading the stream
                    audioElement.load();
                    setTimeout(() => {
                        audioElement.play().catch(e => console.error('[CallScreen] Final play attempt failed:', e));
                    }, 1000);
                }
            }
        };

        // Start playing
        playAudio();

        // Also listen for stream changes
        const handleTrackEnabled = () => {
            console.log('[CallScreen] Remote track enabled/disabled, attempting play');
            audioElement.play().catch(e => console.log('[CallScreen] Track change play failed:', e));
        };

        remoteStream.getTracks().forEach(track => {
            track.addEventListener('enabled', handleTrackEnabled);
            track.addEventListener('mute', () => console.log('[CallScreen] Remote track muted:', track.kind));
            track.addEventListener('unmute', () => console.log('[CallScreen] Remote track unmuted:', track.kind));
        });

        return () => {
            remoteStream.getTracks().forEach(track => {
                track.removeEventListener('enabled', handleTrackEnabled);
            });
        };
    }, [remoteStream, currentCall?.type]);

    // Auto-hide controls after 5 seconds
    useEffect(() => {
        if (callStatus === 'connected' && currentCall?.type === 'video') {
            const timer = setTimeout(() => setShowControls(false), 5000);
            return () => clearTimeout(timer);
        }
    }, [showControls, callStatus, currentCall?.type]);

    // Handle end call
    const handleEndCall = async () => {
        try {
            await endCall();
        } catch (error) {
            console.error('Failed to end call:', error);
        }
    };

    // Toggle fullscreen
    const handleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    // Get participant info - determine who the OTHER person is
    const getOtherParticipant = () => {
        if (!currentCall) return { name: 'Unknown', photo: undefined };

        return {
            name: currentCall.calleeName || currentCall.callerName || 'Unknown',
            photo: currentCall.calleePhotoURL || currentCall.callerPhotoURL
        };
    };

    const { name: participantName, photo: participantPhoto } = getOtherParticipant();

    // Get status text
    const getStatusText = () => {
        switch (callStatus) {
            case 'ringing':
                return 'Ringing...';
            case 'connecting':
                return 'Connecting...';
            case 'connected':
                return formatDuration(callDuration);
            default:
                return 'Calling...';
        }
    };

    if (!isInCall || !currentCall) return null;

    const isVideoCall = currentCall.type === 'video';

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-gray-950"
                onClick={() => isVideoCall && setShowControls(!showControls)}
            >
                {/* Hidden audio element for remote audio - ALWAYS RENDERED */}
                <audio
                    ref={remoteAudioRef}
                    autoPlay
                    playsInline
                    muted={false}
                    style={{ display: 'none' }}
                />

                {/* Video Call UI */}
                {isVideoCall ? (
                    <div className="relative w-full h-full">
                        {/* Remote Video (Full Screen) */}
                        <video
                            ref={remoteVideoRef}
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover"
                        />

                        {/* Fallback when no remote video */}
                        {!remoteStream && (
                            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-gray-900 to-gray-950">
                                <div className="text-center">
                                    {participantPhoto ? (
                                        <img
                                            src={participantPhoto}
                                            alt={participantName}
                                            className="w-32 h-32 rounded-full object-cover mx-auto mb-4 border-4 border-gray-700"
                                        />
                                    ) : (
                                        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4 border-4 border-gray-700">
                                            <User className="w-16 h-16 text-white" />
                                        </div>
                                    )}
                                    <h3 className="text-2xl font-bold text-white mb-2">{participantName}</h3>
                                    <p className="text-gray-400">{getStatusText()}</p>
                                </div>
                            </div>
                        )}

                        {/* Local Video (Picture-in-Picture) */}
                        <motion.div
                            drag
                            dragMomentum={false}
                            className="absolute top-4 right-4 w-32 h-44 sm:w-40 sm:h-56 rounded-2xl overflow-hidden shadow-2xl border-2 border-gray-700 bg-gray-900"
                        >
                            {localStream && !isCameraOff ? (
                                <video
                                    ref={localVideoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="w-full h-full object-cover mirror"
                                    style={{ transform: 'scaleX(-1)' }}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-800">
                                    <VideoOff className="w-8 h-8 text-gray-500" />
                                </div>
                            )}
                        </motion.div>

                        {/* Controls Overlay */}
                        <AnimatePresence>
                            {showControls && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40"
                                >
                                    {/* Top Bar */}
                                    <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center">
                                                <Video className="w-5 h-5 text-green-400" />
                                            </div>
                                            <div>
                                                <p className="text-white font-medium">{participantName}</p>
                                                <p className="text-gray-400 text-sm">{getStatusText()}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleFullscreen}
                                            className="p-2 rounded-full bg-gray-800/50 hover:bg-gray-700/50"
                                        >
                                            {isFullscreen ? (
                                                <Minimize className="w-5 h-5 text-white" />
                                            ) : (
                                                <Maximize className="w-5 h-5 text-white" />
                                            )}
                                        </button>
                                    </div>

                                    {/* Bottom Controls */}
                                    <div className="absolute bottom-8 left-0 right-0">
                                        <div className="flex items-center justify-center gap-4">
                                            {/* Mute Button */}
                                            <motion.button
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                                                className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${isMuted ? 'bg-red-500' : 'bg-gray-700 hover:bg-gray-600'
                                                    }`}
                                            >
                                                {isMuted ? (
                                                    <MicOff className="w-6 h-6 text-white" />
                                                ) : (
                                                    <Mic className="w-6 h-6 text-white" />
                                                )}
                                            </motion.button>

                                            {/* Camera Toggle */}
                                            <motion.button
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={(e) => { e.stopPropagation(); toggleCamera(); }}
                                                className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${isCameraOff ? 'bg-red-500' : 'bg-gray-700 hover:bg-gray-600'
                                                    }`}
                                            >
                                                {isCameraOff ? (
                                                    <VideoOff className="w-6 h-6 text-white" />
                                                ) : (
                                                    <Video className="w-6 h-6 text-white" />
                                                )}
                                            </motion.button>

                                            {/* End Call Button */}
                                            <motion.button
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={(e) => { e.stopPropagation(); handleEndCall(); }}
                                                className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/30 hover:bg-red-600 transition-colors"
                                            >
                                                <PhoneOff className="w-7 h-7 text-white" />
                                            </motion.button>

                                            {/* Flip Camera (placeholder) */}
                                            <motion.button
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={(e) => e.stopPropagation()}
                                                className="w-14 h-14 rounded-full bg-gray-700 flex items-center justify-center hover:bg-gray-600 transition-colors"
                                            >
                                                <RotateCcw className="w-6 h-6 text-white" />
                                            </motion.button>

                                            {/* Speaker (placeholder) */}
                                            <motion.button
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={(e) => e.stopPropagation()}
                                                className="w-14 h-14 rounded-full bg-gray-700 flex items-center justify-center hover:bg-gray-600 transition-colors"
                                            >
                                                <Volume2 className="w-6 h-6 text-white" />
                                            </motion.button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ) : (
                    /* Audio Call UI */
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 via-gray-950 to-black p-8">
                        {/* Participant Avatar */}
                        <motion.div
                            animate={{
                                scale: callStatus === 'ringing' ? [1, 1.05, 1] : 1,
                            }}
                            transition={{
                                duration: 2,
                                repeat: callStatus === 'ringing' ? Infinity : 0,
                            }}
                            className="relative mb-8"
                        >
                            {/* Pulse effect for ringing */}
                            {callStatus === 'ringing' && (
                                <>
                                    <motion.div
                                        animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                                        transition={{ duration: 1.5, repeat: Infinity }}
                                        className="absolute inset-0 rounded-full bg-green-500/30"
                                    />
                                    <motion.div
                                        animate={{ scale: [1, 1.8], opacity: [0.3, 0] }}
                                        transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                                        className="absolute inset-0 rounded-full bg-green-500/20"
                                    />
                                </>
                            )}

                            {/* Connected indicator */}
                            {callStatus === 'connected' && (
                                <motion.div
                                    animate={{ scale: [1, 1.1, 1] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-green-500 rounded-full flex items-center gap-1"
                                >
                                    <Phone className="w-3 h-3 text-white" />
                                    <span className="text-white text-xs font-medium">Connected</span>
                                </motion.div>
                            )}

                            {participantPhoto ? (
                                <img
                                    src={participantPhoto}
                                    alt={participantName}
                                    className="w-40 h-40 rounded-full object-cover border-4 border-gray-700 relative z-10"
                                />
                            ) : (
                                <div className="w-40 h-40 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center border-4 border-gray-700 relative z-10">
                                    <User className="w-20 h-20 text-white" />
                                </div>
                            )}
                        </motion.div>

                        {/* Participant Name */}
                        <h2 className="text-3xl font-bold text-white mb-2">{participantName}</h2>

                        {/* Call Status */}
                        <p className="text-gray-400 text-lg mb-12">{getStatusText()}</p>

                        {/* Audio Visualization (placeholder) */}
                        {callStatus === 'connected' && (
                            <div className="flex items-center gap-1 mb-12">
                                {[...Array(5)].map((_, i) => (
                                    <motion.div
                                        key={i}
                                        animate={{
                                            height: [20, 40, 20],
                                        }}
                                        transition={{
                                            duration: 0.5,
                                            repeat: Infinity,
                                            delay: i * 0.1,
                                        }}
                                        className="w-1.5 bg-green-500 rounded-full"
                                    />
                                ))}
                            </div>
                        )}

                        {/* Control Buttons */}
                        <div className="flex items-center justify-center gap-6">
                            {/* Mute Button */}
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={toggleMute}
                                className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${isMuted ? 'bg-red-500' : 'bg-gray-700 hover:bg-gray-600'
                                    }`}
                            >
                                {isMuted ? (
                                    <MicOff className="w-7 h-7 text-white" />
                                ) : (
                                    <Mic className="w-7 h-7 text-white" />
                                )}
                            </motion.button>

                            {/* End Call Button */}
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={handleEndCall}
                                className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/30 hover:bg-red-600 transition-colors"
                            >
                                <PhoneOff className="w-8 h-8 text-white" />
                            </motion.button>

                            {/* Speaker Button */}
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center hover:bg-gray-600 transition-colors"
                            >
                                <Volume2 className="w-7 h-7 text-white" />
                            </motion.button>
                        </div>
                    </div>
                )}
            </motion.div>
        </AnimatePresence>
    );
}
