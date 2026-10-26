import { Beer, Sparkles } from 'lucide-react';
import { getSessions } from '@/lib/actions';
import SessionsList from '@/components/SessionsList';
import CreateSessionForm from '@/components/CreateSessionForm';
import ThemeToggle from '@/components/ThemeToggle';
import ShinyText from '@/components/reactbits/ShinyText';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const sessions = await getSessions();
  const openSessionsCount = sessions.filter((s) => s.status === 'open').length;

  return (
    <div className="min-h-full pb-32">
      <div className="max-w-xl mx-auto px-4 pt-6 sm:pt-8">
        {/* Header */}
        <header className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-md">
                <Beer className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                  MEss
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                  Partage d&apos;addition & sessions de table entre amis
                </p>
              </div>
            </div>

            <ThemeToggle />
          </div>

          {/* Quick stats pills */}
          {sessions.length > 0 && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-800 text-xs">
              <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 font-medium border border-slate-700/60">
                {sessions.length} {sessions.length === 1 ? 'Session' : 'Sessions'} total
              </span>
              {openSessionsCount > 0 && (
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-medium border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <ShinyText text={`${openSessionsCount} Active now`} className="text-emerald-300 font-bold" />
                </span>
              )}
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
                  Aucune session active
                </h2>
                <p className="text-slate-400 text-xs sm:text-sm max-w-sm mx-auto mt-1 leading-relaxed">
                  Une sortie au bar, café ou restaurant ? Ouvrez une session pour enregistrer l&apos;addition et la partager sans calcul manuel.
                </p>
              </div>

              {/* 3 Pillars */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left pt-2">
                <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-700/60 space-y-1">
                  <span className="text-lg">📸</span>
                  <h4 className="text-xs font-bold text-white">Scan OCR</h4>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Prenez le ticket en photo, les prix en DT sont importés par IA.
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-700/60 space-y-1">
                  <span className="text-lg">👥</span>
                  <h4 className="text-xs font-bold text-white">Affectation</h4>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Attribuez chaque consommation ou divisez les plats partagés.
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-700/60 space-y-1">
                  <span className="text-lg">🧾</span>
                  <h4 className="text-xs font-bold text-white">Partage net</h4>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Calcul exact au millime près avec pourboire équitable.
                  </p>
                </div>
              </div>

              <div className="flex justify-center pt-2">
                <CreateSessionForm
                  mode="button"
                  buttonText="Créer une session"
                  showFab={false}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Sessions récentes
                </h2>
                <span className="text-xs text-slate-500 font-medium">
                  Touchez pour ouvrir
                </span>
              </div>

              <SessionsList sessions={sessions} />
            </div>
          )}
        </section>
      </div>

      {/* Persistent Floating Action Button */}
      <CreateSessionForm showFab={true} />
    </div>
  );
}
