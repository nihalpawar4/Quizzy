'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
    GraduationCap,
    BookOpen,
    BarChart3,
    BookMarked,
    HelpCircle,
    DollarSign,
    Megaphone,
    Plus,
    MessageCircle,
    Bell,
    User,
    LogOut,
    Settings,
    ChevronLeft,
    Home,
    CalendarDays,
    ClipboardCheck,
    MoreHorizontal,
    X,
} from 'lucide-react';

interface TeacherSidebarProps {
    activeTab: 'tests' | 'analytics' | 'notes' | 'qa' | 'fees';
    onTabChange: (tab: 'tests' | 'analytics' | 'notes' | 'qa' | 'fees') => void;
    userName: string;
    userPhotoURL?: string | null;
    totalUnreadChat: number;
    pendingQACount: number;
    notesCount: number;
    onSignOut: () => void;
    onCreateTest: () => void;
    onAnnounce: () => void;
}

interface NavItem {
    id: string;
    label: string;
    shortLabel: string;
    icon: React.ComponentType<{ className?: string }>;
    tab?: 'tests' | 'analytics' | 'notes' | 'qa' | 'fees';
    href?: string;
    badge?: number;
    onClick?: () => void;
    activeColor: string;
}

export default function TeacherSidebar({
    activeTab,
    onTabChange,
    userName,
    userPhotoURL,
    totalUnreadChat,
    pendingQACount,
    notesCount,
    onSignOut,
    onCreateTest,
    onAnnounce,
}: TeacherSidebarProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);

    const mainItems: NavItem[] = [
        {
            id: 'tests',
            label: 'Tests',
            shortLabel: 'Tests',
            icon: BookOpen,
            tab: 'tests',
            activeColor: 'bg-[#1650EB]',
        },
        {
            id: 'analytics',
            label: 'Analytics',
            shortLabel: 'Analytics',
            icon: BarChart3,
            tab: 'analytics',
            activeColor: 'bg-emerald-500',
        },
        {
            id: 'notes',
            label: 'Subject Notes',
            shortLabel: 'Notes',
            icon: BookMarked,
            tab: 'notes',
            badge: notesCount > 0 ? notesCount : undefined,
            activeColor: 'bg-purple-500',
        },
        {
            id: 'qa',
            label: 'Q&A',
            shortLabel: 'Q&A',
            icon: HelpCircle,
            tab: 'qa',
            badge: pendingQACount > 0 ? pendingQACount : undefined,
            activeColor: 'bg-orange-500',
        },
        {
            id: 'fees',
            label: 'Fee Requests',
            shortLabel: 'Fees',
            icon: DollarSign,
            tab: 'fees',
            activeColor: 'bg-amber-500',
        },
    ];

    const quickItems: NavItem[] = [
        {
            id: 'announce',
            label: 'Announce',
            shortLabel: 'Announce',
            icon: Megaphone,
            onClick: onAnnounce,
            activeColor: 'bg-amber-500',
        },
        {
            id: 'homework',
            label: 'Homework',
            shortLabel: 'HW',
            icon: BookOpen,
            href: '/dashboard/teacher/homework',
            activeColor: 'bg-green-500',
        },
        {
            id: 'evaluation',
            label: 'Evaluation Center',
            shortLabel: 'Eval',
            icon: ClipboardCheck,
            href: '/dashboard/teacher/evaluation',
            activeColor: 'bg-amber-500',
        },
        {
            id: 'create-test',
            label: 'Create Test',
            shortLabel: 'Create',
            icon: Plus,
            onClick: onCreateTest,
            activeColor: 'bg-[#1650EB]',
        },
    ];

    // Profile dropdown state
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);

    // Mobile "More" menu state
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const moreMenuRef = useRef<HTMLDivElement>(null);

    // Close profile dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
                setShowProfileDropdown(false);
            }
        };
        if (showProfileDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showProfileDropdown]);

    // Auto-close profile dropdown after 4 seconds
    useEffect(() => {
        if (showProfileDropdown) {
            const t = setTimeout(() => setShowProfileDropdown(false), 4000);
            return () => clearTimeout(t);
        }
    }, [showProfileDropdown]);

    // Close more menu on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
                setShowMoreMenu(false);
            }
        };
        if (showMoreMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showMoreMenu]);

    const handleNavClick = (item: NavItem) => {
        if (item.onClick) {
            item.onClick();
            return;
        }
        if (item.tab) {
            onTabChange(item.tab);
        }
    };

    const sidebarWidth = isCollapsed ? 'w-[72px]' : 'w-[260px]';

    const renderNavItem = (item: NavItem, isActive: boolean) => {
        const content = (
            <div
                className={`
                    relative flex items-center gap-3 px-3 py-2.5 rounded-2xl cursor-pointer
                    transition-all duration-200 group
                    ${isActive
                        ? 'bg-[#1650EB]/10 dark:bg-[#1650EB]/15 text-[#1650EB] dark:text-[#6095DB] shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100/80 dark:hover:bg-gray-800/50 hover:text-gray-800 dark:hover:text-gray-200'
                    }
                `}
            >
                {/* Active indicator bar */}
                {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 -ml-3 w-[3px] h-5 bg-[#1650EB] dark:bg-[#6095DB] rounded-r-full" />
                )}

                {/* Icon in glass container */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                    isActive
                        ? 'bg-[#1650EB] shadow-md shadow-[#1650EB]/25'
                        : 'bg-gray-100/80 dark:bg-gray-800/60 group-hover:bg-gray-200/80 dark:group-hover:bg-gray-700/60'
                }`}>
                    <item.icon className={`w-4 h-4 flex-shrink-0 transition-colors ${
                        isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'
                    }`} />
                </div>

                {!isCollapsed && (
                    <>
                        <span className={`text-[13px] font-semibold truncate transition-colors ${
                            isActive ? 'text-[#1650EB] dark:text-[#6095DB]' : ''
                        }`}>
                            {item.label}
                        </span>

                        {/* Badge */}
                        {item.badge && item.badge > 0 ? (
                            <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold flex-shrink-0 transition-colors
                                ${isActive
                                    ? 'bg-[#1650EB]/20 dark:bg-[#1650EB]/30 text-[#1650EB] dark:text-[#6095DB]'
                                    : 'bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400'
                                }`}>
                                {item.badge}
                            </span>
                        ) : null}
                    </>
                )}

                {/* Collapsed badge dot */}
                {isCollapsed && item.badge && item.badge > 0 ? (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-sm">
                        {item.badge > 9 ? '9+' : item.badge}
                    </span>
                ) : null}
            </div>
        );

        if (item.href) {
            return (
                <Link key={item.id} href={item.href}>
                    {content}
                </Link>
            );
        }

        return (
            <div key={item.id} onClick={() => handleNavClick(item)}>
                {content}
            </div>
        );
    };

    // Mobile bottom tab items: My Tests, Analytics, Subject Notes, Homework (rest in More)
    const mobileBottomItems: NavItem[] = [
        mainItems.find(i => i.id === 'tests')!,
        mainItems.find(i => i.id === 'analytics')!,
        mainItems.find(i => i.id === 'notes')!,
    ];

    // Items shown in the "More" flyout on mobile
    const mobileMoreItems: NavItem[] = [
        mainItems.find(i => i.id === 'qa')!,
        mainItems.find(i => i.id === 'fees')!,
        {
            id: 'homework',
            label: 'Homework',
            shortLabel: 'HW',
            icon: BookOpen,
            href: '/dashboard/teacher/homework',
            activeColor: 'bg-green-500',
        },
        {
            id: 'announce',
            label: 'Announce',
            shortLabel: 'Announce',
            icon: Megaphone,
            onClick: onAnnounce,
            activeColor: 'bg-amber-500',
        },
        {
            id: 'create-test',
            label: 'Create Test',
            shortLabel: 'Create',
            icon: Plus,
            onClick: onCreateTest,
            activeColor: 'bg-[#1650EB]',
        },
    ];

    // Profile dropdown content (reused for mobile & desktop)
    const profileDropdownContent = (
        <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-56 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/10 border border-gray-200/80 dark:border-gray-800/80 overflow-hidden z-[60]"
        >
            {/* User info */}
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{userName}</p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500">Teacher</p>
            </div>
            <div className="p-1.5">
                {/* Evaluation Center */}
                <Link
                    href="/dashboard/teacher/evaluation"
                    onClick={() => setShowProfileDropdown(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors group"
                >
                    <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                        <ClipboardCheck className="w-3.5 h-3.5 text-amber-500" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Evaluation Center</span>
                </Link>
                {/* Weekly Reports */}
                <Link
                    href="/teacher/weekly-reports"
                    onClick={() => setShowProfileDropdown(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors group"
                >
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                        <CalendarDays className="w-3.5 h-3.5 text-indigo-500" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Weekly Reports</span>
                </Link>
                {/* Profile Settings */}
                <Link
                    href="/profile"
                    onClick={() => setShowProfileDropdown(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors group"
                >
                    <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                        <Settings className="w-3.5 h-3.5 text-[#1650EB]" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Profile Settings</span>
                </Link>
                {/* Sign Out */}
                <button
                    onClick={() => { setShowProfileDropdown(false); onSignOut(); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50/80 dark:hover:bg-red-900/10 transition-colors group"
                >
                    <div className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                        <LogOut className="w-3.5 h-3.5 text-red-500" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-red-600">Sign Out</span>
                </button>
            </div>
        </motion.div>
    );

    // ===== Desktop sidebar content =====
    const sidebarContent = (
        <div className="flex flex-col h-full">
            {/* Logo Header */}
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-4 py-5`}>
                {!isCollapsed && (
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#1650EB] to-[#4f5bd5] rounded-2xl flex items-center justify-center shadow-lg shadow-[#1650EB]/20">
                            <GraduationCap className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="font-bold text-gray-900 dark:text-white text-[15px] tracking-tight">Quizy</h1>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">Teacher Dashboard</p>
                        </div>
                    </div>
                )}

                {isCollapsed && (
                    <div className="w-10 h-10 bg-gradient-to-br from-[#1650EB] to-[#4f5bd5] rounded-2xl flex items-center justify-center shadow-lg shadow-[#1650EB]/20">
                        <GraduationCap className="w-5 h-5 text-white" />
                    </div>
                )}

                {/* Collapse button */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="flex items-center justify-center w-7 h-7 rounded-xl bg-gray-100/80 dark:bg-gray-800/60 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    <ChevronLeft className={`w-3.5 h-3.5 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
                {/* Main Section */}
                <div>
                    {!isCollapsed && (
                        <p className="px-3 mb-2.5 text-[10px] font-bold text-gray-300 dark:text-gray-600 uppercase tracking-[0.12em]">
                            Manage
                        </p>
                    )}
                    <div className="space-y-0.5">
                        {mainItems.map((item) =>
                            renderNavItem(item, activeTab === item.tab)
                        )}
                    </div>
                </div>

                {/* Quick Actions Section */}
                <div>
                    {!isCollapsed && (
                        <p className="px-3 mb-2.5 text-[10px] font-bold text-gray-300 dark:text-gray-600 uppercase tracking-[0.12em]">
                            Quick Actions
                        </p>
                    )}
                    <div className="space-y-0.5">
                        {quickItems.map((item) =>
                            renderNavItem(item, false)
                        )}
                    </div>
                </div>


            </nav>
        </div>
    );

    return (
        <>
            {/* ===== MOBILE: Top Bar ===== */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-2xl border-b border-gray-100/50 dark:border-gray-800/50">
                <div className="flex items-center justify-between px-4 py-2.5">
                    {/* Logo */}
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-gradient-to-br from-[#1650EB] to-[#4f5bd5] rounded-xl flex items-center justify-center shadow-md shadow-[#1650EB]/15">
                            <GraduationCap className="w-4 h-4 text-white" />
                        </div>
                        <h1 className="font-bold text-gray-900 dark:text-white text-sm tracking-tight">Quizy</h1>
                    </div>

                    {/* Right icons */}
                    <div className="flex items-center gap-0.5">
                        {/* Chat — before Home, like earlier */}
                        <Link
                            href="/chat"
                            className="relative p-2 rounded-xl hover:bg-gray-100/80 dark:hover:bg-gray-800/60 transition-colors"
                            title="Chat"
                        >
                            <MessageCircle className="w-5 h-5 text-[#1650EB] dark:text-[#6095DB] fill-none stroke-[2.5]" />
                            {totalUnreadChat > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-sm">
                                    {totalUnreadChat > 99 ? '99+' : totalUnreadChat}
                                </span>
                            )}
                        </Link>
                        {/* Home */}
                        <Link
                            href="/"
                            className="p-2 rounded-xl hover:bg-gray-100/80 dark:hover:bg-gray-800/60 transition-colors"
                            title="Home"
                        >
                            <Home className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                        </Link>
                        {/* Profile avatar */}
                        <div className="relative" ref={profileRef}>
                            <button
                                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                                className="p-0.5 rounded-full hover:ring-2 hover:ring-[#1650EB]/20 transition-all"
                            >
                                {userPhotoURL ? (
                                    <img src={userPhotoURL} alt={userName} className="w-8 h-8 rounded-full object-cover ring-2 ring-white dark:ring-gray-900 shadow-sm" />
                                ) : (
                                    <div className="w-8 h-8 bg-[#1650EB]/10 rounded-full flex items-center justify-center">
                                        <User className="w-4 h-4 text-[#1650EB]" />
                                    </div>
                                )}
                            </button>
                            <AnimatePresence>
                                {showProfileDropdown && profileDropdownContent}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>

            {/* ===== MOBILE: Bottom Dock Navigation ===== */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 px-3 pb-[max(8px,env(safe-area-inset-bottom))]">
                <div className="bg-white/85 dark:bg-gray-900/85 backdrop-blur-2xl rounded-[28px] border border-gray-200/50 dark:border-gray-800/50 shadow-2xl shadow-black/8 px-2 py-1.5">
                    <div className="flex items-center justify-around">
                        {mobileBottomItems.map((item) => {
                            const isActive = activeTab === item.tab;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => item.tab && onTabChange(item.tab)}
                                    className={`relative flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-2xl transition-all duration-200 min-w-[56px]
                                        ${isActive
                                            ? ''
                                            : 'text-gray-400 dark:text-gray-500 active:scale-95'
                                        }`}
                                >
                                    {/* Active glass capsule background */}
                                    {isActive && (
                                        <motion.div
                                            layoutId="teacherMobileActiveTab"
                                            className="absolute inset-0 bg-[#1650EB]/10 dark:bg-[#1650EB]/15 rounded-2xl"
                                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                        />
                                    )}
                                    <div className="relative z-10">
                                        {/* Icon container */}
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 ${
                                            isActive
                                                ? 'bg-[#1650EB] shadow-md shadow-[#1650EB]/25 scale-105'
                                                : ''
                                        }`}>
                                            <item.icon className={`w-[18px] h-[18px] transition-colors ${
                                                isActive ? 'text-white' : 'text-gray-400 dark:text-gray-500'
                                            }`} />
                                        </div>
                                        {/* Badge */}
                                        {item.badge && item.badge > 0 ? (
                                            <span className="absolute -top-1 -right-2 min-w-[14px] h-3.5 px-1 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center shadow-sm">
                                                {item.badge > 9 ? '9+' : item.badge}
                                            </span>
                                        ) : null}
                                    </div>
                                    <span className={`relative z-10 text-[10px] font-semibold transition-colors ${
                                        isActive ? 'text-[#1650EB] dark:text-[#6095DB]' : ''
                                    }`}>
                                        {item.shortLabel}
                                    </span>
                                    {/* Active dot indicator */}
                                    {isActive && (
                                        <motion.div
                                            layoutId="teacherMobileActiveDot"
                                            className="w-1 h-1 bg-[#1650EB] dark:bg-[#6095DB] rounded-full"
                                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                        />
                                    )}
                                </button>
                            );
                        })}

                        {/* Homework tab */}
                        <Link
                            href="/dashboard/teacher/homework"
                            className="relative flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-2xl transition-all duration-200 min-w-[56px] text-gray-400 dark:text-gray-500 active:scale-95"
                        >
                            <div className="relative z-10">
                                <div className="w-8 h-8 rounded-xl flex items-center justify-center">
                                    <BookOpen className="w-[18px] h-[18px] text-gray-400 dark:text-gray-500" />
                                </div>
                            </div>
                            <span className="relative z-10 text-[10px] font-semibold">HW</span>
                        </Link>

                        {/* More button */}
                        <div className="relative" ref={moreMenuRef}>
                            <button
                                onClick={() => setShowMoreMenu(!showMoreMenu)}
                                className={`relative flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-2xl transition-all duration-200 min-w-[56px]
                                    ${showMoreMenu
                                        ? ''
                                        : 'text-gray-400 dark:text-gray-500 active:scale-95'
                                    }`}
                            >
                                {showMoreMenu && (
                                    <motion.div
                                        className="absolute inset-0 bg-[#1650EB]/10 dark:bg-[#1650EB]/15 rounded-2xl"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                    />
                                )}
                                <div className="relative z-10">
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 ${
                                        showMoreMenu ? 'bg-[#1650EB] shadow-md shadow-[#1650EB]/25' : ''
                                    }`}>
                                        {showMoreMenu ? (
                                            <X className="w-[18px] h-[18px] text-white" />
                                        ) : (
                                            <MoreHorizontal className="w-[18px] h-[18px] text-gray-400 dark:text-gray-500" />
                                        )}
                                    </div>
                                    {/* Badge dot for pending Q&A */}
                                    {pendingQACount > 0 && !showMoreMenu && (
                                        <span className="absolute -top-1 -right-2 min-w-[14px] h-3.5 px-1 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center shadow-sm">
                                            {pendingQACount > 9 ? '9+' : pendingQACount}
                                        </span>
                                    )}
                                </div>
                                <span className={`relative z-10 text-[10px] font-semibold transition-colors ${
                                    showMoreMenu ? 'text-[#1650EB] dark:text-[#6095DB]' : ''
                                }`}>
                                    More
                                </span>
                            </button>

                            {/* More menu flyout */}
                            <AnimatePresence>
                                {showMoreMenu && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        transition={{ duration: 0.15 }}
                                        className="absolute bottom-full right-0 mb-3 w-52 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/15 border border-gray-200/80 dark:border-gray-800/80 overflow-hidden z-[60]"
                                    >
                                        <div className="p-1.5">
                                            {mobileMoreItems.map((item) => {
                                                const isActive = item.tab ? activeTab === item.tab : false;
                                                if (item.href) {
                                                    return (
                                                        <Link
                                                            key={item.id}
                                                            href={item.href}
                                                            onClick={() => setShowMoreMenu(false)}
                                                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
                                                        >
                                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                                                                item.id === 'homework' ? 'bg-green-50 dark:bg-green-900/20' :
                                                                'bg-gray-100 dark:bg-gray-800'
                                                            }`}>
                                                                <item.icon className={`w-3.5 h-3.5 ${
                                                                    item.id === 'homework' ? 'text-green-500' : 'text-gray-500'
                                                                }`} />
                                                            </div>
                                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.label}</span>
                                                        </Link>
                                                    );
                                                }
                                                return (
                                                    <button
                                                        key={item.id}
                                                        onClick={() => {
                                                            setShowMoreMenu(false);
                                                            handleNavClick(item);
                                                        }}
                                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                                                            isActive
                                                                ? 'bg-[#1650EB]/10 dark:bg-[#1650EB]/15'
                                                                : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'
                                                        }`}
                                                    >
                                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                                                            item.id === 'qa' ? 'bg-orange-50 dark:bg-orange-900/20' :
                                                            item.id === 'fees' ? 'bg-amber-50 dark:bg-amber-900/20' :
                                                            item.id === 'announce' ? 'bg-amber-50 dark:bg-amber-900/20' :
                                                            item.id === 'create-test' ? 'bg-blue-50 dark:bg-blue-900/20' :
                                                            'bg-gray-100 dark:bg-gray-800'
                                                        }`}>
                                                            <item.icon className={`w-3.5 h-3.5 ${
                                                                item.id === 'qa' ? 'text-orange-500' :
                                                                item.id === 'fees' ? 'text-amber-500' :
                                                                item.id === 'announce' ? 'text-amber-500' :
                                                                item.id === 'create-test' ? 'text-[#1650EB]' :
                                                                'text-gray-500'
                                                            }`} />
                                                        </div>
                                                        <span className={`text-sm font-medium ${
                                                            isActive ? 'text-[#1650EB] dark:text-[#6095DB]' : 'text-gray-700 dark:text-gray-300'
                                                        }`}>{item.label}</span>
                                                        {item.badge && item.badge > 0 ? (
                                                            <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400 font-bold">
                                                                {item.badge}
                                                            </span>
                                                        ) : null}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>

            {/* ===== DESKTOP: Sidebar (floating glass) ===== */}
            <aside
                className={`hidden lg:flex flex-col fixed top-0 left-0 bottom-0 z-40
                    ${sidebarWidth} bg-white/60 dark:bg-gray-950/60 backdrop-blur-xl
                    border-r border-gray-200/40 dark:border-gray-800/40
                    transition-all duration-300 ease-in-out`}
            >
                {sidebarContent}
            </aside>

            {/* ===== DESKTOP: Top Bar ===== */}
            <div className="hidden lg:block fixed top-0 right-0 z-50" style={{ left: isCollapsed ? '72px' : '260px', transition: 'left 0.3s ease-in-out' }}>
                <div className="flex items-center justify-end px-6 py-2.5 bg-white/60 dark:bg-gray-950/60 backdrop-blur-xl border-b border-gray-200/40 dark:border-gray-800/40">
                    <div className="flex items-center gap-1.5">
                        {/* Chat — before Home, like earlier */}
                        <Link
                            href="/chat"
                            className="relative p-2.5 rounded-xl bg-gradient-to-r from-[#1650EB]/10 to-[#6095DB]/10 hover:from-[#1650EB]/20 hover:to-[#6095DB]/20 transition-all border border-[#1650EB]/10 dark:border-[#6095DB]/10"
                            title="Chat"
                        >
                            <MessageCircle className="w-4 h-4 text-[#1650EB] dark:text-[#6095DB]" />
                            {totalUnreadChat > 0 && (
                                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-sm">
                                    {totalUnreadChat > 9 ? '9+' : totalUnreadChat}
                                </span>
                            )}
                        </Link>
                        {/* Home */}
                        <Link
                            href="/"
                            className="p-2.5 rounded-xl bg-gray-50/80 dark:bg-gray-800/40 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 border border-gray-200/50 dark:border-gray-700/50"
                            title="Home"
                        >
                            <Home className="w-4 h-4" />
                        </Link>
                        {/* Profile avatar */}
                        <div className="relative" ref={profileRef}>
                            <button
                                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                                className="p-0.5 rounded-full hover:ring-2 hover:ring-[#1650EB]/15 transition-all"
                            >
                                {userPhotoURL ? (
                                    <img src={userPhotoURL} alt={userName} className="w-9 h-9 rounded-full object-cover ring-2 ring-white dark:ring-gray-900 shadow-md" />
                                ) : (
                                    <div className="w-9 h-9 bg-[#1650EB]/10 dark:bg-[#1650EB]/20 rounded-full flex items-center justify-center border border-[#1650EB]/10">
                                        <User className="w-4 h-4 text-[#1650EB] dark:text-[#6095DB]" />
                                    </div>
                                )}
                            </button>
                            <AnimatePresence>
                                {showProfileDropdown && profileDropdownContent}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>

            {/* Spacer for desktop sidebar */}
            <div className={`hidden lg:block flex-shrink-0 ${sidebarWidth} transition-all duration-300`} />
        </>
    );
}
