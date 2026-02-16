'use client';

/**
 * Theme Context Provider
 * Manages light/dark theme state across the application
 */

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
    theme: Theme;
    resolvedTheme: 'light' | 'dark';
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Get system preference
const getSystemTheme = (): 'light' | 'dark' => {
    if (typeof window !== 'undefined') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
};

// Apply theme class to document (pure DOM side effect, no setState)
const applyThemeToDOM = (newResolvedTheme: 'light' | 'dark') => {
    if (typeof document !== 'undefined') {
        const root = document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(newResolvedTheme);
        root.style.colorScheme = newResolvedTheme;
    }
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>('system');
    const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
    const mountedRef = useRef(false);
    const [mounted, setMounted] = useState(false);

    // Initialize on mount - read from localStorage and apply
    useEffect(() => {
        mountedRef.current = true;
        setMounted(true);

        const stored = localStorage.getItem('quizy-theme') as Theme | null;
        const initialTheme = stored || 'system';
        const resolved = initialTheme === 'system' ? getSystemTheme() : initialTheme;

        setThemeState(initialTheme);
        setResolvedTheme(resolved);
        applyThemeToDOM(resolved);
    }, []);

    // Apply theme when it changes (after mount)
    useEffect(() => {
        if (!mountedRef.current) return;

        const resolved = theme === 'system' ? getSystemTheme() : theme;
        setResolvedTheme(resolved);
        applyThemeToDOM(resolved);
        localStorage.setItem('quizy-theme', theme);
    }, [theme]);

    // Listen for system theme changes
    useEffect(() => {
        if (!mountedRef.current) return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const handleChange = () => {
            if (theme === 'system') {
                const resolved = getSystemTheme();
                setResolvedTheme(resolved);
                applyThemeToDOM(resolved);
            }
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [theme]);

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
    };

    // Prevent flash of wrong theme
    if (!mounted) {
        return (
            <ThemeContext.Provider value={{ theme: 'system', resolvedTheme: 'light', setTheme }}>
                {children}
            </ThemeContext.Provider>
        );
    }

    return (
        <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme(): ThemeContextType {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
