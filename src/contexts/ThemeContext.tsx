'use client';

/**
 * Theme Context Provider
 * Manages light/dark theme state across the application
 */

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

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
    const mountedRef = useRef(false);
    const [mounted, setMounted] = useState(false);

    // Initialize theme from localStorage (lazy initializer avoids setState-in-effect)
    const [theme, setThemeState] = useState<Theme>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('quizy-theme') as Theme | null) || 'system';
        }
        return 'system';
    });

    // Version counter to force useMemo recomputation on system theme change
    const [systemThemeVersion, setSystemThemeVersion] = useState(0);

    // Derive resolved theme from theme state (avoids extra setState-in-effect)
    const resolvedTheme = useMemo<'light' | 'dark'>(() => {
        void systemThemeVersion; // Used as dependency to trigger recomputation
        if (typeof window === 'undefined') return 'light';
        return theme === 'system' ? getSystemTheme() : theme;
    }, [theme, systemThemeVersion]);

    // Mark mounted and apply DOM theme on mount
    useEffect(() => {
        mountedRef.current = true;
        setMounted(true);
        applyThemeToDOM(resolvedTheme);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Apply theme when it changes (after mount)
    useEffect(() => {
        if (!mountedRef.current) return;
        applyThemeToDOM(resolvedTheme);
        localStorage.setItem('quizy-theme', theme);
    }, [theme, resolvedTheme]);

    // Listen for system theme changes
    useEffect(() => {
        if (!mountedRef.current) return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const handleChange = () => {
            if (theme === 'system') {
                // Increment version to force useMemo recomputation
                setSystemThemeVersion(v => v + 1);
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
