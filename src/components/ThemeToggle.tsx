'use client';

import { useState, useEffect } from 'react';

type ThemeMode = 'light' | 'dark' | 'auto';

interface ThemeToggleProps {
  className?: string;
  variant?: 'segmented' | 'compact';
}

export default function ThemeToggle({
  className = '',
  variant = 'segmented',
}: ThemeToggleProps) {
  const [theme, setTheme] = useState<ThemeMode>('auto');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = (localStorage.getItem('mess-theme') as ThemeMode) || 'auto';
    setTheme(saved);
    applyTheme(saved);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = () => {
      const current = (localStorage.getItem('mess-theme') as ThemeMode) || 'auto';
      if (current === 'auto') {
        applyTheme('auto');
      }
    };

    mediaQuery.addEventListener('change', handleMediaChange);
    return () => mediaQuery.removeEventListener('change', handleMediaChange);
  }, []);

  const applyTheme = (mode: ThemeMode) => {
    const root = document.documentElement;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = mode === 'dark' || (mode === 'auto' && systemPrefersDark);

    if (isDark) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  };

  const handleSelectTheme = (mode: ThemeMode) => {
    setTheme(mode);
    localStorage.setItem('mess-theme', mode);
    applyTheme(mode);
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className={`h-8 w-24 bg-slate-800/40 rounded-xl animate-pulse ${className}`} />
    );
  }

  if (variant === 'compact') {
    // Single tap-to-cycle button
    const cycleNext = () => {
      const next: ThemeMode = theme === 'auto' ? 'dark' : theme === 'dark' ? 'light' : 'auto';
      handleSelectTheme(next);
    };

    const icon = theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '📱';
    const label = theme === 'dark' ? 'Dark' : theme === 'light' ? 'Light' : 'Auto';

    return (
      <button
        type="button"
        onClick={cycleNext}
        title={`Current theme: ${label}. Tap to change.`}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-700/60 bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-all active:scale-95 ${className}`}
      >
        <span className="text-sm leading-none">{icon}</span>
        <span className="text-[11px] capitalize">{label}</span>
      </button>
    );
  }

  // Segmented 3-option toggle
  return (
    <div
      role="radiogroup"
      aria-label="Theme mode selector"
      className={`inline-flex items-center p-1 rounded-xl bg-slate-800/80 border border-slate-700/70 backdrop-blur-sm ${className}`}
    >
      <button
        type="button"
        role="radio"
        aria-checked={theme === 'light'}
        onClick={() => handleSelectTheme('light')}
        title="Light theme"
        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all min-h-[30px] touch-manipulation ${
          theme === 'light'
            ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 shadow-sm'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <span className="text-xs">☀️</span>
        <span className="hidden sm:inline text-[11px]">Light</span>
      </button>

      <button
        type="button"
        role="radio"
        aria-checked={theme === 'dark'}
        onClick={() => handleSelectTheme('dark')}
        title="Dark theme"
        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all min-h-[30px] touch-manipulation ${
          theme === 'dark'
            ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40 shadow-sm'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <span className="text-xs">🌙</span>
        <span className="hidden sm:inline text-[11px]">Dark</span>
      </button>

      <button
        type="button"
        role="radio"
        aria-checked={theme === 'auto'}
        onClick={() => handleSelectTheme('auto')}
        title="Auto theme (matches phone/system)"
        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all min-h-[30px] touch-manipulation ${
          theme === 'auto'
            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <span className="text-xs">⚙️</span>
        <span className="hidden sm:inline text-[11px]">Auto</span>
      </button>
    </div>
  );
}
