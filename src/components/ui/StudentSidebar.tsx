'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
    GraduationCap,
    BookOpen,
    FileText,
    BookMarked,
    Target,
    MessageSquare,
    HelpCircle,
    Bell,
    User,
    LogOut,
    Settings,
    ChevronLeft,
    Home,
} from 'lucide-react';

interface SidebarProps {
    activeTab: 'tests' | 'reports' | 'notes' | 'homework' | 'practice';
    onTabChange: (tab: 'tests' | 'reports' | 'notes' | 'homework' | 'practice') => void;
    userName: string;
    userClass: number;
    userPhotoURL?: string | null;
    notificationCount: number;
    newReportsCount: number;
    unreadNotesCount: number;
    pendingHomeworkCount: number;
    totalUnreadChat: number;
    onNotificationClick: () => void;
    onSignOut: () => void;
    onComingSoon: (feature: string) => void;
    mistakeBucketCount: number;
    streak?: number;
}

interface NavItem {
    id: string;
    label: string;
    shortLabel: string;
    icon: React.ComponentType<{ className?: string }>;
    tab?: 'tests' | 'reports' | 'notes' | 'homework' | 'practice';
    href?: string;
    badge?: number;
    comingSoon?: boolean;
    activeColor: string;
}

export default function StudentSidebar({
    activeTab,
    onTabChange,
    userName,
    userClass,
    userPhotoURL,
    notificationCount,
    newReportsCount,
    unreadNotesCount,
    pendingHomeworkCount,
    totalUnreadChat,
    onNotificationClick,
    onSignOut,
    onComingSoon,
    mistakeBucketCount,
    streak = 0,
}: SidebarProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);

    const studyItems: NavItem[] = [
        {
            id: 'tests',
            label: 'Available Tests',
            shortLabel: 'Tests',
            icon: BookOpen,
            tab: 'tests',
            activeColor: 'bg-[#1650EB]',
        },
        {
            id: 'reports',
            label: 'My Reports',
            shortLabel: 'Reports',
            icon: FileText,
            tab: 'reports',
            badge: newReportsCount,
            activeColor: 'bg-emerald-500',
        },
        {
            id: 'notes',
            label: 'Study Notes',
            shortLabel: 'Notes',
            icon: BookMarked,
            tab: 'notes',
            badge: unreadNotesCount,
            activeColor: 'bg-purple-500',
        },
        {
            id: 'homework',
            label: 'Homework',
            shortLabel: 'HW',
            icon: BookOpen,
            tab: 'homework',
            badge: pendingHomeworkCount,
            activeColor: 'bg-indigo-500',
        },
    ];

    const quickItems: NavItem[] = [
        {
            id: 'chat',
            label: 'Chat',
            shortLabel: 'Chat',
            icon: MessageSquare,
            href: '/chat',
            badge: totalUnreadChat,
            activeColor: 'bg-pink-500',
        },
        {
            id: 'practice',
            label: 'Practice Mode',
            shortLabel: 'Practice',
            icon: Target,
            tab: 'practice',
            badge: mistakeBucketCount,
            activeColor: 'bg-green-500',
        },
        {
            id: 'help',
            label: 'Help Center',
            shortLabel: 'Help',
            icon: HelpCircle,
            comingSoon: true,
            activeColor: 'bg-orange-500',
        },
    ];

    // Profile dropdown state
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);

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

    const handleNavClick = (item: NavItem) => {
        if (item.comingSoon) {
            onComingSoon(item.label);
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
                    relative flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer
                    transition-all duration-200 group
                    ${isActive
                        ? `${item.activeColor} text-white shadow-md`
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-white'
                    }
                `}
            >
                {/* Active indicator bar */}
                {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 -ml-3 w-1 h-6 bg-white rounded-r-full" />
                )}

                <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : ''}`} />

                {!isCollapsed && (
                    <>
                        <span className={`text-sm font-medium truncate ${isActive ? 'text-white' : ''}`}>
                            {item.label}
                        </span>

                        {/* Badge */}
                        {item.badge && item.badge > 0 ? (
                            <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-bold flex-shrink-0
                                ${isActive
                                    ? 'bg-white/25 text-white'
                                    : 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400'
                                }`}>
                                {item.badge}
                            </span>
                        ) : null}

                        {/* Coming soon tag */}
                        {item.comingSoon && (
                            <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-medium flex-shrink-0">
                                Soon
                            </span>
                        )}
                    </>
                )}

                {/* Collapsed badge dot */}
                {isCollapsed && item.badge && item.badge > 0 ? (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                        {item.badge > 9 ? '9+' : item.badge}
                    </span>
                ) : null}
            </div>
        );

        if (item.href && !item.comingSoon) {
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

    // Mobile bottom tab items: Tests, Practice, Notes, Homework (Reports moved to profile dropdown)
    const mobileBottomItems: NavItem[] = [
        studyItems.find(i => i.id === 'tests')!,
        {
            id: 'practice',
            label: 'Practice Mode',
            shortLabel: 'Practice',
            icon: Target,
            tab: 'practice',
            badge: mistakeBucketCount,
            activeColor: 'bg-green-500',
        },
        studyItems.find(i => i.id === 'notes')!,
        studyItems.find(i => i.id === 'homework')!,
    ];

    // Profile dropdown content (reused for mobile & desktop)
    const profileDropdownContent = (
        <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden z-[60]"
        >
            {/* User info */}
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{userName}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">Class {userClass} • Student</p>
            </div>
            <div className="p-1.5">
                {/* My Reports — visible in dropdown (moved from mobile bottom bar) */}
                <button
                    onClick={() => { setShowProfileDropdown(false); onTabChange('reports'); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                >
                    <FileText className="w-4 h-4 text-gray-500 group-hover:text-emerald-600" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">My Reports</span>
                    {newReportsCount > 0 && (
                        <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 font-bold">
                            {newReportsCount}
                        </span>
                    )}
                </button>
                <Link
                    href="/profile"
                    onClick={() => setShowProfileDropdown(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                >
                    <Settings className="w-4 h-4 text-gray-500 group-hover:text-[#1650EB]" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Profile Settings</span>
                </Link>
                <button
                    onClick={() => { setShowProfileDropdown(false); onSignOut(); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors group"
                >
                    <LogOut className="w-4 h-4 text-gray-500 group-hover:text-red-600" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-red-600">Sign Out</span>
                </button>
            </div>
        </motion.div>
    );

    // ===== Desktop sidebar content =====
    const sidebarContent = (
        <div className="flex flex-col h-full">
            {/* Logo Header — no border */}
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-4 py-5`}>
                {!isCollapsed && (
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-[#1650EB] to-[#3b7dd8] rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <GraduationCap className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="font-bold text-gray-900 dark:text-white text-base">Quizy</h1>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500">Student Dashboard</p>
                        </div>
                    </div>
                )}

                {isCollapsed && (
                    <div className="w-9 h-9 bg-gradient-to-br from-[#1650EB] to-[#3b7dd8] rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <GraduationCap className="w-5 h-5 text-white" />
                    </div>
                )}

                {/* Collapse button */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400"
                    title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
                {/* Study Section */}
                <div>
                    {!isCollapsed && (
                        <p className="px-3 mb-2 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                            Study
                        </p>
                    )}
                    <div className="space-y-1">
                        {studyItems.map((item) =>
                            renderNavItem(item, activeTab === item.tab)
                        )}
                    </div>
                </div>

                {/* Quick Actions Section */}
                <div>
                    {!isCollapsed && (
                        <p className="px-3 mb-2 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                            Quick Actions
                        </p>
                    )}
                    <div className="space-y-1">
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
            {/* ===== MOBILE: Top Bar (no hamburger) ===== */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-gray-50/95 dark:bg-gray-950/95 backdrop-blur-xl">
                <div className="flex items-center justify-between px-4 py-2.5">
                    {/* Logo */}
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-[#1650EB] to-[#3b7dd8] rounded-lg flex items-center justify-center">
                            <GraduationCap className="w-4 h-4 text-white" />
                        </div>
                        <h1 className="font-bold text-gray-900 dark:text-white text-sm">Quizy</h1>
                        {streak > 0 && (
                            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded-full">🔥{streak}</span>
                        )}
                    </div>

                    {/* Right icons: Chat, Home, Notification, Profile */}
                    <div className="flex items-center gap-0.5">
                        {/* Chat - blue outline bubble */}
                        <Link
                            href="/chat"
                            className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            title="Chat"
                        >
                            <MessageSquare className="w-5 h-5 text-[#1650EB] dark:text-[#6095DB] fill-none stroke-[2.5]" />
                            {totalUnreadChat > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                    {totalUnreadChat > 99 ? '99+' : totalUnreadChat}
                                </span>
                            )}
                        </Link>
                        {/* Home */}
                        <Link
                            href="/"
                            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            title="Home"
                        >
                            <Home className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        </Link>
                        {/* Notification */}
                        <button
                            onClick={onNotificationClick}
                            className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            {notificationCount > 0 && (
                                <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
                                    {notificationCount > 9 ? '9+' : notificationCount}
                                </span>
                            )}
                        </button>
                        {/* Profile avatar */}
                        <div className="relative" ref={profileRef}>
                            <button
                                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                                className="p-0.5 rounded-full hover:ring-2 hover:ring-[#1650EB]/30 transition-all"
                            >
                                {userPhotoURL ? (
                                    <img src={userPhotoURL} alt={userName} className="w-8 h-8 rounded-full object-cover" />
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

            {/* ===== MOBILE: Bottom Tab Bar (native app feel) ===== */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-gray-50/95 dark:bg-gray-950/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
                <div className="flex items-center justify-around px-2 pt-1.5 pb-2">
                    {mobileBottomItems.map((item) => {
                        const isActive = activeTab === item.tab;
                        return (
                            <button
                                key={item.id}
                                onClick={() => item.tab && onTabChange(item.tab)}
                                className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-[60px]
                                    ${isActive
                                        ? 'text-[#1650EB] dark:text-[#6095DB]'
                                        : 'text-gray-400 dark:text-gray-500'
                                    }`}
                            >
                                {/* Active pill indicator */}
                                {isActive && (
                                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-8 h-1 bg-[#1650EB] dark:bg-[#6095DB] rounded-full" />
                                )}
                                <div className="relative">
                                    <item.icon className={`w-5 h-5 ${isActive ? 'text-[#1650EB] dark:text-[#6095DB]' : ''}`} />
                                    {/* Badge */}
                                    {item.badge && item.badge > 0 ? (
                                        <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                                            {item.badge > 9 ? '9+' : item.badge}
                                        </span>
                                    ) : null}
                                </div>
                                <span className={`text-[10px] font-medium ${isActive ? 'font-semibold' : ''}`}>
                                    {item.shortLabel}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ===== DESKTOP: Sidebar (no border lines) ===== */}
            <aside
                className={`hidden lg:flex flex-col fixed top-0 left-0 bottom-0 z-40
                    ${sidebarWidth} bg-gray-50 dark:bg-gray-950
                    transition-all duration-300 ease-in-out`}
            >
                {sidebarContent}
            </aside>

            {/* ===== DESKTOP: Top Bar (no border lines) ===== */}
            <div className="hidden lg:block fixed top-0 right-0 z-50" style={{ left: isCollapsed ? '72px' : '260px', transition: 'left 0.3s ease-in-out' }}>
                <div className="flex items-center justify-end px-6 py-2.5 bg-gray-50 dark:bg-gray-950">
                    <div className="flex items-center gap-1.5">
                        {/* Streak badge */}
                        {streak > 0 && (
                            <span className="flex items-center gap-1 text-sm font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2.5 py-1 rounded-xl mr-1">
                                🔥 {streak} day{streak > 1 ? 's' : ''}
                            </span>
                        )}
                        {/* Home */}
                        <Link
                            href="/"
                            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            title="Home"
                        >
                            <Home className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        </Link>
                        {/* Notification */}
                        <button
                            onClick={onNotificationClick}
                            className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            {notificationCount > 0 && (
                                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
                                    {notificationCount > 9 ? '9+' : notificationCount}
                                </span>
                            )}
                        </button>
                        {/* Profile avatar only */}
                        <div className="relative" ref={profileRef}>
                            <button
                                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                                className="p-1 rounded-full hover:ring-2 hover:ring-[#1650EB]/30 transition-all"
                            >
                                {userPhotoURL ? (
                                    <img src={userPhotoURL} alt={userName} className="w-9 h-9 rounded-full object-cover" />
                                ) : (
                                    <div className="w-9 h-9 bg-[#1650EB]/10 dark:bg-indigo-900/50 rounded-full flex items-center justify-center">
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

            {/* Spacer for desktop sidebar (pushes content right) */}
            <div className={`hidden lg:block flex-shrink-0 ${sidebarWidth} transition-all duration-300`} />
        </>
    );
}
