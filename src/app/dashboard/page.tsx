'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import MotivationalLoader from '@/components/ui/MotivationalLoader';

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
            <MotivationalLoader subtitle="Redirecting to your dashboard..." />
        </div>
    );
}
