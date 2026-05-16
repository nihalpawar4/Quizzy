/**
 * Route Persistence Hook
 * Saves the current route to localStorage so the app can resume from the last page
 */

const ROUTE_KEY = 'quizy-last-route';

// Routes that should be saved (dashboard sub-pages, profile, chat, etc.)
const PERSISTABLE_ROUTES = [
    '/dashboard/student',
    '/dashboard/teacher',
    '/dashboard/teacher/homework',
    '/dashboard/student/homework',
    '/profile',
    '/chat',
    '/teacher/weekly-reports',
];

/**
 * Save the current route to localStorage
 */
export function saveLastRoute(pathname: string): void {
    if (typeof window === 'undefined') return;

    // Only save routes that make sense to return to
    const shouldSave = PERSISTABLE_ROUTES.some(route => pathname.startsWith(route));
    if (shouldSave) {
        try {
            localStorage.setItem(ROUTE_KEY, pathname);
        } catch {
            // Silent fail
        }
    }
}

/**
 * Get the last saved route
 */
export function getLastRoute(): string | null {
    if (typeof window === 'undefined') return null;

    try {
        return localStorage.getItem(ROUTE_KEY);
    } catch {
        return null;
    }
}

/**
 * Clear the saved route (on logout)
 */
export function clearLastRoute(): void {
    if (typeof window === 'undefined') return;

    try {
        localStorage.removeItem(ROUTE_KEY);
    } catch {
        // Silent fail
    }
}
