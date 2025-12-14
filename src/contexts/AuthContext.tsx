'use client';

/**
 * Authentication Context Provider
 * Manages user authentication state across the application
 * Supports Email/Password and Google Sign-In
 * INCLUDES HARD SESSION PERSISTENCE + COOKIE BACKUP
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
import { auth, googleProvider, getSessionBackup, clearSessionBackup, ensurePersistence } from '@/lib/firebase';
import { createUserProfile, getUserProfile } from '@/lib/services';
import { ADMIN_EMAILS, ADMIN_CODE } from '@/lib/constants';
import { saveUserSessionCookie, getUserSessionCookie, deleteUserSessionCookie } from '@/lib/cookieSession';
import type { User } from '@/types';

// Remembered user info from cookie
interface RememberedUser {
    email: string;
    name: string;
}

// Extended AuthContextType with Google Sign-In and refreshUser
interface ExtendedAuthContextType {
    user: User | null;
    loading: boolean;
    rememberedUser: RememberedUser | null;
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
    const [rememberedUser, setRememberedUser] = useState<RememberedUser | null>(null);

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

    // Listen to auth state changes - AWAIT PERSISTENCE FIRST
    useEffect(() => {
        let unsubscribe: (() => void) | null = null;

        const initAuth = async () => {
            // CRITICAL: Await persistence before subscribing to auth state
            console.log('[Quizy Auth] ⏳ Waiting for persistence...');
            await ensurePersistence();
            console.log('[Quizy Auth] ✅ Persistence ready');

            // Check for cookie-based remembered user
            const cookieSession = getUserSessionCookie();
            if (cookieSession) {
                console.log('[Quizy Auth] Cookie session found for:', cookieSession.email);
                setRememberedUser({ email: cookieSession.email, name: cookieSession.name });
            }

            // Check for session backup
            const sessionBackup = getSessionBackup();
            if (sessionBackup) {
                console.log('[Quizy Auth] Session backup exists for:', sessionBackup.email);
            }

            // Now subscribe to auth state changes
            unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
                if (firebaseUser) {
                    console.log('[Quizy Auth] ✅ User authenticated:', firebaseUser.email);

                    // Get user profile from Firestore
                    const profile = await getUserProfile(firebaseUser.uid);
                    if (profile) {
                        setUser(profile);
                        setRememberedUser(null); // Clear remembered user since we're logged in
                        console.log('[Quizy Auth] ✅ Profile loaded:', profile.name);

                        // Save to cookie for persistent remember-me
                        saveUserSessionCookie({
                            email: profile.email,
                            name: profile.name,
                            uid: profile.uid,
                            role: profile.role
                        });
                        console.log('[Quizy Auth] Cookie session saved');
                    } else {
                        // User exists in Auth but not in Firestore
                        console.log('[Quizy Auth] ⚠️ User in Auth but no Firestore profile');
                        setUser(null);
                    }
                } else {
                    console.log('[Quizy Auth] ❌ No authenticated user');
                    setUser(null);
                }
                setLoading(false);
            });
        };

        initAuth();

        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, []);


    // Sign in with email and password
    const signIn = useCallback(async (email: string, password: string): Promise<void> => {
        setLoading(true);
        try {
            // CRITICAL: Ensure persistence is ready before login
            await ensurePersistence();
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

            // CRITICAL: Ensure persistence is ready before signup
            await ensurePersistence();
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
            // CRITICAL: Ensure persistence is ready before Google sign-in
            await ensurePersistence();
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

    // Sign out - set offline, clear session backup and cookies
    const signOutUser = useCallback(async (): Promise<void> => {
        // Set user offline BEFORE signing out (while we still have permissions)
        if (user?.uid) {
            try {
                const { setUserOffline } = await import('@/lib/chatServices');
                await setUserOffline(user.uid);
            } catch (error) {
                console.log('Could not set user offline:', error);
            }
        }

        clearSessionBackup(); // Clear stored session data
        deleteUserSessionCookie(); // Clear cookie
        setRememberedUser(null); // Clear remembered user
        setUser(null); // Clear user state first
        await firebaseSignOut(auth);
    }, [user?.uid]);

    const value: ExtendedAuthContextType = {
        user,
        loading,
        rememberedUser,
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
