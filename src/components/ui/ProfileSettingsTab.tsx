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
    Trash2,
    X,
    Camera,
    ChevronRight,
    Flame,
    Star,
    Award,
    Edit3,
    Smartphone,
    Cloud,
    Pen,
    LogOut,
    SlidersHorizontal,
    Mail,
    ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { requestClassChange, getResultsByStudent } from '@/lib/services';
import { CLASS_OPTIONS } from '@/lib/constants';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential, deleteUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { uploadProfilePicture, deleteProfilePicture } from '@/lib/profilePictureService';

import ProfileFrame from '@/components/ui/ProfileFrame';
import PremiumBadge from '@/components/ui/PremiumBadge';
import { usePremium } from '@/contexts/PremiumContext';
import type { ProfileFrameType, BadgeType } from '@/services/premiumService';
import type { TestResult } from '@/types';

// ── Extracted outside to prevent re-mount flickering ──

function SettingRow({ icon: Icon, iconBg, iconColor, label, subtitle, onClick, rightContent, danger }: {
    icon: React.ComponentType<{ className?: string }>; iconBg: string; iconColor: string;
    label: string; subtitle: string; onClick: () => void;
    rightContent?: React.ReactNode; danger?: boolean;
}) {
    return (
        <button onClick={onClick} className={`w-full flex items-center gap-4 px-4 py-4 transition-colors ${danger ? 'hover:bg-red-50/80 dark:hover:bg-red-950/30' : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
            <div className="flex-1 text-left min-w-0">
                <p className={`text-[14px] font-semibold ${danger ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>{label}</p>
                <p className={`text-xs mt-0.5 ${danger ? 'text-red-500/60 dark:text-red-400/50' : 'text-gray-500 dark:text-gray-400'}`}>{subtitle}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
                {rightContent}
                <ChevronRight className={`w-4 h-4 ${danger ? 'text-red-400' : 'text-gray-400 dark:text-gray-500'}`} />
            </div>
        </button>
    );
}

function SettingsModal({ show, onClose, title, children }: { show: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
    return (
        <AnimatePresence>
            {show && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center" onClick={onClose}>
                    <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-center pt-3 sm:hidden"><div className="w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full" /></div>
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
                            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="px-6 py-5">{children}</div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default function ProfileSettingsTab({ onBack }: { onBack?: () => void }) {
    const { user, signOut, refreshUser } = useAuth();
    const { theme, setTheme } = useTheme();
    const { activeProfileFrame, activeBadge } = usePremium();
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

    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const [photoError, setPhotoError] = useState<string | null>(null);
    const [photoSuccess, setPhotoSuccess] = useState(false);

    const [showAppearance, setShowAppearance] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showClassSelection, setShowClassSelection] = useState(false);
    const [showPasswordChange, setShowPasswordChange] = useState(false);
    const [showSecurity, setShowSecurity] = useState(false);
    const [showActiveSessions, setShowActiveSessions] = useState(false);
    const [showEditProfile, setShowEditProfile] = useState(false);

    const [editFirstName, setEditFirstName] = useState('');
    const [editLastName, setEditLastName] = useState('');
    const [editUsername, setEditUsername] = useState('');
    const [editBoard, setEditBoard] = useState('');
    const [editSchoolName, setEditSchoolName] = useState('');
    const [editAboutBio, setEditAboutBio] = useState('');
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);
    const [profileSaveError, setProfileSaveError] = useState<string | null>(null);

    const [averageScore, setAverageScore] = useState(0);
    const [xpPoints, setXpPoints] = useState(0);

    const isAnyModalOpen = showAppearance || showNotifications || showClassSelection || showPasswordChange || showSecurity || showActiveSessions || showDeleteModal || showEditProfile;
    useEffect(() => {
        if (isAnyModalOpen) { document.body.style.overflow = 'hidden'; } else { document.body.style.overflow = ''; }
        return () => { document.body.style.overflow = ''; };
    }, [isAnyModalOpen]);

    const loadStats = useCallback(async () => {
        if (!user?.uid) return;
        try {
            const results: TestResult[] = await getResultsByStudent(user.uid);
            const scorableResults = results.filter(r => !r.isPdfTest && r.totalQuestions > 0);
            const totalScorable = scorableResults.length;
            const avg = totalScorable > 0 ? Math.round(scorableResults.reduce((acc, r) => acc + (r.score / r.totalQuestions) * 100, 0) / totalScorable) : 0;
            setAverageScore(avg);
            setXpPoints(user.xp ?? 0);
        } catch (error) { console.error('Error loading stats:', error); }
    }, [user?.uid, user?.xp]);

    useEffect(() => { if (user?.studentClass) setStudentClass(user.studentClass); }, [user]);
    useEffect(() => { loadStats(); }, [loadStats]);

    const handleUpdateClass = async () => {
        if (!user) return;
        setIsUpdatingClass(true); setClassError(null); setClassSuccess(false);
        try {
            await requestClassChange(user.uid, user.name, user.email, user.studentClass || 0, studentClass);
            await refreshUser(); setClassSuccess(true); setTimeout(() => setClassSuccess(false), 5000);
        } catch { setClassError('Failed to submit class change request.'); }
        finally { setIsUpdatingClass(false); }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth.currentUser) return;
        setPasswordError(null); setPasswordSuccess(false);
        if (newPassword.length < 6) { setPasswordError('New password must be at least 6 characters'); return; }
        if (newPassword !== confirmPassword) { setPasswordError('New passwords do not match'); return; }
        setIsUpdatingPassword(true);
        try {
            const credential = EmailAuthProvider.credential(auth.currentUser.email!, currentPassword);
            await reauthenticateWithCredential(auth.currentUser, credential);
            await updatePassword(auth.currentUser, newPassword);
            setPasswordSuccess(true); setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
            setTimeout(() => { setPasswordSuccess(false); setShowPasswordChange(false); }, 2000);
        } catch (error: unknown) {
            if (error instanceof Error && (error.message.includes('wrong-password') || error.message.includes('invalid-credential'))) {
                setPasswordError('Current password is incorrect');
            } else { setPasswordError('Failed to update password.'); }
        } finally { setIsUpdatingPassword(false); }
    };

    const handleDeleteAccount = async () => {
        if (!auth.currentUser || !user) return;
        setDeleteError(null); setIsDeleting(true);
        try {
            const credential = EmailAuthProvider.credential(auth.currentUser.email!, deletePassword);
            await reauthenticateWithCredential(auth.currentUser, credential);
            await deleteDoc(doc(db, 'users', user.uid));
            await deleteUser(auth.currentUser);
            router.push('/');
        } catch { setDeleteError('Failed to delete account. Please check your password.'); }
        finally { setIsDeleting(false); }
    };

    const handleExportData = () => {
        if (!user) return;
        const userData = { name: user.name, email: user.email, role: user.role, class: user.studentClass, exportedAt: new Date().toISOString() };
        const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `quizy-profile-${user.uid}.json`; a.click(); URL.revokeObjectURL(url);
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!user || !e.target.files?.length) return;
        const file = e.target.files[0];
        setIsUploadingPhoto(true); setPhotoError(null); setPhotoSuccess(false);
        try {
            await uploadProfilePicture(user.uid, file); await refreshUser();
            setPhotoSuccess(true); setTimeout(() => setPhotoSuccess(false), 3000);
        } catch (error: unknown) {
            if (error instanceof Error) { setPhotoError(error.message); } else { setPhotoError('Failed to upload photo.'); }
        } finally { setIsUploadingPhoto(false); if (e.target) e.target.value = ''; }
    };

    const handleSignOut = async () => { await signOut(); router.push('/'); };

    const handleOpenEditProfile = () => {
        const nameParts = (user?.name || '').trim().split(/\s+/);
        setEditFirstName(nameParts[0] || ''); setEditLastName(nameParts.slice(1).join(' ') || '');
        setEditUsername(user?.username || ''); setEditBoard(user?.board || '');
        setEditSchoolName(user?.schoolName || ''); setEditAboutBio(user?.aboutBio || '');
        setProfileSaveSuccess(false); setProfileSaveError(null); setShowEditProfile(true);
    };

    const handleSaveProfile = async () => {
        if (!user) return;
        setIsSavingProfile(true); setProfileSaveError(null); setProfileSaveSuccess(false);
        try {
            const fullName = [editFirstName.trim(), editLastName.trim()].filter(Boolean).join(' ');
            if (!fullName) { setProfileSaveError('First name is required.'); setIsSavingProfile(false); return; }
            await updateDoc(doc(db, 'users', user.uid), {
                name: fullName, username: editUsername.trim(), board: editBoard.trim(), schoolName: editSchoolName.trim(), aboutBio: editAboutBio.trim(),
            });
            await refreshUser(); setProfileSaveSuccess(true);
            setTimeout(() => { setProfileSaveSuccess(false); setShowEditProfile(false); }, 1500);
        } catch { setProfileSaveError('Failed to save changes.'); }
        finally { setIsSavingProfile(false); }
    };

    if (!user) return null;

    const themeLabel = theme === 'light' ? 'Light' : theme === 'dark' ? 'Dark' : 'System';
    const streak = user.currentStreak || 0;

    return (
        <>
            <div className="w-full px-4 sm:px-6 lg:px-8 pt-6 pb-12">
                {/* ── Mobile Back Button ── */}
                {onBack && (
                    <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} className="lg:hidden mb-4">
                        <button
                            onClick={onBack}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors -ml-1"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back
                        </button>
                    </motion.div>
                )}
                {/* ── Profile Card (full width) ── */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-50 via-purple-50/80 to-violet-50 dark:from-gray-800/80 dark:via-gray-800/60 dark:to-gray-800/80 border border-gray-200/60 dark:border-gray-700/40"
                >
                    <div className="px-6 py-6">
                        <div className="flex items-center gap-5">
                            {/* Avatar */}
                            <div className="relative flex-shrink-0">
                                <ProfileFrame
                                    frameType={(activeProfileFrame as ProfileFrameType) || 'none'}
                                    photoURL={user.photoURL}
                                    userName={user.name}
                                    size={88}
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploadingPhoto}
                                    className="absolute -bottom-1 -right-1 w-8 h-8 bg-[#1650EB] rounded-full flex items-center justify-center shadow-lg shadow-[#1650EB]/30 border-2 border-white dark:border-gray-800 hover:scale-110 transition-transform"
                                >
                                    {isUploadingPhoto ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" /> : <Camera className="w-3.5 h-3.5 text-white" />}
                                </button>
                                <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                            </div>

                            {/* User info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate">{user.name}</h2>
                                    {activeBadge && activeBadge !== 'none' && <PremiumBadge badgeType={activeBadge as BadgeType} size="md" />}
                                    <svg viewBox="0 0 22 22" className="w-5 h-5 flex-shrink-0" fill="none">
                                        <circle cx="11" cy="11" r="11" fill="#1650EB" />
                                        <path d="M7 11.5L9.5 14L15 8.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">{user.email}</p>
                                <div className="flex items-center gap-2 mt-2.5">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#1650EB]/10 dark:bg-[#1650EB]/20 rounded-full text-xs font-semibold text-[#1650EB] dark:text-blue-400">
                                        <Star className="w-3 h-3 fill-current" />
                                        Class {user.studentClass} Student
                                    </span>
                                </div>
                            </div>

                            {/* Edit Profile button */}
                            <button
                                onClick={handleOpenEditProfile}
                                className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 bg-white/90 dark:bg-gray-700/80 rounded-xl text-sm font-semibold text-gray-800 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-600 transition-all border border-gray-200/80 dark:border-gray-600/60 shadow-sm hover:shadow-md"
                            >
                                <Edit3 className="w-4 h-4" />
                                Edit Profile
                            </button>
                        </div>
                    </div>

                    {/* Photo status */}
                    {photoError && (
                        <div className="mx-6 mb-3 p-2.5 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" /><p className="text-xs text-red-700 dark:text-red-400">{photoError}</p>
                        </div>
                    )}
                    {photoSuccess && (
                        <div className="mx-6 mb-3 p-2.5 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /><p className="text-xs text-green-700 dark:text-green-400">Photo updated!</p>
                        </div>
                    )}

                    {/* Stats bar */}
                    <div className="mx-5 mb-5 bg-white/70 dark:bg-gray-900/50 backdrop-blur-sm rounded-2xl px-4 py-4 grid grid-cols-3 gap-4 border border-gray-200/40 dark:border-gray-700/30">
                        <div className="flex items-center gap-3 justify-center">
                            <Flame className="w-6 h-6 text-orange-500" />
                            <div>
                                <p className="text-xl font-bold text-gray-900 dark:text-white leading-none">{streak}</p>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Day Streak</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 justify-center border-x border-gray-200/60 dark:border-gray-700/40">
                            <Star className="w-6 h-6 text-amber-400 fill-amber-400" />
                            <div>
                                <p className="text-xl font-bold text-gray-900 dark:text-white leading-none">{xpPoints.toLocaleString()}</p>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">XP Points</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 justify-center">
                            <Award className="w-6 h-6 text-rose-500" />
                            <div>
                                <p className="text-xl font-bold text-gray-900 dark:text-white leading-none">{averageScore}%</p>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Avg. Score</p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* ── Two-column settings grid ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-6">
                    {/* LEFT: Preferences */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <div className="bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-200/80 dark:border-gray-700/40 overflow-hidden">
                            {/* Section header */}
                            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100 dark:border-gray-800/60">
                                <SlidersHorizontal className="w-4.5 h-4.5 text-[#1650EB]" />
                                <h3 className="text-[15px] font-bold text-gray-900 dark:text-white">Preferences</h3>
                            </div>
                            <div className="divide-y divide-gray-100 dark:divide-gray-800/50">
                                <SettingRow
                                    icon={Palette} iconBg="bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/40 dark:to-pink-900/40" iconColor="text-purple-600 dark:text-purple-400"
                                    label="Appearance" subtitle="Choose your preferred theme" onClick={() => setShowAppearance(true)}
                                    rightContent={<span className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400">{theme === 'light' ? <Sun className="w-3 h-3" /> : theme === 'dark' ? <Moon className="w-3 h-3" /> : <Monitor className="w-3 h-3" />}{themeLabel}</span>}
                                />
                                <SettingRow
                                    icon={Bell} iconBg="bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/40" iconColor="text-amber-600 dark:text-amber-400"
                                    label="Notifications" subtitle="Manage your notification preferences" onClick={() => setShowNotifications(true)}
                                />
                                {user.role === 'student' && (
                                    <SettingRow
                                        icon={BookOpen} iconBg="bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/40 dark:to-cyan-900/40" iconColor="text-blue-600 dark:text-blue-400"
                                        label="Class Selection" subtitle="Request a class change" onClick={() => setShowClassSelection(true)}
                                        rightContent={<span className="px-2.5 py-1 bg-[#1650EB]/10 dark:bg-[#1650EB]/20 rounded-lg text-xs font-semibold text-[#1650EB] dark:text-blue-400">Class {user.studentClass}</span>}
                                    />
                                )}
                                <SettingRow
                                    icon={Cloud} iconBg="bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-900/40 dark:to-blue-900/40" iconColor="text-cyan-600 dark:text-cyan-400"
                                    label="Export My Data" subtitle="Download a copy of your profile data" onClick={handleExportData}
                                />
                            </div>
                        </div>
                    </motion.div>

                    {/* RIGHT: Account & Security */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                        <div className="bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-200/80 dark:border-gray-700/40 overflow-hidden">
                            {/* Section header */}
                            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100 dark:border-gray-800/60">
                                <Shield className="w-4.5 h-4.5 text-[#1650EB]" />
                                <h3 className="text-[15px] font-bold text-gray-900 dark:text-white">Account & Security</h3>
                            </div>
                            <div className="divide-y divide-gray-100 dark:divide-gray-800/50">
                                <SettingRow
                                    icon={Shield} iconBg="bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/40 dark:to-emerald-900/40" iconColor="text-green-600 dark:text-green-400"
                                    label="Change Password" subtitle="Update your account password" onClick={() => setShowPasswordChange(true)}
                                />
                                <SettingRow
                                    icon={Mail} iconBg="bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40" iconColor="text-blue-600 dark:text-blue-400"
                                    label="Email Address" subtitle="Update your registered email" onClick={() => setShowSecurity(true)}
                                    rightContent={<span className="text-xs text-gray-500 dark:text-gray-400 max-w-[160px] truncate">{user.email}</span>}
                                />
                                <SettingRow
                                    icon={ShieldCheck} iconBg="bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/40 dark:to-purple-900/40" iconColor="text-violet-600 dark:text-violet-400"
                                    label="Two-Factor Authentication" subtitle="Add an extra layer of security" onClick={() => setShowSecurity(true)}
                                    rightContent={<span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-md text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Off</span>}
                                />
                                <SettingRow
                                    icon={Trash2} iconBg="bg-gradient-to-br from-red-100 to-pink-100 dark:from-red-900/40 dark:to-pink-900/40" iconColor="text-red-600 dark:text-red-400"
                                    label="Delete Account" subtitle="Permanently delete your account" onClick={() => setShowDeleteModal(true)} danger
                                />
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* ── Security footer ── */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="mt-6">
                    <div className="bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-violet-50/80 dark:from-gray-800/60 dark:via-gray-800/40 dark:to-gray-800/60 rounded-2xl border border-blue-100/60 dark:border-gray-700/30 px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#1650EB]/10 dark:bg-[#1650EB]/20 rounded-xl flex items-center justify-center">
                                <ShieldCheck className="w-5 h-5 text-[#1650EB]" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-900 dark:text-white">Your data is safe with us.</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">We use industry-standard encryption to protect your personal information.</p>
                            </div>
                        </div>
                        <button
                            onClick={handleSignOut}
                            className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 rounded-xl text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors border border-red-100 dark:border-red-900/30"
                        >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                        </button>
                    </div>
                    <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-3">Quizy v2.0 • Made with ❤️</p>
                </motion.div>
            </div>

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
                        <button key={mode} onClick={() => setTheme(mode)} className={`flex flex-col items-center gap-2.5 p-4 rounded-2xl border-2 transition-all ${theme === mode ? 'border-[#1650EB] bg-[#1650EB]/5 dark:bg-[#1650EB]/10 shadow-sm' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}>
                            <Icon className={`w-6 h-6 ${theme === mode ? 'text-[#1650EB]' : 'text-gray-500 dark:text-gray-400'}`} />
                            <span className={`text-sm font-medium ${theme === mode ? 'text-[#1650EB]' : 'text-gray-700 dark:text-gray-300'}`}>{label}</span>
                            {theme === mode && <div className="w-5 h-5 bg-[#1650EB] rounded-full flex items-center justify-center"><CheckCircle className="w-3.5 h-3.5 text-white" /></div>}
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
                            <div><p className="font-medium text-sm text-gray-900 dark:text-white">Push Notifications</p><p className="text-xs text-gray-500 dark:text-gray-400">Get notified about new tests</p></div>
                        </div>
                        <button onClick={() => setNotifications(!notifications)} className={`w-12 h-7 rounded-full transition-colors ${notifications ? 'bg-[#1650EB]' : 'bg-gray-300 dark:bg-gray-600'}`}>
                            <div className={`w-[22px] h-[22px] bg-white rounded-full shadow transition-transform ${notifications ? 'translate-x-[22px]' : 'translate-x-[3px]'}`} />
                        </button>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                        <div className="flex items-center gap-3">
                            <svg viewBox="0 0 20 20" className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="4" width="16" height="12" rx="2" /><path d="M2 6l8 5 8-5" /></svg>
                            <div><p className="font-medium text-sm text-gray-900 dark:text-white">Email Updates</p><p className="text-xs text-gray-500 dark:text-gray-400">Receive weekly progress reports</p></div>
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
                    {classError && (<div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2"><AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" /><p className="text-sm text-red-700 dark:text-red-400">{classError}</p></div>)}
                    {classSuccess && (<div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /><p className="text-sm text-green-700 dark:text-green-400">Class change request submitted!</p></div>)}
                    {user.pendingClassChange && (
                        <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                            <div className="flex items-center gap-2 mb-1"><div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" /><p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Pending Approval</p></div>
                            <p className="text-sm text-amber-600 dark:text-amber-500">Your request to change to <strong>Class {user.pendingClassChange}</strong> is awaiting teacher approval.</p>
                        </div>
                    )}
                    <div className="space-y-3">
                        <select value={studentClass} onChange={(e) => setStudentClass(Number(e.target.value))} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[#1650EB] focus:border-transparent outline-none transition-all" disabled={!!user.pendingClassChange}>
                            {CLASS_OPTIONS.map((option) => (<option key={option.value} value={option.value}>{option.label}</option>))}
                        </select>
                        <button onClick={handleUpdateClass} disabled={isUpdatingClass || studentClass === user.studentClass || !!user.pendingClassChange} className="w-full flex items-center justify-center gap-2 py-3 bg-[#1650EB] text-white rounded-xl font-medium hover:bg-[#1243c7] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                            {isUpdatingClass ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}{user.pendingClassChange ? 'Pending Approval' : 'Request Class Change'}
                        </button>
                    </div>
                    <p className="mt-3 text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1"><Shield className="w-3 h-3" />Class changes require teacher approval.</p>
                </SettingsModal>
            )}

            {/* Password Change Modal */}
            <SettingsModal show={showPasswordChange} onClose={() => setShowPasswordChange(false)} title="Change Password">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Update your account password</p>
                {passwordError && (<div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2"><AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" /><p className="text-sm text-red-700 dark:text-red-400">{passwordError}</p></div>)}
                {passwordSuccess && (<div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /><p className="text-sm text-green-700 dark:text-green-400">Password updated successfully!</p></div>)}
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                    <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Current Password</label><input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required placeholder="Enter current password" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#1650EB] focus:border-transparent outline-none transition-all" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">New Password</label><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} placeholder="Min 6 characters" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#1650EB] focus:border-transparent outline-none transition-all" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Confirm New Password</label><input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} placeholder="Confirm new password" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#1650EB] focus:border-transparent outline-none transition-all" /></div>
                    <button type="submit" disabled={isUpdatingPassword || !currentPassword || !newPassword || !confirmPassword} className="w-full flex items-center justify-center gap-2 py-3 bg-[#1650EB] text-white rounded-xl font-medium hover:bg-[#1243c7] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        {isUpdatingPassword ? <><Loader2 className="w-5 h-5 animate-spin" /> Updating...</> : <><Lock className="w-5 h-5" /> Update Password</>}
                    </button>
                </form>
            </SettingsModal>

            {/* Security Modal */}
            <SettingsModal show={showSecurity} onClose={() => setShowSecurity(false)} title="Security">
                <div className="space-y-4">
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                        <div className="flex items-center gap-2 mb-2"><Shield className="w-5 h-5 text-green-600" /><p className="font-semibold text-sm text-green-700 dark:text-green-400">Account Secured</p></div>
                        <p className="text-xs text-green-600 dark:text-green-500">Your account is protected with Firebase Authentication.</p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                        <p className="font-medium text-sm text-gray-900 dark:text-white mb-1">Two-Factor Authentication</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Add an extra layer of security to your account.</p>
                        <span className="inline-flex items-center px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-xs font-medium text-amber-600 dark:text-amber-400">Coming Soon</span>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                        <p className="font-medium text-sm text-gray-900 dark:text-white mb-1">Login Method</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{auth.currentUser?.providerData?.[0]?.providerId === 'google.com' ? 'Google Sign-In' : 'Email & Password'}</p>
                    </div>
                </div>
            </SettingsModal>

            {/* Delete Account Modal */}
            <AnimatePresence>
                {showDeleteModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={() => setShowDeleteModal(false)}>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-6"><h3 className="text-xl font-bold text-red-600 dark:text-red-400">Delete Account</h3><button onClick={() => setShowDeleteModal(false)} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"><X className="w-5 h-5" /></button></div>
                            <div className="mb-6">
                                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl mb-4"><p className="text-sm text-red-700 dark:text-red-400">⚠️ This action is irreversible. All your data will be permanently deleted.</p></div>
                                {deleteError && (<div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl mb-4"><p className="text-sm text-red-700 dark:text-red-400">{deleteError}</p></div>)}
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Enter your password to confirm</label>
                                <input type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} placeholder="Your password" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all" />
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button>
                                <button onClick={handleDeleteAccount} disabled={isDeleting || !deletePassword} className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                    {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}{isDeleting ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ===== EDIT PROFILE MODAL ===== */}
            <AnimatePresence>
                {showEditProfile && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-md z-[70] flex items-end sm:items-center justify-center" onClick={() => setShowEditProfile(false)}>
                        <motion.div
                            initial={{ y: 60, opacity: 0, scale: 0.97 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 60, opacity: 0, scale: 0.97 }}
                            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                            className="bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl border border-gray-200/60 dark:border-gray-800/60"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-center pt-3 sm:hidden"><div className="w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full" /></div>
                            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1650EB]/10 to-blue-100 dark:from-[#1650EB]/20 dark:to-blue-900/30 flex items-center justify-center"><Edit3 className="w-5 h-5 text-[#1650EB]" /></div>
                                    <div><h3 className="text-lg font-bold text-gray-900 dark:text-white">Edit Profile</h3><p className="text-xs text-gray-400 dark:text-gray-500">Update your personal information</p></div>
                                </div>
                                <button onClick={() => setShowEditProfile(false)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="px-6 py-5 space-y-5">
                                {/* Avatar */}
                                <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-800/30 rounded-2xl border border-gray-100 dark:border-gray-800">
                                    <div className="relative flex-shrink-0"><ProfileFrame frameType={(activeProfileFrame as ProfileFrameType) || 'none'} photoURL={user.photoURL} userName={user.name} size={56} /></div>
                                    <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user.name}</p><p className="text-xs text-gray-400 dark:text-gray-500 truncate">{user.email}</p></div>
                                    <button onClick={() => fileInputRef.current?.click()} disabled={isUploadingPhoto} className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-gray-700 rounded-xl text-xs font-medium text-[#1650EB] hover:bg-blue-50 dark:hover:bg-gray-600 transition-colors border border-gray-200 dark:border-gray-600 shadow-sm">
                                        {isUploadingPhoto ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}Change Photo
                                    </button>
                                </div>
                                {profileSaveSuccess && (<motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /><p className="text-sm text-green-700 dark:text-green-400 font-medium">Profile updated successfully!</p></motion.div>)}
                                {profileSaveError && (<motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2"><AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" /><p className="text-sm text-red-700 dark:text-red-400">{profileSaveError}</p></motion.div>)}
                                {/* Name */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">First Name</label><input type="text" value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} placeholder="First name" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#1650EB] focus:border-transparent outline-none transition-all" /></div>
                                    <div><label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Last Name</label><input type="text" value={editLastName} onChange={(e) => setEditLastName(e.target.value)} placeholder="Last name" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#1650EB] focus:border-transparent outline-none transition-all" /></div>
                                </div>
                                {/* Email */}
                                <div><label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Email Address</label><div className="relative"><input type="email" value={user.email} readOnly className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-500 dark:text-gray-400 cursor-not-allowed" /><div className="absolute right-3 top-1/2 -translate-y-1/2"><Lock className="w-3.5 h-3.5 text-gray-400" /></div></div><p className="text-[10px] text-gray-400 mt-1">Email cannot be changed for security reasons</p></div>
                                {/* Username */}
                                <div><label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Username</label><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">@</span><input type="text" value={editUsername} onChange={(e) => setEditUsername(e.target.value.replace(/\s/g, '').toLowerCase())} placeholder="username" className="w-full pl-8 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#1650EB] focus:border-transparent outline-none transition-all" /></div></div>
                                {/* Board & School */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Board</label><select value={editBoard} onChange={(e) => setEditBoard(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#1650EB] focus:border-transparent outline-none transition-all appearance-none"><option value="">Select board</option><option value="CBSE">CBSE</option><option value="ICSE">ICSE</option><option value="State Board">State Board</option><option value="IB">IB</option><option value="IGCSE">IGCSE</option><option value="Other">Other</option></select></div>
                                    <div><label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">School Name</label><input type="text" value={editSchoolName} onChange={(e) => setEditSchoolName(e.target.value)} placeholder="Your school" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#1650EB] focus:border-transparent outline-none transition-all" /></div>
                                </div>
                                {/* Bio */}
                                <div><label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">About / Bio</label><textarea value={editAboutBio} onChange={(e) => setEditAboutBio(e.target.value.slice(0, 200))} placeholder="Tell us something about yourself..." rows={3} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#1650EB] focus:border-transparent outline-none transition-all resize-none" /><p className="text-[10px] text-gray-400 mt-1 text-right">{editAboutBio.length}/200</p></div>
                            </div>
                            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 rounded-b-2xl">
                                <div className="flex gap-3">
                                    <button onClick={() => setShowEditProfile(false)} className="flex-1 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">Cancel</button>
                                    <button onClick={handleSaveProfile} disabled={isSavingProfile || !editFirstName.trim()} className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[#1650EB] to-[#4F7BF7] text-white rounded-xl font-semibold text-sm hover:from-[#1243c7] hover:to-[#3d6ae5] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-[#1650EB]/20 hover:shadow-[#1650EB]/30">
                                        {isSavingProfile ? (<><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>) : (<><Save className="w-4 h-4" /> Save Changes</>)}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
