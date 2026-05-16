'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getLastRoute } from '@/lib/routePersistence';
import MotivationalLoader from '@/components/ui/MotivationalLoader';

export default function DashboardPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push('/auth/login');
            } else {
                // Check if there's a saved route to resume from
                const lastRoute = getLastRoute();
                if (lastRoute) {
                    // Validate the route matches the user's role
                    const isTeacher = user.role === 'teacher';
                    const isValidRoute = isTeacher
                        ? lastRoute.startsWith('/dashboard/teacher') || lastRoute === '/profile' || lastRoute === '/chat' || lastRoute.startsWith('/teacher/')
                        : lastRoute.startsWith('/dashboard/student') || lastRoute === '/profile' || lastRoute === '/chat';

                    if (isValidRoute) {
                        router.push(lastRoute);
                        return;
                    }
                }

                // Default: go to role-based dashboard
                if (user.role === 'teacher') {
                    router.push('/dashboard/teacher');
                } else {
                    router.push('/dashboard/student');
                }
            }
        }
    }, [user, loading, router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
            <MotivationalLoader subtitle="Redirecting to your dashboard..." />
        </div>
    );
}
