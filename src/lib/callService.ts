/**
 * WebRTC Call Service
 * Handles peer-to-peer audio/video calls using WebRTC
 * Signaling is done via Firebase Firestore
 * 
 * By Nihal Pawar
 */

import {
    collection,
    doc,
    setDoc,
    getDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    Timestamp,
    type Unsubscribe
} from 'firebase/firestore';
import { db } from './firebase';
import { COLLECTIONS } from './constants';
import type { Call, CallType, CallStatus } from '@/types';
import { CALL_CONSTANTS } from '@/types';

// ==================== CONFIGURATION ====================

/**
 * Free STUN servers from Google for NAT traversal
 * These help establish peer-to-peer connections through firewalls
 */
const ICE_SERVERS: RTCConfiguration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
    ],
    iceCandidatePoolSize: 10,
};

// ==================== CALL DOCUMENT OPERATIONS ====================

/**
 * Create a new call document (caller initiates)
 */
export async function createCall(
    callerId: string,
    callerName: string,
    callerPhotoURL: string | undefined,
    calleeId: string,
    calleeName: string,
    calleePhotoURL: string | undefined,
    chatId: string,
    callType: CallType
): Promise<string> {
    const callRef = doc(collection(db, COLLECTIONS.CALLS));
    const callId = callRef.id;

    const callData = {
        callerId,
        callerName,
        callerPhotoURL: callerPhotoURL || null,
        calleeId,
        calleeName,
        calleePhotoURL: calleePhotoURL || null,
        chatId,
        type: callType,
        status: 'ringing' as CallStatus,
        callerCandidates: [],
        calleeCandidates: [],
        createdAt: Timestamp.now(),
    };

    await setDoc(callRef, callData);
    return callId;
}

/**
 * Get call document by ID
 */
export async function getCall(callId: string): Promise<Call | null> {
    const callRef = doc(db, COLLECTIONS.CALLS, callId);
    const callSnap = await getDoc(callRef);

    if (!callSnap.exists()) return null;

    const data = callSnap.data();
    return {
        id: callSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        answeredAt: data.answeredAt?.toDate(),
        endedAt: data.endedAt?.toDate(),
    } as Call;
}

/**
 * Update call with SDP offer (caller side)
 */
export async function setCallOffer(
    callId: string,
    offer: RTCSessionDescriptionInit
): Promise<void> {
    const callRef = doc(db, COLLECTIONS.CALLS, callId);
    await updateDoc(callRef, {
        offer: {
            type: offer.type,
            sdp: offer.sdp,
        },
    });
}

/**
 * Update call with SDP answer (callee side)
 */
export async function setCallAnswer(
    callId: string,
    answer: RTCSessionDescriptionInit
): Promise<void> {
    const callRef = doc(db, COLLECTIONS.CALLS, callId);
    await updateDoc(callRef, {
        answer: {
            type: answer.type,
            sdp: answer.sdp,
        },
        status: 'connecting',
        answeredAt: Timestamp.now(),
    });
}

/**
 * Add ICE candidate from caller
 */
export async function addCallerCandidate(
    callId: string,
    candidate: RTCIceCandidateInit
): Promise<void> {
    const callRef = doc(db, COLLECTIONS.CALLS, callId);
    const callSnap = await getDoc(callRef);

    if (!callSnap.exists()) return;

    const currentCandidates = callSnap.data().callerCandidates || [];
    await updateDoc(callRef, {
        callerCandidates: [...currentCandidates, candidate],
    });
}

/**
 * Add ICE candidate from callee
 */
export async function addCalleeCandidate(
    callId: string,
    candidate: RTCIceCandidateInit
): Promise<void> {
    const callRef = doc(db, COLLECTIONS.CALLS, callId);
    const callSnap = await getDoc(callRef);

    if (!callSnap.exists()) return;

    const currentCandidates = callSnap.data().calleeCandidates || [];
    await updateDoc(callRef, {
        calleeCandidates: [...currentCandidates, candidate],
    });
}

/**
 * Update call status
 */
