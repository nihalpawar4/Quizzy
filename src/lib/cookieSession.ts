// Cookie-based Session Helper for Quizy PWA
// By Nihal Pawar
// Helps maintain "remember me" functionality across app restarts

const COOKIE_NAME = 'quizy_user_session';
const COOKIE_DAYS = 30; // Cookie expires in 30 days

interface SessionCookie {
    email: string;
    name: string;
    uid: string;
    role: 'student' | 'teacher';
    timestamp: number;
}

// Set a cookie with expiration
function setCookie(name: string, value: string, days: number): void {
    if (typeof document === 'undefined') return;

    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);

    // Set cookie with secure flags
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
    console.log('[Quizy Cookie] Session cookie saved');
}

// Get a cookie by name
function getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;

    const nameEQ = `${name}=`;
    const cookies = document.cookie.split(';');

    for (let i = 0; i < cookies.length; i++) {
        let cookie = cookies[i].trim();
        if (cookie.indexOf(nameEQ) === 0) {
            return decodeURIComponent(cookie.substring(nameEQ.length));
        }
    }
    return null;
}

// Delete a cookie
function deleteCookie(name: string): void {
    if (typeof document === 'undefined') return;

    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    console.log('[Quizy Cookie] Session cookie deleted');
}

// Save user session to cookie
export function saveUserSessionCookie(user: {
    email: string;
    name: string;
    uid: string;
    role: 'student' | 'teacher';
}): void {
    const sessionData: SessionCookie = {
        email: user.email,
        name: user.name,
        uid: user.uid,
        role: user.role,
        timestamp: Date.now()
    };

    setCookie(COOKIE_NAME, JSON.stringify(sessionData), COOKIE_DAYS);
}

// Get user session from cookie
export function getUserSessionCookie(): SessionCookie | null {
    const cookieValue = getCookie(COOKIE_NAME);
    if (!cookieValue) return null;

    try {
        const sessionData: SessionCookie = JSON.parse(cookieValue);

        // Check if cookie is still valid (within 30 days)
        const daysSinceCreated = (Date.now() - sessionData.timestamp) / (1000 * 60 * 60 * 24);
        if (daysSinceCreated > COOKIE_DAYS) {
            console.log('[Quizy Cookie] Session cookie expired');
            deleteUserSessionCookie();
            return null;
        }

        console.log('[Quizy Cookie] Session cookie found for:', sessionData.email);
        return sessionData;
    } catch (e) {
        console.warn('[Quizy Cookie] Failed to parse session cookie:', e);
        deleteUserSessionCookie();
        return null;
    }
}

// Delete user session cookie (on logout)
export function deleteUserSessionCookie(): void {
    deleteCookie(COOKIE_NAME);
}

// Check if we have a remembered user
export function hasRememberedUser(): boolean {
    return getUserSessionCookie() !== null;
}
