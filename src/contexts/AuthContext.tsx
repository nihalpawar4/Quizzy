'use client';

/**
 * Authentication Context Provider
 * Manages user authentication state across the application
 * Supports Email/Password and Google Sign-In
 * INCLUDES HARD SESSION PERSISTENCE
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    signOut as firebaseSignOut,
    User as FirebaseUser
} from 'firebase/auth';
import { auth, googleProvider, getSessionBackup, clearSessionBackup, initializePersistence } from '@/lib/firebase';
import { createUserProfile, getUserProfile } from '@/lib/services';
import { ADMIN_EMAILS, ADMIN_CODE } from '@/lib/constants';
import type { User } from '@/types';

// Extended AuthContextType with Google Sign-In and refreshUser
interface ExtendedAuthContextType {
    user: User | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string, name: string, role: 'student' | 'teacher', studentClass?: number) => Promise<void>;
    signInWithGoogle: (role: 'student' | 'teacher', studentClass?: number) => Promise<{ isNewUser: boolean; needsClassSelection: boolean }>;
    signOut: () => Promise<void>;
    refreshUser: () => Promise<void>;
    updateStudentClass: (studentClass: number) => Promise<void>;
}

const AuthContext = createContext<ExtendedAuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // Check if email is admin
    const isAdminEmail = (email: string): boolean => {
        return ADMIN_EMAILS.includes(email.toLowerCase());
    };

    // Refresh user data from Firestore
    const refreshUser = useCallback(async (): Promise<void> => {
        if (!auth.currentUser) return;
        const profile = await getUserProfile(auth.currentUser.uid);
        if (profile) {
            setUser(profile);
        }
    }, []);

    // Listen to auth state changes with session backup recovery
    useEffect(() => {
        // Initialize persistence first
        initializePersistence();

        // Check for session backup immediately
        const sessionBackup = getSessionBackup();
        let hasRestoredFromBackup = false;

        // Set a timeout for showing loading state
        const loadingTimeout = setTimeout(() => {
            // If after 3 seconds we still have no user but have backup, try to load from backup
            if (!auth.currentUser && sessionBackup && !hasRestoredFromBackup) {
                console.log('[Quizy Auth] Auth taking too long, checking backup');
                // Firebase should restore the session automatically, but log for debugging
            }
        }, 3000);

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
            clearTimeout(loadingTimeout);

            if (firebaseUser) {
                hasRestoredFromBackup = true;
                console.log('[Quizy Auth] User authenticated:', firebaseUser.email);

                // Get user profile from Firestore
                const profile = await getUserProfile(firebaseUser.uid);
                if (profile) {
                    setUser(profile);
                } else {
                    // User exists in Auth but not in Firestore (edge case - new Google user)
                    setUser(null);
                }
            } else {
                // No Firebase user - check if we have a session backup
                if (sessionBackup && !hasRestoredFromBackup) {
                    console.log('[Quizy Auth] No Firebase user but session backup exists:', sessionBackup.email);
                    // The session should be restored by Firebase automatically
                    // If not, it means the session truly expired
                }
                setUser(null);
            }
            setLoading(false);
        });

        return () => {
            clearTimeout(loadingTimeout);
            unsubscribe();
        };
    }, []);

    // Sign in with email and password
    const signIn = useCallback(async (email: string, password: string): Promise<void> => {
        setLoading(true);
        try {
            const result = await signInWithEmailAndPassword(auth, email, password);
            const profile = await getUserProfile(result.user.uid);
            if (profile) {
                // Check if account is restricted
                if (profile.isRestricted) {
                    // Sign out immediately
                    await firebaseSignOut(auth);
                    throw new Error('Your account has been restricted by your teacher. Please contact them to enable your account.');
                }
                setUser(profile);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    // Sign up new user
    const signUp = useCallback(async (
        email: string,
        password: string,
        name: string,
        role: 'student' | 'teacher',
        studentClass?: number
    ): Promise<void> => {
        setLoading(true);
        try {
            // Validate teacher role
            if (role === 'teacher' && !isAdminEmail(email)) {
                throw new Error('This email is not authorized for teacher access');
            }

            const result = await createUserWithEmailAndPassword(auth, email, password);

            // Create user profile in Firestore
            const newUser: Omit<User, 'createdAt'> = {
                uid: result.user.uid,
                email: email.toLowerCase(),
                name,
                role,
                ...(role === 'student' && studentClass ? { studentClass } : {})
            };

            await createUserProfile(newUser);

            const profile = await getUserProfile(result.user.uid);
            if (profile) {
                setUser(profile);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    // Sign in with Google
    const signInWithGoogle = useCallback(async (
        role: 'student' | 'teacher',
        studentClass?: number
    ): Promise<{ isNewUser: boolean; needsClassSelection: boolean }> => {
        setLoading(true);
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const firebaseUser = result.user;
            const email = firebaseUser.email?.toLowerCase() || '';
            const displayName = firebaseUser.displayName || email.split('@')[0];

            // Check if user already exists in Firestore
            const existingProfile = await getUserProfile(firebaseUser.uid);

            if (existingProfile) {
                // Existing user - check if restricted
                if (existingProfile.isRestricted) {
                    await firebaseSignOut(auth);
                    throw new Error('Your account has been restricted by your teacher. Please contact them to enable your account.');
                }
                setUser(existingProfile);
                return { isNewUser: false, needsClassSelection: false };
            }

            // New user - validate teacher role
            if (role === 'teacher' && !isAdminEmail(email)) {
                await firebaseSignOut(auth);
                throw new Error('This email is not authorized for teacher access. Please sign in as a student or use an authorized email.');
            }

            // For students, check if class needs to be selected
            if (role === 'student' && !studentClass) {
                // Don't create profile yet, return that class selection is needed
                return { isNewUser: true, needsClassSelection: true };
            }

            // Create new user profile
            const newUser: Omit<User, 'createdAt'> = {
                uid: firebaseUser.uid,
                email: email,
                name: displayName,
                role,
                ...(role === 'student' && studentClass ? { studentClass } : {})
            };

            await createUserProfile(newUser);

            const profile = await getUserProfile(firebaseUser.uid);
            if (profile) {
                setUser(profile);
            }

            return { isNewUser: true, needsClassSelection: false };
        } catch (error) {
            setLoading(false);
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    // Update student class (for Google sign-in users who need to select class)
    const updateStudentClass = useCallback(async (studentClass: number): Promise<void> => {
        const firebaseUser = auth.currentUser;
        if (!firebaseUser) {
            throw new Error('No user is currently signed in');
        }

        const email = firebaseUser.email?.toLowerCase() || '';
        const displayName = firebaseUser.displayName || email.split('@')[0];

        // Create user profile with selected class
        const newUser: Omit<User, 'createdAt'> = {
            uid: firebaseUser.uid,
            email: email,
            name: displayName,
            role: 'student',
            studentClass
        };

        await createUserProfile(newUser);

        const profile = await getUserProfile(firebaseUser.uid);
        if (profile) {
            setUser(profile);
        }
    }, []);

    // Sign out - also clears session backup
    const signOutUser = useCallback(async (): Promise<void> => {
        clearSessionBackup(); // Clear stored session data
        await firebaseSignOut(auth);
        setUser(null);
    }, []);

    const value: ExtendedAuthContextType = {
        user,
        loading,
        signIn,
        signUp,
        signInWithGoogle,
        signOut: signOutUser,
        refreshUser,
        updateStudentClass
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): ExtendedAuthContextType {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

/**
 * Validate admin code (alternative to email list)
 */
export function validateAdminCode(code: string): boolean {
    return code === ADMIN_CODE;
}