export async function updateCallStatus(
    callId: string,
    status: CallStatus
): Promise<void> {
    const callRef = doc(db, COLLECTIONS.CALLS, callId);
    const updates: Record<string, unknown> = { status };

    if (status === 'connected') {
        updates.answeredAt = Timestamp.now();
    } else if (status === 'ended' || status === 'rejected' || status === 'missed') {
        updates.endedAt = Timestamp.now();
    }

    await updateDoc(callRef, updates);
}

/**
 * End call and calculate duration
 */
export async function endCall(callId: string): Promise<void> {
    const callRef = doc(db, COLLECTIONS.CALLS, callId);
    const callSnap = await getDoc(callRef);

    if (!callSnap.exists()) return;

    const data = callSnap.data();
    const answeredAt = data.answeredAt?.toDate();
    const now = new Date();
    const duration = answeredAt ? Math.floor((now.getTime() - answeredAt.getTime()) / 1000) : 0;

    await updateDoc(callRef, {
        status: 'ended',
        endedAt: Timestamp.now(),
        duration,
    });
}

/**
 * Delete call document (cleanup)
 */
export async function deleteCallDocument(callId: string): Promise<void> {
    const callRef = doc(db, COLLECTIONS.CALLS, callId);
    await deleteDoc(callRef);
}

/**
 * Subscribe to call document changes (real-time)
 */
export function subscribeToCall(
    callId: string,
    callback: (call: Call | null) => void
): Unsubscribe {
    const callRef = doc(db, COLLECTIONS.CALLS, callId);

    return onSnapshot(callRef, (snapshot) => {
        if (!snapshot.exists()) {
            callback(null);
            return;
        }

        const data = snapshot.data();
        callback({
            id: snapshot.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            answeredAt: data.answeredAt?.toDate(),
            endedAt: data.endedAt?.toDate(),
        } as Call);
    });
}

/**
 * Subscribe to incoming calls for a user
 */
export function subscribeToIncomingCalls(
    userId: string,
    callback: (call: Call | null) => void
): Unsubscribe {
    // We'll use a query on the calls collection
    // For simplicity, we store the current incoming call in the user's presence
    const callsRef = collection(db, COLLECTIONS.CALLS);

    // Listen to all calls where this user is the callee and status is ringing
    return onSnapshot(callsRef, (snapshot) => {
        let incomingCall: Call | null = null;

        snapshot.docs.forEach((doc) => {
            const data = doc.data();
            if (data.calleeId === userId && data.status === 'ringing') {
                incomingCall = {
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toDate() || new Date(),
                } as Call;
            }
        });

        callback(incomingCall);
    });
}

// ==================== WEBRTC PEER CONNECTION ====================

/**
 * Create a new RTCPeerConnection with ICE servers configured
 */
export function createPeerConnection(): RTCPeerConnection {
    return new RTCPeerConnection(ICE_SERVERS);
}

/**
 * Get user media (camera/microphone)
 */
export async function getUserMedia(
    callType: CallType
): Promise<MediaStream> {
    const constraints: MediaStreamConstraints = {
        audio: true,
        video: callType === 'video' ? {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user',
        } : false,
    };

    return navigator.mediaDevices.getUserMedia(constraints);
}

/**
 * Stop all tracks in a media stream
 */
export function stopMediaStream(stream: MediaStream | null): void {
    if (stream) {
        stream.getTracks().forEach((track) => {
            track.stop();
        });
    }
}

/**
 * Toggle mute on audio track
 */
export function toggleMute(stream: MediaStream): boolean {
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return !audioTrack.enabled; // Returns true if muted
    }
    return false;
}

/**
 * Toggle camera on/off
 */
export function toggleCamera(stream: MediaStream): boolean {
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        return !videoTrack.enabled; // Returns true if camera is off
    }
    return true;
}

/**
 * Format call duration as mm:ss
 */
export function formatCallDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// ==================== CALL ORCHESTRATION ====================

/**
 * CallManager class to handle the entire call lifecycle
 * This manages WebRTC connection and Firebase signaling
 */
export class CallManager {
    private peerConnection: RTCPeerConnection | null = null;
    private localStream: MediaStream | null = null;
    private remoteStream: MediaStream | null = null;
    private callId: string | null = null;
    private isCaller: boolean = false;
    private unsubscribeCall: Unsubscribe | null = null;
    private iceCandidatesQueue: RTCIceCandidateInit[] = [];
    private hasRemoteDescription: boolean = false;

