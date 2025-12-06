'use client';

/**
 * Theme Context Provider
 * Manages light/dark theme state across the application
 */

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
    theme: Theme;
    resolvedTheme: 'light' | 'dark';
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>('system');
    const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
    const [mounted, setMounted] = useState(false);

    // Get system preference
    const getSystemTheme = (): 'light' | 'dark' => {
        if (typeof window !== 'undefined') {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return 'light';
    };

    // Apply theme to document
    const applyTheme = (newResolvedTheme: 'light' | 'dark') => {
        if (typeof document !== 'undefined') {
            const root = document.documentElement;

            // Remove both classes first
            root.classList.remove('light', 'dark');

            // Add the new theme class
            root.classList.add(newResolvedTheme);

            // Also set color-scheme for native elements
            root.style.colorScheme = newResolvedTheme;

            setResolvedTheme(newResolvedTheme);
        }
    };

    // Initialize on mount
    useEffect(() => {
        setMounted(true);

        // Get stored theme or default to system
        const stored = localStorage.getItem('quizy-theme') as Theme | null;
        const initialTheme = stored || 'system';
        setThemeState(initialTheme);

        // Apply immediately
        const resolved = initialTheme === 'system' ? getSystemTheme() : initialTheme;
        applyTheme(resolved);
    }, []);

    // Apply theme when it changes
    useEffect(() => {
        if (!mounted) return;

        const resolved = theme === 'system' ? getSystemTheme() : theme;
        applyTheme(resolved);
        localStorage.setItem('quizy-theme', theme);
    }, [theme, mounted]);

    // Listen for system theme changes
    useEffect(() => {
        if (!mounted) return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const handleChange = () => {
            if (theme === 'system') {
                applyTheme(getSystemTheme());
            }
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [theme, mounted]);

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
