'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function DashboardPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push('/auth/login');
            } else if (user.role === 'teacher') {
                router.push('/dashboard/teacher');
            } else {
                router.push('/dashboard/student');
            }
        }
    }, [user, loading, router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
            <div className="text-center">
                <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">Loading your dashboard...</p>
            </div>
        </div>
    );
}
