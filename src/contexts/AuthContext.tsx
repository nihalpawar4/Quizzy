'use client';

/**
 * Authentication Context Provider
 * Manages user authentication state across the application
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    User as FirebaseUser
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { createUserProfile, getUserProfile } from '@/lib/services';
import { ADMIN_EMAILS, ADMIN_CODE } from '@/lib/constants';
import type { User, AuthContextType } from '@/types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // Check if email is admin
    const isAdminEmail = (email: string): boolean => {
        return ADMIN_EMAILS.includes(email.toLowerCase());
    };

    // Listen to auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
            if (firebaseUser) {
                // Get user profile from Firestore
                const profile = await getUserProfile(firebaseUser.uid);
                if (profile) {
                    setUser(profile);
                } else {
                    // User exists in Auth but not in Firestore (edge case)
                    setUser(null);
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
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

    // Sign out
    const signOutUser = useCallback(async (): Promise<void> => {
        await firebaseSignOut(auth);
        setUser(null);
    }, []);

    const value: AuthContextType = {
        user,
        loading,
        signIn,
        signUp,
        signOut: signOutUser
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextType {
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
