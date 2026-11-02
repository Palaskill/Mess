'use client';

import { useState, useRef, useEffect } from 'react';
import { Globe, Check } from 'lucide-react';
import { useLanguage, Language } from '@/lib/i18n';

interface LanguageToggleProps {
  className?: string;
  variant?: 'segmented' | 'compact';
}

const LANGUAGES: { code: Language; label: string; native: string; flag: string }[] = [
  { code: 'fr', label: 'Français', native: 'FR', flag: '🇫🇷' },
  { code: 'ar', label: 'العربية', native: 'عربي', flag: '🇹🇳' },
  { code: 'en', label: 'English', native: 'EN', flag: '🇬🇧' },
];

export default function LanguageToggle({
  className = '',
  variant = 'compact',
}: LanguageToggleProps) {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (!mounted) {
    return (
      <div className={`h-9 w-20 rounded-2xl bg-slate-800/80 animate-pulse ${className}`} />
    );
  }

  if (variant === 'segmented') {
    return (
      <div
        role="group"
        aria-label="Language Selector"
        className={`inline-flex items-center p-1 rounded-2xl bg-slate-800/80 border border-slate-700/70 backdrop-blur-sm shadow-sm ${className}`}
      >
        {LANGUAGES.map((item) => {
          const isSelected = language === item.code;
          return (
            <button
              key={item.code}
              type="button"
              onClick={() => setLanguage(item.code)}
              aria-pressed={isSelected}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all active:scale-95 touch-manipulation cursor-pointer ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-sm ring-1 ring-white/15'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>{item.native}</span>
            </button>
          );
        })}
      </div>
    );
  }

  const currentLang = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  return (
    <div ref={dropdownRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Sélectionner la langue / Select language"
        className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 active:bg-slate-700 border border-slate-700/70 text-xs font-bold text-slate-200 shadow-sm backdrop-blur-sm active:scale-95 transition-all min-h-[42px] touch-manipulation cursor-pointer"
      >
        <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />
        <span className="tracking-wide">{currentLang.native}</span>
        <span className="text-[10px] text-slate-400 transition-transform duration-200">
          {isOpen ? '▲' : '▼'}
        </span>
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="absolute right-0 ltr:right-0 rtl:left-0 rtl:right-auto mt-1.5 w-36 rounded-2xl bg-slate-900/95 border border-slate-700/80 shadow-2xl backdrop-blur-xl p-1 z-50 animate-slide-up"
        >
          {LANGUAGES.map((item) => {
            const isSelected = language === item.code;
            return (
              <button
                key={item.code}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  setLanguage(item.code);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 touch-manipulation cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>{item.flag}</span>
                  <span>{item.label}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
