'use client';

import { useState } from 'react';
import { Beer, Search, Sparkles } from 'lucide-react';
import { Session } from '@/types';
import SessionsList from '@/components/SessionsList';
import CreateSessionForm from '@/components/CreateSessionForm';
import ThemeToggle from '@/components/ThemeToggle';
import LanguageToggle from '@/components/LanguageToggle';
import ShinyText from '@/components/reactbits/ShinyText';
import { useLanguage } from '@/lib/i18n';

interface HomeViewProps {
  sessions: (Session & { participant_count?: number })[];
  openSessionsCount: number;
}

export default function HomeView({ sessions, openSessionsCount }: HomeViewProps) {
  const { t, language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSessions = sessions.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <div className="min-h-full pb-32">
      <div className="max-w-xl mx-auto px-4 pt-6 sm:pt-8">
        {/* Header */}
        <header className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-md shrink-0">
                <Beer className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                  MEss
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                  {t.home.subtitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <LanguageToggle variant="compact" />
              <ThemeToggle variant="compact" />
            </div>
          </div>

          {/* Quick stats pills */}
          {sessions.length > 0 && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-800 text-xs flex-wrap">
              <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 font-medium border border-slate-700/60 tabular-nums">
                <strong className="text-white">{sessions.length}</strong> {t.home.totalSessions}
              </span>
              {openSessionsCount > 0 && (
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-medium border border-emerald-500/30 flex items-center gap-1.5 tabular-nums">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <ShinyText
                    text={`${openSessionsCount} ${t.home.activeNow}`}
                    className="text-emerald-300 font-bold"
                  />
                </span>
              )}
            </div>
          )}

          {/* Search bar when multiple sessions exist */}
          {sessions.length > 2 && (
            <div className="relative mt-4">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 rtl:left-auto rtl:right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === 'ar' ? 'بحث عن جلسة...' : language === 'en' ? 'Search sessions...' : 'Rechercher une session...'}
                className="w-full pl-10 pr-4 rtl:pl-4 rtl:pr-10 py-2.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500 transition-all min-h-[42px]"
              />
            </div>
          )}
        </header>

        {/* Sessions List or Empty State */}
        <section aria-label="Bar Sessions">
          {sessions.length === 0 ? (
            <div className="rounded-3xl bg-slate-800/80 border border-slate-700/80 p-6 sm:p-8 text-center shadow-xl space-y-6">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-3xl shadow-inner">
                🍻
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {t.home.emptyTitle}
                </h2>
                <p className="text-slate-400 text-xs sm:text-sm max-w-sm mx-auto mt-1 leading-relaxed">
                  {t.home.emptyDesc}
                </p>
              </div>

              {/* 3 Pillars */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-start pt-2">
                <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-700/60 space-y-1">
                  <span className="text-lg">📸</span>
                  <h4 className="text-xs font-bold text-white">{t.home.scanOcr}</h4>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    {t.home.scanOcrDesc}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-700/60 space-y-1">
                  <span className="text-lg">👥</span>
                  <h4 className="text-xs font-bold text-white">{t.home.assignPillar}</h4>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    {t.home.assignPillarDesc}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-700/60 space-y-1">
                  <span className="text-lg">🧾</span>
                  <h4 className="text-xs font-bold text-white">{t.home.splitPillar}</h4>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    {t.home.splitPillarDesc}
                  </p>
                </div>
              </div>

              <div className="flex justify-center pt-2">
                <CreateSessionForm
                  mode="button"
                  buttonText={t.home.startFirstSession}
                  showFab={false}
                />
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                  {t.home.recentSessions}
                </h2>
                <span className="text-xs text-slate-400">
                  {t.home.tapToView}
                </span>
              </div>
              <SessionsList sessions={filteredSessions} />
            </div>
          )}
        </section>

        {/* Floating Action Button for quick session creation */}
        {sessions.length > 0 && <CreateSessionForm mode="fab" />}
      </div>
    </div>
  );
}
