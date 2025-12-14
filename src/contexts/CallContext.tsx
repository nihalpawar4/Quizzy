'use client';

/**
 * Call Context for Real-Time Audio/Video Calling
 * Manages call state and provides call functionality across the app
 * 
 * By Nihal Pawar
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import {
    CallManager,
    subscribeToIncomingCalls,
    updateCallStatus,
    formatCallDuration
} from '@/lib/callService';
import type { Call, CallType, CallStatus } from '@/types';

interface CallContextType {
    // State
    currentCall: Call | null;
    incomingCall: Call | null;
    callStatus: CallStatus | null;
    isInCall: boolean;
    isMuted: boolean;
    isCameraOff: boolean;
    callDuration: number;
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;

    // Actions
    initiateCall: (
        calleeId: string,
        calleeName: string,
        calleePhotoURL: string | undefined,
        chatId: string,
        callType: CallType
    ) => Promise<void>;
    answerCall: () => Promise<void>;
    rejectCall: () => Promise<void>;
    endCall: () => Promise<void>;
    toggleMute: () => void;
    toggleCamera: () => void;

    // Helpers
    formatDuration: (seconds: number) => string;
}

const CallContext = createContext<CallContextType | null>(null);

export function CallProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();

    // Call state
    const [currentCall, setCurrentCall] = useState<Call | null>(null);
    const [incomingCall, setIncomingCall] = useState<Call | null>(null);
    const [callStatus, setCallStatus] = useState<CallStatus | null>(null);
    const [isInCall, setIsInCall] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const [callDuration, setCallDuration] = useState(0);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

    // Refs
    const callManagerRef = useRef<CallManager | null>(null);
    const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const incomingCallUnsubRef = useRef<(() => void) | null>(null);

    // Cleanup function
    const cleanup = useCallback(() => {
        // Stop duration timer
        if (durationIntervalRef.current) {
            clearInterval(durationIntervalRef.current);
            durationIntervalRef.current = null;
        }

        // Cleanup call manager
        if (callManagerRef.current) {
            callManagerRef.current.cleanup();
            callManagerRef.current = null;
        }

        // Reset state
        setCurrentCall(null);
        setCallStatus(null);
        setIsInCall(false);
        setIsMuted(false);
        setIsCameraOff(false);
        setCallDuration(0);
        setLocalStream(null);
        setRemoteStream(null);
    }, []);

    // Subscribe to incoming calls when user is logged in
    useEffect(() => {
        if (!user?.uid) {
            if (incomingCallUnsubRef.current) {
                incomingCallUnsubRef.current();
                incomingCallUnsubRef.current = null;
            }
            return;
        }

        // Subscribe to incoming calls
        incomingCallUnsubRef.current = subscribeToIncomingCalls(user.uid, (call) => {
            // Don't show incoming call if we're already in a call
            if (!isInCall && call) {
                setIncomingCall(call);
            } else if (!call) {
                setIncomingCall(null);
            }
        });

        return () => {
            if (incomingCallUnsubRef.current) {
                incomingCallUnsubRef.current();
                incomingCallUnsubRef.current = null;
            }
        };
    }, [user?.uid, isInCall]);

    // Start call duration timer when connected
    useEffect(() => {
        if (callStatus === 'connected' && !durationIntervalRef.current) {
            durationIntervalRef.current = setInterval(() => {
                setCallDuration((prev) => prev + 1);
            }, 1000);
        } else if (callStatus !== 'connected' && durationIntervalRef.current) {
            clearInterval(durationIntervalRef.current);
            durationIntervalRef.current = null;
        }

        return () => {
            if (durationIntervalRef.current) {
                clearInterval(durationIntervalRef.current);
            }
        };
    }, [callStatus]);

    /**
     * Initiate a call to another user
     */
    const initiateCall = useCallback(async (
        calleeId: string,
        calleeName: string,
        calleePhotoURL: string | undefined,
        chatId: string,
        callType: CallType
    ) => {
        if (!user || isInCall) return;

        try {
            // Create call manager
            const manager = new CallManager();
            callManagerRef.current = manager;

            // Set up callbacks
            manager.onRemoteStream = (stream) => {
                setRemoteStream(stream);
            };

            manager.onCallStatusChange = (status) => {
                setCallStatus(status);
            };

            manager.onCallEnded = () => {
                cleanup();
            };

            manager.onError = (error) => {
                console.error('Call error:', error);
                cleanup();
            };

            // Initiate the call
            const callId = await manager.initiateCall(
                user.uid,
                user.name,
                user.photoURL || undefined,
                calleeId,
                calleeName,
                calleePhotoURL,
                chatId,
                callType
            );

            // Update local state
            setCurrentCall({
                id: callId,
                callerId: user.uid,
                callerName: user.name,
                callerPhotoURL: user.photoURL || undefined,
                calleeId,
                calleeName,
                calleePhotoURL,
                chatId,
                type: callType,
                status: 'ringing',
                createdAt: new Date(),
            });
            setCallStatus('ringing');
            setIsInCall(true);
            setLocalStream(manager.getLocalStream());
            setCallDuration(0);
        } catch (error) {
            console.error('Failed to initiate call:', error);
            cleanup();
            throw error;
        }
    }, [user, isInCall, cleanup]);

    /**
     * Answer incoming call
     */
    const answerCall = useCallback(async () => {
        if (!incomingCall || isInCall) return;

        try {
            // Create call manager
            const manager = new CallManager();
            callManagerRef.current = manager;

            // Set up callbacks
            manager.onRemoteStream = (stream) => {
                setRemoteStream(stream);
            };

            manager.onCallStatusChange = (status) => {
                setCallStatus(status);
            };

            manager.onCallEnded = () => {
                cleanup();
            };

            manager.onError = (error) => {
                console.error('Call error:', error);
                cleanup();
            };

            // Answer the call
            await manager.answerCall(incomingCall.id, incomingCall.type);

            // Update state
            setCurrentCall(incomingCall);
            setCallStatus('connecting');
            setIsInCall(true);
            setIncomingCall(null);
            setLocalStream(manager.getLocalStream());
            setCallDuration(0);
        } catch (error) {
            console.error('Failed to answer call:', error);
            cleanup();
            throw error;
        }
    }, [incomingCall, isInCall, cleanup]);

    /**
     * Reject incoming call
     */
    const rejectCall = useCallback(async () => {
        if (!incomingCall) return;

        try {
            await updateCallStatus(incomingCall.id, 'rejected');
            setIncomingCall(null);
        } catch (error) {
            console.error('Failed to reject call:', error);
        }
    }, [incomingCall]);

    /**
     * End current call
     */
    const endCall = useCallback(async () => {
        if (callManagerRef.current) {
            await callManagerRef.current.endCurrentCall();
        }
        cleanup();
    }, [cleanup]);

    /**
     * Toggle mute
     */
    const toggleMuteHandler = useCallback(() => {
        if (callManagerRef.current) {
            const muted = callManagerRef.current.toggleMute();
            setIsMuted(muted);
        }
    }, []);

    /**
     * Toggle camera
     */
    const toggleCameraHandler = useCallback(() => {
        if (callManagerRef.current) {
            const cameraOff = callManagerRef.current.toggleCamera();
            setIsCameraOff(cameraOff);
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            cleanup();
        };
    }, [cleanup]);

    const value: CallContextType = {
        currentCall,
        incomingCall,
        callStatus,
        isInCall,
        isMuted,
        isCameraOff,
        callDuration,
        localStream,
        remoteStream,
        initiateCall,
        answerCall,
        rejectCall,
        endCall,
        toggleMute: toggleMuteHandler,
        toggleCamera: toggleCameraHandler,
        formatDuration: formatCallDuration,
    };

    return (
        <CallContext.Provider value={value}>
            {children}
        </CallContext.Provider>
    );
}

export function useCall() {
    const context = useContext(CallContext);
    if (!context) {
        throw new Error('useCall must be used within a CallProvider');
    }
    return context;
}
