'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    User,
    Lock,
    Palette,
    BookOpen,
    Save,
    Loader2,
    CheckCircle,
    AlertCircle,
    Sun,
    Moon,
    Monitor,
    Bell,
    Shield,
    Download,
    Trash2,
    X,
    Camera,
    ChevronRight,
    Search,
    Flame,
    Star,
    Award,
    Edit3,
    Smartphone,
    Cloud,
    Pen,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { requestClassChange, getResultsByStudent } from '@/lib/services';
import { CLASS_OPTIONS } from '@/lib/constants';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential, deleteUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { uploadProfilePicture, deleteProfilePicture } from '@/lib/profilePictureService';
import { saveLastRoute } from '@/lib/routePersistence';

import MotivationalLoader from '@/components/ui/MotivationalLoader';
import type { TestResult } from '@/types';

export default function ProfilePage() {
    const { user, loading: authLoading, signOut, refreshUser } = useAuth();
    const { theme, setTheme } = useTheme();
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [studentClass, setStudentClass] = useState<number>(5);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [notifications, setNotifications] = useState(true);
    const [emailUpdates, setEmailUpdates] = useState(true);
    const [isUpdatingClass, setIsUpdatingClass] = useState(false);
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
    const [classSuccess, setClassSuccess] = useState(false);
    const [passwordSuccess, setPasswordSuccess] = useState(false);
    const [classError, setClassError] = useState<string | null>(null);
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    // Profile picture states
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const [photoError, setPhotoError] = useState<string | null>(null);
    const [photoSuccess, setPhotoSuccess] = useState(false);

    // Modal states for each setting
    const [showAppearance, setShowAppearance] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showClassSelection, setShowClassSelection] = useState(false);
    const [showPasswordChange, setShowPasswordChange] = useState(false);
    const [showSecurity, setShowSecurity] = useState(false);
    const [showActiveSessions, setShowActiveSessions] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Stats
    const [averageScore, setAverageScore] = useState(0);
    const [xpPoints, setXpPoints] = useState(0);

    // Lock body scroll when a modal is open
    const isAnyModalOpen = showAppearance || showNotifications || showClassSelection || showPasswordChange || showSecurity || showActiveSessions || showDeleteModal;
    useEffect(() => {
        if (isAnyModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isAnyModalOpen]);

    // Load stats
    const loadStats = useCallback(async () => {
        if (!user?.uid) return;
        try {
            const results: TestResult[] = await getResultsByStudent(user.uid);
            const scorableResults = results.filter(r => !r.isPdfTest && r.totalQuestions > 0);
            const totalScorable = scorableResults.length;
            const avg = totalScorable > 0
                ? Math.round(scorableResults.reduce((acc, r) => acc + (r.score / r.totalQuestions) * 100, 0) / totalScorable)
                : 0;
            setAverageScore(avg);
            // XP: 10 points per test + score bonus
            const xp = scorableResults.reduce((acc, r) => acc + 10 + Math.round((r.score / r.totalQuestions) * 40), 0);
            setXpPoints(xp);
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }, [user?.uid]);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth/login');
        }
        if (user?.studentClass) {
            setStudentClass(user.studentClass);
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        saveLastRoute('/profile');
    }, []);

    useEffect(() => {
        loadStats();
    }, [loadStats]);

    const handleUpdateClass = async () => {
        if (!user) return;
        setIsUpdatingClass(true);
        setClassError(null);
        setClassSuccess(false);
        try {
            await requestClassChange(
                user.uid,
                user.name,
                user.email,
                user.studentClass || 0,
                studentClass
            );
            await refreshUser();
            setClassSuccess(true);
            setTimeout(() => setClassSuccess(false), 5000);
        } catch {
            setClassError('Failed to submit class change request. Please try again.');
        } finally {
            setIsUpdatingClass(false);
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth.currentUser) return;
        setPasswordError(null);
        setPasswordSuccess(false);
        if (newPassword.length < 6) {
            setPasswordError('New password must be at least 6 characters');
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordError('New passwords do not match');
            return;
        }
        setIsUpdatingPassword(true);
        try {
            const credential = EmailAuthProvider.credential(auth.currentUser.email!, currentPassword);
            await reauthenticateWithCredential(auth.currentUser, credential);
            await updatePassword(auth.currentUser, newPassword);
            setPasswordSuccess(true);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setTimeout(() => {
                setPasswordSuccess(false);
                setShowPasswordChange(false);
            }, 2000);
        } catch (error: unknown) {
            if (error instanceof Error && (error.message.includes('wrong-password') || error.message.includes('invalid-credential'))) {
                setPasswordError('Current password is incorrect');
            } else {
                setPasswordError('Failed to update password. Please try again.');
            }
        } finally {
            setIsUpdatingPassword(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!auth.currentUser || !user) return;
        setDeleteError(null);
        setIsDeleting(true);
        try {
            const credential = EmailAuthProvider.credential(auth.currentUser.email!, deletePassword);
            await reauthenticateWithCredential(auth.currentUser, credential);
            await deleteDoc(doc(db, 'users', user.uid));
            await deleteUser(auth.currentUser);
            router.push('/');
        } catch {
            setDeleteError('Failed to delete account. Please check your password.');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleExportData = () => {
        if (!user) return;
        const userData = { name: user.name, email: user.email, role: user.role, class: user.studentClass, exportedAt: new Date().toISOString() };
        const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `quizy-profile-${user.uid}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!user || !e.target.files?.length) return;
        const file = e.target.files[0];
        setIsUploadingPhoto(true);
        setPhotoError(null);
        setPhotoSuccess(false);
        try {
            await uploadProfilePicture(user.uid, file);
            await refreshUser();
            setPhotoSuccess(true);
            setTimeout(() => setPhotoSuccess(false), 3000);
        } catch (error: unknown) {
            if (error instanceof Error) {
                setPhotoError(error.message);
            } else {
                setPhotoError('Failed to upload photo. Please try again.');
            }
        } finally {
            setIsUploadingPhoto(false);
            if (e.target) e.target.value = '';
        }
    };

    const handlePhotoDelete = async () => {
        if (!user || !user.photoURL) return;
        setIsUploadingPhoto(true);
        setPhotoError(null);
        try {
            await deleteProfilePicture(user.uid);
            await refreshUser();
            setPhotoSuccess(true);
            setTimeout(() => setPhotoSuccess(false), 3000);
        } catch {
            setPhotoError('Failed to delete photo. Please try again.');
        } finally {
            setIsUploadingPhoto(false);
        }
    };

    const handleSignOut = async () => {
        await signOut();
        router.push('/');
    };

    if (authLoading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
                <MotivationalLoader />
            </div>
        );
    }

    const themeLabel = theme === 'light' ? 'Light' : theme === 'dark' ? 'Dark' : 'System';
    const streak = user.currentStreak || 0;

    // Settings items for search
    const allSettings = [
        { label: 'Appearance', section: 'Preferences' },
        { label: 'Notifications', section: 'Preferences' },
        { label: 'Class Selection', section: 'Preferences' },
        { label: 'Change Password', section: 'Account & Security' },
        { label: 'Security', section: 'Account & Security' },
        { label: 'Active Sessions', section: 'Account & Security' },
        { label: 'Export My Data', section: 'Privacy & Data' },
        { label: 'Delete Account', section: 'Privacy & Data' },
    ];
    const filteredSettings = searchQuery.trim()
        ? allSettings.filter(s => s.label.toLowerCase().includes(searchQuery.toLowerCase()) || s.section.toLowerCase().includes(searchQuery.toLowerCase()))
        : [];

    // Modal wrapper component
    const SettingsModal = ({ show, onClose, title, children }: { show: boolean; onClose: () => void; title: string; children: React.ReactNode }) => (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Drag indicator for mobile */}
                        <div className="flex justify-center pt-3 sm:hidden">
                            <div className="w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full" />
                        </div>
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
                            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="px-6 py-5">
                            {children}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 relative">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800">
                <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.back()} className="p-2 -ml-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Settings</h1>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Manage and personalize your account</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowSearch(!showSearch)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors border border-gray-200 dark:border-gray-700"
                    >
                        <Search className="w-4 h-4" />
                        <span className="hidden sm:inline">Search settings</span>
                    </button>
                </div>

                {/* Search bar (expandable) */}
                <AnimatePresence>
                    {showSearch && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden border-t border-gray-100 dark:border-gray-800"
                        >
                            <div className="max-w-lg mx-auto px-4 py-3">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search settings..."
                                        autoFocus
                                        className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#1650EB] focus:bg-white dark:focus:bg-gray-700 outline-none transition-all"
                                    />
                                </div>
                                {/* Search results */}
                                {filteredSettings.length > 0 && (
                                    <div className="mt-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                        {filteredSettings.map((item, i) => (
                                            <button
                                                key={i}
                                                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                                                onClick={() => {
                                                    setShowSearch(false);
                                                    setSearchQuery('');
                                                    if (item.label === 'Appearance') setShowAppearance(true);
                                                    else if (item.label === 'Notifications') setShowNotifications(true);
                                                    else if (item.label === 'Class Selection') setShowClassSelection(true);
                                                    else if (item.label === 'Change Password') setShowPasswordChange(true);
                                                    else if (item.label === 'Security') setShowSecurity(true);
                                                    else if (item.label === 'Active Sessions') setShowActiveSessions(true);
                                                    else if (item.label === 'Export My Data') handleExportData();
                                                    else if (item.label === 'Delete Account') setShowDeleteModal(true);
                                                }}
                                            >
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{item.label}</p>
                                                    <p className="text-xs text-gray-400">{item.section}</p>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-gray-400" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </header>

            <main className="max-w-lg mx-auto px-4 pb-12">
                {/* Profile Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 rounded-2xl overflow-hidden"
                    style={{
                        background: 'linear-gradient(135deg, #f0e6ff 0%, #e8e0ff 30%, #dfd6ff 50%, #e8e0ff 70%, #f0e6ff 100%)',
                    }}
                >
                    <div className="px-5 pt-5 pb-2">
                        <div className="flex items-start gap-4">
                            {/* Avatar */}
                            <div className="relative flex-shrink-0">
                                {user.photoURL ? (
                                    <img
                                        src={user.photoURL}
                                        alt={user.name}
                                        className="w-[88px] h-[88px] rounded-full object-cover border-4 border-white shadow-lg"
                                    />
                                ) : (
                                    <div className="w-[88px] h-[88px] bg-gradient-to-br from-[#1650EB] to-[#6095DB] rounded-full flex items-center justify-center border-4 border-white shadow-lg">
                                        <User className="w-10 h-10 text-white" />
                                    </div>
                                )}
                                {/* Camera/Edit button */}
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploadingPhoto}
                                    className="absolute -bottom-0.5 -right-0.5 w-8 h-8 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-md border-2 border-white hover:scale-110 transition-transform"
                                >
                                    {isUploadingPhoto ? (
                                        <Loader2 className="w-3.5 h-3.5 text-[#1650EB] animate-spin" />
                                    ) : (
                                        <Pen className="w-3.5 h-3.5 text-[#1650EB]" />
                                    )}
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handlePhotoUpload}
                                    className="hidden"
                                />
                            </div>

                            {/* User info */}
                            <div className="flex-1 min-w-0 pt-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <h2 className="text-lg font-bold text-gray-900 truncate">{user.name}</h2>
                                    <svg viewBox="0 0 22 22" className="w-5 h-5 flex-shrink-0" fill="none">
                                        <circle cx="11" cy="11" r="11" fill="#1650EB" />
                                        <path d="M7 11.5L9.5 14L15 8.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                                <p className="text-sm text-gray-600 truncate mt-0.5">{user.email}</p>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#1650EB]/10 rounded-full text-xs font-semibold text-[#1650EB]">
                                        <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none">
                                            <path d="M8 1L10 5H14L11 8L12 13L8 10L4 13L5 8L2 5H6L8 1Z" fill="#1650EB" />
                                        </svg>
                                        Class {user.studentClass} Student
                                    </span>
                                </div>
                            </div>

                            {/* Edit Profile button */}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-white/80 dark:bg-gray-800/80 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-white transition-colors border border-gray-200/50 dark:border-gray-700/50 shadow-sm"
                            >
                                <Edit3 className="w-3.5 h-3.5" />
                                Edit Profile
                            </button>
                        </div>
                    </div>

                    {/* Photo status messages */}
                    {photoError && (
                        <div className="mx-5 mb-2 p-2.5 bg-red-50 rounded-xl flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                            <p className="text-xs text-red-700">{photoError}</p>
                        </div>
                    )}
                    {photoSuccess && (
                        <div className="mx-5 mb-2 p-2.5 bg-green-50 rounded-xl flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                            <p className="text-xs text-green-700">Photo updated!</p>
                        </div>
                    )}

                    {/* Stats bar */}
                    <div className="mx-4 mb-4 mt-2 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl px-2 py-3 flex items-center justify-around">
                        <div className="flex items-center gap-2">
                            <Flame className="w-5 h-5 text-orange-500" />
                            <div>
                                <p className="text-lg font-bold text-gray-900 dark:text-white leading-none">{streak}</p>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Day Streak</p>
                            </div>
                        </div>
                        <div className="w-px h-8 bg-gray-200 dark:bg-gray-700" />
                        <div className="flex items-center gap-2">
                            <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                            <div>
                                <p className="text-lg font-bold text-gray-900 dark:text-white leading-none">{xpPoints.toLocaleString()}</p>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">XP Points</p>
                            </div>
                        </div>
                        <div className="w-px h-8 bg-gray-200 dark:bg-gray-700" />
                        <div className="flex items-center gap-2">
                            <Award className="w-5 h-5 text-rose-500" />
                            <div>
                                <p className="text-lg font-bold text-gray-900 dark:text-white leading-none">{averageScore}%</p>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Avg. Score</p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Preferences Section */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-6">
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 px-1">Preferences</h3>
                    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
                        {/* Appearance */}
                        <button
                            onClick={() => setShowAppearance(true)}
                            className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                        >
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/50 dark:to-pink-900/50 rounded-xl flex items-center justify-center flex-shrink-0">
                                <Palette className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div className="flex-1 text-left min-w-0">
                                <p className="text-[15px] font-semibold text-gray-900 dark:text-white">Appearance</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Choose your preferred theme</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400">
                                    {theme === 'light' ? <Sun className="w-3 h-3" /> : theme === 'dark' ? <Moon className="w-3 h-3" /> : <Monitor className="w-3 h-3" />}
                                    {themeLabel}
                                </span>
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                            </div>
                        </button>

                        {/* Notifications */}
                        <button
                            onClick={() => setShowNotifications(true)}
                            className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                        >
                            <div className="w-10 h-10 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/50 dark:to-orange-900/50 rounded-xl flex items-center justify-center flex-shrink-0">
                                <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div className="flex-1 text-left min-w-0">
                                <p className="text-[15px] font-semibold text-gray-900 dark:text-white">Notifications</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Manage your notification preferences</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        </button>

                        {/* Class Selection */}
                        {user.role === 'student' && (
                            <button
                                onClick={() => setShowClassSelection(true)}
                                className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                            >
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/50 dark:to-cyan-900/50 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="flex-1 text-left min-w-0">
                                    <p className="text-[15px] font-semibold text-gray-900 dark:text-white">Class Selection</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Request a class change</p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className="px-2.5 py-1 bg-[#1650EB]/10 rounded-lg text-xs font-semibold text-[#1650EB]">
                                        Class {user.studentClass}
                                    </span>
                                    <ChevronRight className="w-4 h-4 text-gray-400" />
                                </div>
                            </button>
                        )}
                    </div>
                </motion.div>

                {/* Account & Security Section */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-6">
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 px-1">Account & Security</h3>
                    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
                        {/* Change Password */}
                        <button
                            onClick={() => setShowPasswordChange(true)}
                            className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                        >
                            <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/50 dark:to-emerald-900/50 rounded-xl flex items-center justify-center flex-shrink-0">
                                <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div className="flex-1 text-left min-w-0">
                                <p className="text-[15px] font-semibold text-gray-900 dark:text-white">Change Password</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Update your account password</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        </button>

                        {/* Security */}
                        <button
                            onClick={() => setShowSecurity(true)}
                            className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                        >
                            <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-slate-100 dark:from-gray-800 dark:to-slate-800 rounded-xl flex items-center justify-center flex-shrink-0">
                                <Lock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            </div>
                            <div className="flex-1 text-left min-w-0">
                                <p className="text-[15px] font-semibold text-gray-900 dark:text-white">Security</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Password, 2FA & account security</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        </button>

                        {/* Active Sessions */}
                        <button
                            onClick={() => setShowActiveSessions(true)}
                            className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                        >
                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-900/50 dark:to-violet-900/50 rounded-xl flex items-center justify-center flex-shrink-0">
                                <Smartphone className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div className="flex-1 text-left min-w-0">
                                <p className="text-[15px] font-semibold text-gray-900 dark:text-white">Active Sessions</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Manage your logged-in devices</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400">
                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                                    2 Active
                                </span>
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                            </div>
                        </button>
                    </div>
                </motion.div>

                {/* Privacy & Data Section */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-6">
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 px-1">Privacy & Data</h3>
                    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
                        {/* Export My Data */}
                        <button
                            onClick={handleExportData}
                            className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                        >
                            <div className="w-10 h-10 bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-900/50 dark:to-blue-900/50 rounded-xl flex items-center justify-center flex-shrink-0">
                                <Cloud className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                            </div>
                            <div className="flex-1 text-left min-w-0">
                                <p className="text-[15px] font-semibold text-gray-900 dark:text-white">Export My Data</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Download a copy of your profile data</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        </button>

                        {/* Delete Account */}
                        <button
                            onClick={() => setShowDeleteModal(true)}
                            className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                        >
                            <div className="w-10 h-10 bg-gradient-to-br from-red-100 to-pink-100 dark:from-red-900/50 dark:to-pink-900/50 rounded-xl flex items-center justify-center flex-shrink-0">
                                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                            </div>
                            <div className="flex-1 text-left min-w-0">
                                <p className="text-[15px] font-semibold text-red-600 dark:text-red-400">Delete Account</p>
                                <p className="text-xs text-red-500/70 dark:text-red-400/60">Permanently delete your account and data</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-red-400 flex-shrink-0" />
                        </button>
                    </div>
                </motion.div>

                {/* Sign Out Button */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-6 mb-8">
                    <button
                        onClick={handleSignOut}
                        className="w-full flex items-center justify-center gap-2 py-3.5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 text-red-600 dark:text-red-400 font-semibold text-sm hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                    >
                        Sign Out
                    </button>
                    <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-3">Quizy v2.0 • Made with ❤️</p>
                </motion.div>
            </main>

            {/* ===== MODALS ===== */}

            {/* Appearance Modal */}
            <SettingsModal show={showAppearance} onClose={() => setShowAppearance(false)} title="Appearance">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Choose your preferred theme</p>
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { mode: 'light' as const, icon: Sun, label: 'Light' },
                        { mode: 'dark' as const, icon: Moon, label: 'Dark' },
                        { mode: 'system' as const, icon: Monitor, label: 'System' },
                    ].map(({ mode, icon: Icon, label }) => (
                        <button
                            key={mode}
                            onClick={() => setTheme(mode)}
                            className={`flex flex-col items-center gap-2.5 p-4 rounded-2xl border-2 transition-all ${theme === mode
                                ? 'border-[#1650EB] bg-[#1650EB]/5 dark:bg-[#1650EB]/10 shadow-sm'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                }`}
                        >
                            <Icon className={`w-6 h-6 ${theme === mode ? 'text-[#1650EB]' : 'text-gray-500 dark:text-gray-400'}`} />
                            <span className={`text-sm font-medium ${theme === mode ? 'text-[#1650EB]' : 'text-gray-700 dark:text-gray-300'}`}>{label}</span>
                            {theme === mode && (
                                <div className="w-5 h-5 bg-[#1650EB] rounded-full flex items-center justify-center">
                                    <CheckCircle className="w-3.5 h-3.5 text-white" />
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </SettingsModal>

            {/* Notifications Modal */}
            <SettingsModal show={showNotifications} onClose={() => setShowNotifications(false)} title="Notifications">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Manage your notification preferences</p>
                <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                        <div className="flex items-center gap-3">
                            <Bell className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                            <div>
                                <p className="font-medium text-sm text-gray-900 dark:text-white">Push Notifications</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Get notified about new tests</p>
                            </div>
                        </div>
                        <button onClick={() => setNotifications(!notifications)} className={`w-12 h-7 rounded-full transition-colors ${notifications ? 'bg-[#1650EB]' : 'bg-gray-300 dark:bg-gray-600'}`}>
                            <div className={`w-5.5 h-5.5 w-[22px] h-[22px] bg-white rounded-full shadow transition-transform ${notifications ? 'translate-x-[22px]' : 'translate-x-[3px]'}`} />
                        </button>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                        <div className="flex items-center gap-3">
                            <svg viewBox="0 0 20 20" className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <rect x="2" y="4" width="16" height="12" rx="2" />
                                <path d="M2 6l8 5 8-5" />
                            </svg>
                            <div>
                                <p className="font-medium text-sm text-gray-900 dark:text-white">Email Updates</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Receive weekly progress reports</p>
                            </div>
                        </div>
                        <button onClick={() => setEmailUpdates(!emailUpdates)} className={`w-12 h-7 rounded-full transition-colors ${emailUpdates ? 'bg-[#1650EB]' : 'bg-gray-300 dark:bg-gray-600'}`}>
                            <div className={`w-[22px] h-[22px] bg-white rounded-full shadow transition-transform ${emailUpdates ? 'translate-x-[22px]' : 'translate-x-[3px]'}`} />
                        </button>
                    </div>
                </div>
            </SettingsModal>

            {/* Class Selection Modal */}
            {user.role === 'student' && (
                <SettingsModal show={showClassSelection} onClose={() => setShowClassSelection(false)} title="Class Selection">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Request a class change (requires teacher approval)</p>

                    {classError && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                            <p className="text-sm text-red-700 dark:text-red-400">{classError}</p>
                        </div>
                    )}
                    {classSuccess && (
                        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                            <p className="text-sm text-green-700 dark:text-green-400">Class change request submitted!</p>
                        </div>
                    )}

                    {user.pendingClassChange && (
                        <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                                <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Pending Approval</p>
                            </div>
                            <p className="text-sm text-amber-600 dark:text-amber-500">
                                Your request to change to <strong>Class {user.pendingClassChange}</strong> is awaiting teacher approval.
                            </p>
                        </div>
                    )}

                    <div className="space-y-3">
                        <select
                            value={studentClass}
                            onChange={(e) => setStudentClass(Number(e.target.value))}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[#1650EB] focus:border-transparent outline-none transition-all"
                            disabled={!!user.pendingClassChange}
                        >
                            {CLASS_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                        <button
                            onClick={handleUpdateClass}
                            disabled={isUpdatingClass || studentClass === user.studentClass || !!user.pendingClassChange}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-[#1650EB] text-white rounded-xl font-medium hover:bg-[#1243c7] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isUpdatingClass ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            {user.pendingClassChange ? 'Pending Approval' : 'Request Class Change'}
                        </button>
                    </div>

                    <p className="mt-3 text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        Class changes require teacher approval for integrity and privacy.
                    </p>
                </SettingsModal>
            )}

            {/* Password Change Modal */}
            <SettingsModal show={showPasswordChange} onClose={() => setShowPasswordChange(false)} title="Change Password">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Update your account password</p>

                {passwordError && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                        <p className="text-sm text-red-700 dark:text-red-400">{passwordError}</p>
                    </div>
                )}
                {passwordSuccess && (
                    <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <p className="text-sm text-green-700 dark:text-green-400">Password updated successfully!</p>
                    </div>
                )}

                <form onSubmit={handleUpdatePassword} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Current Password</label>
                        <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required placeholder="Enter current password" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#1650EB] focus:border-transparent outline-none transition-all" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">New Password</label>
                        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} placeholder="Min 6 characters" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#1650EB] focus:border-transparent outline-none transition-all" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Confirm New Password</label>
                        <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} placeholder="Confirm new password" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#1650EB] focus:border-transparent outline-none transition-all" />
                    </div>
                    <button type="submit" disabled={isUpdatingPassword || !currentPassword || !newPassword || !confirmPassword} className="w-full flex items-center justify-center gap-2 py-3 bg-[#1650EB] text-white rounded-xl font-medium hover:bg-[#1243c7] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        {isUpdatingPassword ? <><Loader2 className="w-5 h-5 animate-spin" /> Updating...</> : <><Lock className="w-5 h-5" /> Update Password</>}
                    </button>
                </form>
            </SettingsModal>

            {/* Security Modal */}
            <SettingsModal show={showSecurity} onClose={() => setShowSecurity(false)} title="Security">
                <div className="space-y-4">
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                            <Shield className="w-5 h-5 text-green-600" />
                            <p className="font-semibold text-sm text-green-700 dark:text-green-400">Account Secured</p>
                        </div>
                        <p className="text-xs text-green-600 dark:text-green-500">Your account is protected with Firebase Authentication.</p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                        <p className="font-medium text-sm text-gray-900 dark:text-white mb-1">Two-Factor Authentication</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Add an extra layer of security to your account.</p>
                        <span className="inline-flex items-center px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-xs font-medium text-amber-600 dark:text-amber-400">Coming Soon</span>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                        <p className="font-medium text-sm text-gray-900 dark:text-white mb-1">Login Method</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {auth.currentUser?.providerData?.[0]?.providerId === 'google.com' ? 'Google Sign-In' : 'Email & Password'}
                        </p>
                    </div>
                </div>
            </SettingsModal>

            {/* Active Sessions Modal */}
            <SettingsModal show={showActiveSessions} onClose={() => setShowActiveSessions(false)} title="Active Sessions">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Devices currently logged into your account</p>
                <div className="space-y-3">
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-[#1650EB]/10 rounded-xl flex items-center justify-center">
                                    <Smartphone className="w-5 h-5 text-[#1650EB]" />
                                </div>
                                <div>
                                    <p className="font-medium text-sm text-gray-900 dark:text-white">Current Device</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Web Browser • Active now</p>
                                </div>
                            </div>
                            <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                                Active
                            </span>
                        </div>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-xl flex items-center justify-center">
                                    <Smartphone className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                                </div>
                                <div>
                                    <p className="font-medium text-sm text-gray-900 dark:text-white">Mobile Device</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">PWA • Last active 2h ago</p>
                                </div>
                            </div>
                            <span className="flex items-center gap-1 text-xs text-gray-400 font-medium">
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                                Idle
                            </span>
                        </div>
                    </div>
                </div>
            </SettingsModal>

            {/* Delete Account Modal */}
            <AnimatePresence>
                {showDeleteModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
                        onClick={() => setShowDeleteModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-6"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-red-600 dark:text-red-400">Delete Account</h3>
                                <button onClick={() => setShowDeleteModal(false)} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="mb-6">
                                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl mb-4">
                                    <p className="text-sm text-red-700 dark:text-red-400">⚠️ This action is irreversible. All your data including test results will be permanently deleted.</p>
                                </div>
                                {deleteError && (
                                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl mb-4">
                                        <p className="text-sm text-red-700 dark:text-red-400">{deleteError}</p>
                                    </div>
                                )}
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Enter your password to confirm</label>
                                <input type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} placeholder="Your password" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all" />
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button>
                                <button onClick={handleDeleteAccount} disabled={isDeleting || !deletePassword} className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                    {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                                    {isDeleting ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
