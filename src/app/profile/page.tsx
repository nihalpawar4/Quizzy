'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
    GraduationCap,
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
    LogOut,
    Bell,
    Mail,
    Shield,
    Download,
    Trash2,
    X,
    Sparkles,
    Camera
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext'
import { updateUserClass } from '@/lib/services';
import { CLASS_OPTIONS } from '@/lib/constants';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential, deleteUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { getGlowProgress } from '@/lib/creditServices';
import { uploadProfilePicture, deleteProfilePicture } from '@/lib/profilePictureService';

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

    // Glow status
    const [glowProgress, setGlowProgress] = useState({ spent: 0, threshold: 40, percentage: 0, hasGlow: false });

    // Get glow color based on current hour (changes every 3 hours)
    const getGlowColors = useCallback(() => {
        const hour = new Date().getHours();
        const colorSet = Math.floor(hour / 3) % 4;
        const colors = [
            { from: 'from-amber-50', via: 'via-yellow-50', to: 'to-orange-50', dark: 'dark:via-amber-950/20', border: 'from-amber-400 via-yellow-400 to-orange-400', glow1: 'from-amber-400/20 via-yellow-400/10', glow2: 'from-orange-400/20 via-amber-400/10' },
            { from: 'from-pink-50', via: 'via-rose-50', to: 'to-red-50', dark: 'dark:via-pink-950/20', border: 'from-pink-400 via-rose-400 to-red-400', glow1: 'from-pink-400/20 via-rose-400/10', glow2: 'from-red-400/20 via-pink-400/10' },
            { from: 'from-cyan-50', via: 'via-teal-50', to: 'to-emerald-50', dark: 'dark:via-cyan-950/20', border: 'from-cyan-400 via-teal-400 to-emerald-400', glow1: 'from-cyan-400/20 via-teal-400/10', glow2: 'from-emerald-400/20 via-cyan-400/10' },
            { from: 'from-violet-50', via: 'via-purple-50', to: 'to-fuchsia-50', dark: 'dark:via-violet-950/20', border: 'from-violet-400 via-purple-400 to-fuchsia-400', glow1: 'from-violet-400/20 via-purple-400/10', glow2: 'from-fuchsia-400/20 via-violet-400/10' }
        ];
        return colors[colorSet];
    }, []);

    const glowColors = getGlowColors();
    const hasActiveGlow = glowProgress.spent >= 40;

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth/login');
        }
        if (user?.studentClass) {
            setStudentClass(user.studentClass);
        }
        // Load glow status for students
        if (user?.role === 'student' && user?.uid) {
            const loadGlowStatus = async () => {
                try {
                    const progress = await getGlowProgress(user.uid);
                    setGlowProgress(progress);
                } catch (error) {
                    console.error('Error loading glow status:', error);
                }
            };
            loadGlowStatus();
        }
    }, [user, authLoading, router]);

    const handleUpdateClass = async () => {
        if (!user) return;
        setIsUpdatingClass(true);
        setClassError(null);
        setClassSuccess(false);
        try {
            await updateUserClass(user.uid, studentClass);
            setClassSuccess(true);
            setTimeout(() => setClassSuccess(false), 3000);
        } catch {
            setClassError('Failed to update class. Please try again.');
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
            setTimeout(() => setPasswordSuccess(false), 3000);
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

    // Handle profile picture upload
    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!user || !e.target.files?.length) return;

        const file = e.target.files[0];
        setIsUploadingPhoto(true);
        setPhotoError(null);
        setPhotoSuccess(false);

        try {
            await uploadProfilePicture(user.uid, file);
            await refreshUser(); // Refresh user data to get new photoURL
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
            if (e.target) e.target.value = ''; // Reset input
        }
    };

    // Handle profile picture delete
    const handlePhotoDelete = async () => {
        if (!user || !user.photoURL) return;

        setIsUploadingPhoto(true);
        setPhotoError(null);

        try {
            await deleteProfilePicture(user.uid);
            await refreshUser();
            setPhotoSuccess(true);
            setTimeout(() => setPhotoSuccess(false), 3000);
        } catch (error) {
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
                <Loader2 className="w-10 h-10 text-[#1650EB] animate-spin" />
            </div>
        );
    }

    return (
        <div className={`min-h-screen ${hasActiveGlow ? `bg-gradient-to-br ${glowColors.from} ${glowColors.via} ${glowColors.to} dark:from-gray-950 ${glowColors.dark} dark:to-gray-950` : 'bg-gray-50 dark:bg-gray-950'} relative`}>
            {/* Glow Effect Overlay for completed users */}
            {hasActiveGlow && (
                <>
                    {/* Animated gradient border at top */}
                    <div className={`fixed top-0 left-0 right-0 h-1 bg-gradient-to-r ${glowColors.border} animate-pulse z-[999]`} />

                    {/* Corner glow effects */}
                    <div className={`fixed top-0 left-0 w-96 h-96 bg-gradient-radial ${glowColors.glow1} to-transparent rounded-full blur-3xl pointer-events-none`} />
                    <div className={`fixed bottom-0 right-0 w-96 h-96 bg-gradient-radial ${glowColors.glow2} to-transparent rounded-full blur-3xl pointer-events-none`} />
                </>
            )}
            <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.back()} className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-[#1650EB] to-[#1650EB] rounded-xl flex items-center justify-center">
                                <GraduationCap className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="font-bold text-gray-900 dark:text-white">Profile Settings</h1>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Manage your account</p>
                            </div>
                        </div>
                    </div>
                    <button onClick={handleSignOut} className="flex items-center gap-2 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors">
                        <LogOut className="w-4 h-4" />
                        <span className="hidden sm:inline">Sign Out</span>
                    </button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-8">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 mb-6">
                    <div className="flex items-center gap-4">
                        {/* Profile Picture with Upload */}
                        <div className="relative group">
                            {user.photoURL ? (
                                <img
                                    src={user.photoURL}
                                    alt={user.name}
                                    className="w-20 h-20 rounded-full object-cover border-4 border-[#1650EB]/20"
                                />
                            ) : (
                                <div className="w-20 h-20 bg-gradient-to-br from-[#1650EB] to-[#6095DB] rounded-full flex items-center justify-center border-4 border-[#1650EB]/20">
                                    <User className="w-10 h-10 text-white" />
                                </div>
                            )}

                            {/* Upload Overlay */}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploadingPhoto}
                                className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                            >
                                {isUploadingPhoto ? (
                                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                                ) : (
                                    <Camera className="w-6 h-6 text-white" />
                                )}
                            </button>

                            {/* Hidden file input */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handlePhotoUpload}
                                className="hidden"
                            />
                        </div>

                        <div className="flex-1">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{user.name}</h2>
                            <p className="text-gray-600 dark:text-gray-400">{user.email}</p>
                            <span className="inline-block mt-1 px-2 py-0.5 bg-[#1650EB]/10 dark:bg-indigo-900/50 text-[#1243c7] dark:text-[#6095DB]/50 text-xs font-medium rounded-full">
                                {user.role === 'teacher' ? 'Teacher' : `Class ${user.studentClass} Student`}
                            </span>

                            {/* Photo Actions */}
                            <div className="flex items-center gap-2 mt-3">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploadingPhoto}
                                    className="text-xs text-[#1650EB] hover:underline disabled:opacity-50"
                                >
                                    {user.photoURL ? 'Change Photo' : 'Add Photo'}
                                </button>
                                {user.photoURL && (
                                    <>
                                        <span className="text-gray-300 dark:text-gray-600">•</span>
                                        <button
                                            onClick={handlePhotoDelete}
                                            disabled={isUploadingPhoto}
                                            className="text-xs text-red-500 hover:underline disabled:opacity-50"
                                        >
                                            Remove
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Photo Status Messages */}
                    {photoError && (
                        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-500" />
                            <p className="text-sm text-red-700 dark:text-red-400">{photoError}</p>
                        </div>
                    )}
                    {photoSuccess && (
                        <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <p className="text-sm text-green-700 dark:text-green-400">Photo updated successfully!</p>
                        </div>
                    )}
                </motion.div>

                <div className="grid gap-6">
                    {/* Theme Settings */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/50 rounded-xl flex items-center justify-center">
                                <Palette className="w-5 h-5 text-[#1650EB] dark:text-purple-400" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-white">Appearance</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Choose your preferred theme</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            {[{ mode: 'light' as const, icon: Sun, label: 'Light' }, { mode: 'dark' as const, icon: Moon, label: 'Dark' }, { mode: 'system' as const, icon: Monitor, label: 'System' }].map(({ mode, icon: Icon, label }) => (
                                <button key={mode} onClick={() => setTheme(mode)} className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${theme === mode ? 'border-[#1650EB] bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}>
                                    <Icon className={`w-6 h-6 ${theme === mode ? 'text-[#1650EB]' : 'text-gray-500 dark:text-gray-400'}`} />
                                    <span className={`text-sm font-medium ${theme === mode ? 'text-[#1650EB]' : 'text-gray-700 dark:text-gray-300'}`}>{label}</span>
                                </button>
                            ))}
                        </div>
                    </motion.div>

                    {/* Class Settings - Only for students */}
                    {user.role === 'student' && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex items-center justify-center">
                                    <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white">Class Selection</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Update your current class</p>
                                </div>
                            </div>
                            {classError && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2"><AlertCircle className="w-4 h-4 text-red-500" /><p className="text-sm text-red-700 dark:text-red-400">{classError}</p></div>}
                            {classSuccess && <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /><p className="text-sm text-green-700 dark:text-green-400">Class updated successfully!</p></div>}
                            <div className="flex gap-4">
                                <select value={studentClass} onChange={(e) => setStudentClass(Number(e.target.value))} className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[#1650EB] focus:border-transparent outline-none transition-all">
                                    {CLASS_OPTIONS.map((option) => (<option key={option.value} value={option.value}>{option.label}</option>))}
                                </select>
                                <button onClick={handleUpdateClass} disabled={isUpdatingClass || studentClass === user.studentClass} className="flex items-center gap-2 px-6 py-3 bg-[#1650EB] text-white rounded-xl font-medium hover:bg-[#1243c7] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                    {isUpdatingClass ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Save
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* Notification Settings */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/50 rounded-xl flex items-center justify-center">
                                <Bell className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Manage your notification preferences</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <Bell className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                                    <div><p className="font-medium text-gray-900 dark:text-white">Push Notifications</p><p className="text-sm text-gray-500 dark:text-gray-400">Get notified about new tests</p></div>
                                </div>
                                <button onClick={() => setNotifications(!notifications)} className={`w-12 h-6 rounded-full transition-colors ${notifications ? 'bg-[#1650EB]' : 'bg-gray-300 dark:bg-gray-600'}`}>
                                    <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${notifications ? 'translate-x-6' : 'translate-x-0.5'}`} />
                                </button>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <Mail className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                                    <div><p className="font-medium text-gray-900 dark:text-white">Email Updates</p><p className="text-sm text-gray-500 dark:text-gray-400">Receive weekly progress reports</p></div>
                                </div>
                                <button onClick={() => setEmailUpdates(!emailUpdates)} className={`w-12 h-6 rounded-full transition-colors ${emailUpdates ? 'bg-[#1650EB]' : 'bg-gray-300 dark:bg-gray-600'}`}>
                                    <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${emailUpdates ? 'translate-x-6' : 'translate-x-0.5'}`} />
                                </button>
                            </div>
                        </div>
                    </motion.div>

                    {/* Privacy Settings - Only for teachers */}
                    {user.role === 'teacher' && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.27 }} className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl flex items-center justify-center">
                                    <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white">Privacy Settings</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Control what students can see</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <Shield className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">Hide Contact Information</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Students won't see your email in chat</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={async () => {
                                            if (!user) return;
                                            const newValue = !user.hideContactInfo;
                                            try {
                                                // Import the function at the top of the file
                                                const { updateTeacherPrivacyInAllChats } = await import('@/lib/chatServices');

                                                // Update user document
                                                await updateDoc(doc(db, 'users', user.uid), {
                                                    hideContactInfo: newValue
                                                });

                                                // Sync privacy to all chats
                                                await updateTeacherPrivacyInAllChats(user.uid, newValue);

                                                // Refresh user data
                                                await refreshUser();
                                            } catch (error) {
                                                console.error('Error updating privacy settings:', error);
                                            }
                                        }}
                                        className={`w-12 h-6 rounded-full transition-colors ${user.hideContactInfo ? 'bg-[#1650EB]' : 'bg-gray-300 dark:bg-gray-600'}`}
                                    >
                                        <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${user.hideContactInfo ? 'translate-x-6' : 'translate-x-0.5'}`} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Password Settings */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/50 rounded-xl flex items-center justify-center">
                                <Lock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-white">Change Password</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Update your account password</p>
                            </div>
                        </div>
                        {passwordError && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2"><AlertCircle className="w-4 h-4 text-red-500" /><p className="text-sm text-red-700 dark:text-red-400">{passwordError}</p></div>}
                        {passwordSuccess && <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /><p className="text-sm text-green-700 dark:text-green-400">Password updated successfully!</p></div>}
                        <form onSubmit={handleUpdatePassword} className="space-y-4">
                            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Current Password</label><input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required placeholder="Enter current password" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#1650EB] focus:border-transparent outline-none transition-all" /></div>
                            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">New Password</label><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} placeholder="Enter new password (min 6 characters)" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#1650EB] focus:border-transparent outline-none transition-all" /></div>
                            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Confirm New Password</label><input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} placeholder="Confirm new password" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#1650EB] focus:border-transparent outline-none transition-all" /></div>
                            <button type="submit" disabled={isUpdatingPassword || !currentPassword || !newPassword || !confirmPassword} className="w-full flex items-center justify-center gap-2 py-3 bg-[#1650EB] text-white rounded-xl font-medium hover:bg-[#1243c7] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                {isUpdatingPassword ? <><Loader2 className="w-5 h-5 animate-spin" /> Updating...</> : <><Lock className="w-5 h-5" /> Update Password</>}
                            </button>
                        </form>
                    </motion.div>

                    {/* Data & Privacy */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/50 rounded-xl flex items-center justify-center">
                                <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-white">Data & Privacy</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Manage your data</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <button onClick={handleExportData} className="w-full flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                <Download className="w-5 h-5 text-[#1650EB] dark:text-[#6095DB]" />
                                <div className="text-left"><p className="font-medium text-gray-900 dark:text-white">Export My Data</p><p className="text-sm text-gray-500 dark:text-gray-400">Download a copy of your profile data</p></div>
                            </button>
                            <button onClick={() => setShowDeleteModal(true)} className="w-full flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                                <div className="text-left"><p className="font-medium text-red-700 dark:text-red-400">Delete Account</p><p className="text-sm text-red-600 dark:text-red-500">Permanently delete your account and data</p></div>
                            </button>
                        </div>
                    </motion.div>
                </div>
            </main>

            {/* Delete Account Modal */}
            <AnimatePresence>
                {showDeleteModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowDeleteModal(false)}>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-red-600 dark:text-red-400">Delete Account</h3>
                                <button onClick={() => setShowDeleteModal(false)} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="mb-6">
                                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl mb-4"><p className="text-sm text-red-700 dark:text-red-400">⚠️ This action is irreversible. All your data including test results will be permanently deleted.</p></div>
                                {deleteError && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl mb-4"><p className="text-sm text-red-700 dark:text-red-400">{deleteError}</p></div>}
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
