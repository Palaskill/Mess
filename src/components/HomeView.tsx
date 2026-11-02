'use client';

import { useState } from 'react';
import { Beer, Search, ScanLine, Users, ReceiptText } from 'lucide-react';
import { Session } from '@/types';
import SessionsList from '@/components/SessionsList';
import CreateSessionForm from '@/components/CreateSessionForm';
import ThemeToggle from '@/components/ThemeToggle';
import LanguageToggle from '@/components/LanguageToggle';

import { useLanguage } from '@/lib/i18n';

interface HomeViewProps {
  sessions: (Session & { participant_count?: number })[];
  openSessionsCount: number;
}

export default function HomeView({ sessions, openSessionsCount }: HomeViewProps) {
  const { t, language } = useLanguage();
  const copy = language === 'ar' ? { title: 'لحظات جميلة، حساب واضح.', intro: 'اجمع أصدقاءك، سجّل الطلبات وتقاسم الفاتورة بسهولة.', empty: 'لا توجد جلسات مطابقة', clear: 'مسح البحث' } : language === 'en' ? { title: 'Good company. Clear tabs.', intro: 'Bring your friends, track the orders, and split the bill with ease.', empty: 'No matching sessions', clear: 'Clear search' } : { title: 'Les bons moments. Les comptes clairs.', intro: 'Réunissez vos amis, notez les commandes et partagez l’addition simplement.', empty: 'Aucune session ne correspond', clear: 'Effacer la recherche' };
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSessions = sessions.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <div className="min-h-full pb-32">
      <div className="max-w-5xl mx-auto px-4 sm:px-8 pt-6 sm:pt-10">
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

          <div className="home-hero mt-8 rounded-3xl p-6 sm:p-10 relative overflow-hidden">
            <div className="relative z-10 max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400 mb-4">MEss · {t.home.subtitle}</p>
              <h2 className="text-3xl sm:text-5xl font-bold tracking-tight leading-tight">{copy.title}</h2>
              <p className="text-sm sm:text-base text-slate-300 mt-4 max-w-lg leading-relaxed">{copy.intro}</p>
              <div className="mt-6"><CreateSessionForm mode="button" buttonText={t.home.startFirstSession} showFab={false} /></div>
            </div>
          </div>
          {sessions.length > 0 && (
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="summary-tile"><span className="text-sm text-slate-400">{t.home.totalSessions}</span><strong className="block text-3xl tabular-nums mt-2">{sessions.length}</strong></div>
              <div className="summary-tile"><span className="text-sm text-slate-400">{t.home.activeNow}</span><strong className="block text-3xl text-emerald-400 tabular-nums mt-2">{openSessionsCount}</strong></div>
            </div>
          )}

          {/* Search bar when multiple sessions exist */}
          {sessions.length > 2 && (
            <div className="relative mt-4">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 rtl:left-auto rtl:right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                aria-label={language === 'ar' ? 'بحث عن جلسة' : language === 'en' ? 'Search sessions' : 'Rechercher une session'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === 'ar' ? 'بحث عن جلسة...' : language === 'en' ? 'Search sessions...' : 'Rechercher une session...'}
                className="w-full pl-10 pr-4 rtl:pl-4 rtl:pr-10 py-2.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500 transition-all min-h-[48px]"
              />
            </div>
          )}
        </header>

        {/* Sessions List or Empty State */}
        <section aria-label="Bar Sessions">
          {sessions.length === 0 ? (
            <div className="rounded-3xl bg-slate-800/80 border border-slate-700/80 p-6 sm:p-8 text-center shadow-xl space-y-6">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-3xl shadow-inner">
                <Beer aria-hidden="true" className="w-8 h-8" />
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
                  <ScanLine aria-hidden="true" className="w-6 h-6 text-amber-400" />
                  <h4 className="text-xs font-bold text-white">{t.home.scanOcr}</h4>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    {t.home.scanOcrDesc}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-700/60 space-y-1">
                  <Users aria-hidden="true" className="w-6 h-6 text-blue-400" />
                  <h4 className="text-xs font-bold text-white">{t.home.assignPillar}</h4>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    {t.home.assignPillarDesc}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-700/60 space-y-1">
                  <ReceiptText aria-hidden="true" className="w-6 h-6 text-emerald-400" />
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
              {filteredSessions.length ? <SessionsList sessions={filteredSessions} /> : <div className="summary-tile text-center py-10" role="status"><Search aria-hidden="true" className="w-8 h-8 mx-auto mb-4 text-slate-400" /><p>{copy.empty}</p><button type="button" className="mt-4 text-blue-400 underline" onClick={() => setSearchQuery('')}>{copy.clear}</button></div>}
            </div>
          )}
        </section>

        {/* Floating Action Button for quick session creation */}

      </div>
    </div>
  );
}