    // Callbacks
    public onRemoteStream: ((stream: MediaStream) => void) | null = null;
    public onCallStatusChange: ((status: CallStatus) => void) | null = null;
    public onCallEnded: (() => void) | null = null;
    public onError: ((error: Error) => void) | null = null;

    /**
     * Initialize as caller - create call and send offer
     */
    async initiateCall(
        callerId: string,
        callerName: string,
        callerPhotoURL: string | undefined,
        calleeId: string,
        calleeName: string,
        calleePhotoURL: string | undefined,
        chatId: string,
        callType: CallType
    ): Promise<string> {
        this.isCaller = true;

        try {
            // 1. Get local media stream
            this.localStream = await getUserMedia(callType);

            // 2. Create call document in Firebase
            this.callId = await createCall(
                callerId,
                callerName,
                callerPhotoURL,
                calleeId,
                calleeName,
                calleePhotoURL,
                chatId,
                callType
            );

            // 3. Create peer connection
            this.peerConnection = createPeerConnection();
            this.setupPeerConnectionListeners();

            // 4. Add local tracks to peer connection
            this.localStream.getTracks().forEach((track) => {
                this.peerConnection!.addTrack(track, this.localStream!);
            });

            // 5. Create and set local offer
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);

            // 6. Save offer to Firebase
            await setCallOffer(this.callId, offer);

            // 7. Subscribe to call document for updates (answer, candidates)
            this.subscribeToCallUpdates();

            // 8. Set timeout for missed call
            setTimeout(() => {
                this.checkRingTimeout();
            }, CALL_CONSTANTS.RING_TIMEOUT_MS);

            return this.callId;
        } catch (error) {
            this.cleanup();
            throw error;
        }
    }

    /**
     * Initialize as callee - answer incoming call
     */
    async answerCall(callId: string, callType: CallType): Promise<void> {
        this.isCaller = false;
        this.callId = callId;

        try {
            // 1. Get local media stream
            this.localStream = await getUserMedia(callType);

            // 2. Get call document with offer
            const call = await getCall(callId);
            if (!call || !call.offer) {
                throw new Error('Call not found or no offer available');
            }

            // 3. Create peer connection
            this.peerConnection = createPeerConnection();
            this.setupPeerConnectionListeners();

            // 4. Add local tracks
            this.localStream.getTracks().forEach((track) => {
                this.peerConnection!.addTrack(track, this.localStream!);
            });

            // 5. Set remote description (offer from caller)
            await this.peerConnection.setRemoteDescription(
                new RTCSessionDescription(call.offer)
            );
            this.hasRemoteDescription = true;

            // 6. Add any queued ICE candidates from caller
            if (call.callerCandidates) {
                for (const candidate of call.callerCandidates) {
                    await this.peerConnection.addIceCandidate(
                        new RTCIceCandidate(candidate)
                    );
                }
            }

            // 7. Create and set local answer
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);

            // 8. Save answer to Firebase
            await setCallAnswer(callId, answer);

            // 9. Subscribe to call updates
            this.subscribeToCallUpdates();
        } catch (error) {
            this.cleanup();
            throw error;
        }
    }

    /**
     * Reject incoming call
     */
    async rejectCall(callId: string): Promise<void> {
        await updateCallStatus(callId, 'rejected');
    }

    /**
     * End current call
     */
    async endCurrentCall(): Promise<void> {
        if (this.callId) {
            await endCall(this.callId);
        }
        this.cleanup();
        this.onCallEnded?.();
    }

    /**
     * Get local media stream
     */
    getLocalStream(): MediaStream | null {
        return this.localStream;
    }

    /**
     * Get remote media stream
     */
    getRemoteStream(): MediaStream | null {
        return this.remoteStream;
    }

    /**
     * Toggle mute
     */
    toggleMute(): boolean {
        if (this.localStream) {
            return toggleMute(this.localStream);
        }
        return false;
    }

    /**
     * Toggle camera
     */
    toggleCamera(): boolean {
        if (this.localStream) {
            return toggleCamera(this.localStream);
        }
        return true;
    }

    /**
     * Setup peer connection event listeners
     */
    private setupPeerConnectionListeners(): void {
        if (!this.peerConnection) return;

        // Handle ICE candidates
        this.peerConnection.onicecandidate = async (event) => {
            if (event.candidate && this.callId) {
                const candidateInit = event.candidate.toJSON();
                if (this.isCaller) {
                    await addCallerCandidate(this.callId, candidateInit);
                } else {
                    await addCalleeCandidate(this.callId, candidateInit);
                }
            }
        };

        // Handle remote stream
        this.peerConnection.ontrack = (event) => {
            if (event.streams && event.streams[0]) {
                this.remoteStream = event.streams[0];
                this.onRemoteStream?.(this.remoteStream);
            }
        };

        // Handle connection state changes
        this.peerConnection.onconnectionstatechange = () => {
            const state = this.peerConnection?.connectionState;
            console.log('Connection state:', state);

            if (state === 'connected') {
                this.onCallStatusChange?.('connected');
                // Update Firebase
                if (this.callId) {
                    updateCallStatus(this.callId, 'connected').catch(console.error);
                }
            } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
                this.endCurrentCall();
            }
        };

        // Handle ICE connection state
        this.peerConnection.oniceconnectionstatechange = () => {
            console.log('ICE connection state:', this.peerConnection?.iceConnectionState);
        };
    }

    /**
     * Subscribe to call document updates
     */
    private subscribeToCallUpdates(): void {
        if (!this.callId) return;

        this.unsubscribeCall = subscribeToCall(this.callId, async (call) => {
            if (!call) {
                // Call document deleted
                this.cleanup();
                this.onCallEnded?.();
                return;
            }

            // Notify status change
            this.onCallStatusChange?.(call.status);

            // Handle call ended/rejected
            if (call.status === 'ended' || call.status === 'rejected' || call.status === 'missed') {
                this.cleanup();
                this.onCallEnded?.();
                return;
            }

            // If we're the caller and we received an answer
            if (this.isCaller && call.answer && !this.hasRemoteDescription) {
                try {
                    await this.peerConnection?.setRemoteDescription(
                        new RTCSessionDescription(call.answer)
                    );
                    this.hasRemoteDescription = true;

                    // Add any callee candidates that arrived
                    if (call.calleeCandidates) {
                        for (const candidate of call.calleeCandidates) {
                            await this.peerConnection?.addIceCandidate(
                                new RTCIceCandidate(candidate)
                            );
                        }
                    }
                } catch (error) {
                    console.error('Error setting remote description:', error);
                    this.onError?.(error as Error);
                }
            }

            // Handle new ICE candidates
            if (this.hasRemoteDescription) {
                const candidates = this.isCaller ? call.calleeCandidates : call.callerCandidates;
                if (candidates) {
                    for (const candidate of candidates) {
                        // Check if we already added this candidate
                        if (!this.iceCandidatesQueue.some(c =>
                            c.candidate === candidate.candidate
                        )) {
                            this.iceCandidatesQueue.push(candidate);
                            try {
                                await this.peerConnection?.addIceCandidate(
                                    new RTCIceCandidate(candidate)
                                );
                            } catch (error) {
                                console.error('Error adding ICE candidate:', error);
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Check if call should be marked as missed (ring timeout)
     */
    private async checkRingTimeout(): Promise<void> {
        if (!this.callId) return;

        const call = await getCall(this.callId);
        if (call && call.status === 'ringing') {
            await updateCallStatus(this.callId, 'missed');
            this.cleanup();
            this.onCallEnded?.();
        }
    }

    /**
     * Cleanup resources
     */
    cleanup(): void {
        // Stop local stream
        stopMediaStream(this.localStream);
        this.localStream = null;

        // Stop remote stream
        stopMediaStream(this.remoteStream);
        this.remoteStream = null;

        // Close peer connection
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }

        // Unsubscribe from call updates
        if (this.unsubscribeCall) {
            this.unsubscribeCall();
            this.unsubscribeCall = null;
        }

        // Reset state
        this.callId = null;
        this.isCaller = false;
        this.hasRemoteDescription = false;
        this.iceCandidatesQueue = [];
    }
}
