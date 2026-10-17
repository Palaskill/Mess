import { getSessions } from '@/lib/actions';
import SessionCard from '@/components/SessionCard';
import CreateSessionForm from '@/components/CreateSessionForm';
import ThemeToggle from '@/components/ThemeToggle';

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
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400/20 to-blue-500/20 border border-amber-500/30 flex items-center justify-center text-2xl shadow-inner">
                🍺
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                  MEss
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 tracking-normal">
                    v1.0
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                  Split bar tabs with friends without the headache
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
                  {openSessionsCount} Active now
                </span>
              )}
            </div>
          )}
        </header>

        {/* Sessions List or Empty State */}
        <section aria-label="Bar Sessions">
          {sessions.length === 0 ? (
            <div className="rounded-3xl bg-slate-800/50 border border-slate-800 p-8 sm:p-12 text-center shadow-xl">
              <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-slate-800 border border-slate-700 flex items-center justify-center text-4xl shadow-inner animate-bounce">
                🍻
              </div>
              <h2 className="text-xl font-bold text-white mb-2 tracking-tight">
                No bar sessions yet
              </h2>
              <p className="text-slate-400 text-sm max-w-sm mx-auto mb-6 leading-relaxed">
                Starting a night out or table tab? Create your first session to track drinks, assign orders, and split fairly.
              </p>

              <div className="flex justify-center">
                <CreateSessionForm
                  mode="button"
                  buttonText="Start First Session"
                  showFab={false}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Recent Sessions
                </h2>
                <span className="text-xs text-slate-500 font-medium">
                  Tap card to view
                </span>
              </div>

              {sessions.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Persistent Floating Action Button */}
      <CreateSessionForm showFab={true} />
    </div>
  );
}
