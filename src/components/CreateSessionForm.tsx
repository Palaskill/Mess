'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSession } from '@/lib/actions';

interface CreateSessionFormProps {
  /** Mode to render trigger: 'fab' (floating action button) or 'button' (inline button) */
  mode?: 'fab' | 'button';
  buttonText?: string;
  showFab?: boolean;
}

const QUICK_SUGGESTIONS = [
  'Friday Drinks 🍻',
  'Happy Hour 🍸',
  'Game Night 🎯',
  'Team Night Out 🍕',
];

export default function CreateSessionForm({
  mode = 'fab',
  buttonText = 'Start First Session',
  showFab = true,
}: CreateSessionFormProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setName('');
      // Slight delay to allow modal render for smooth focus
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleOpen = () => setIsOpen(true);
  const handleClose = () => {
    if (isPending) return;
    setIsOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter a session name');
      return;
    }

    setError(null);

    startTransition(async () => {
      try {
        const newSession = await createSession(trimmed);
        setIsOpen(false);
        router.push(`/session/${newSession.id}`);
      } catch (err: any) {
        console.error('Failed to create session:', err);
        setError(err?.message || 'Could not create session. Please try again.');
      }
    });
  };

  return (
    <>
      {/* Trigger: Either inline button or Floating Action Button */}
      {mode === 'button' ? (
        <button
          type="button"
          onClick={handleOpen}
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold shadow-lg shadow-blue-900/40 transition-all duration-200 min-h-[48px] touch-manipulation active:scale-95"
        >
          <span className="text-lg">✨</span>
          <span>{buttonText}</span>
        </button>
      ) : showFab ? (
        <button
          type="button"
          onClick={handleOpen}
          aria-label="Create new session"
          className="fixed bottom-20 right-4 sm:right-6 z-40 flex items-center gap-2.5 px-5 py-3.5 rounded-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 active:scale-95 text-white font-semibold shadow-xl shadow-blue-900/40 border border-blue-400/30 transition-all duration-200 touch-manipulation min-h-[48px]"
        >
          <span className="text-xl leading-none select-none">✨</span>
          <span className="text-sm tracking-wide">New Session</span>
        </button>
      ) : null}

      {/* Modal / Bottom Sheet */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          <div
            className="w-full max-w-lg bg-slate-900 border-t sm:border border-slate-700/80 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-slide-up pb-[max(1.5rem,env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sheet grab handle for mobile */}
            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-4 sm:hidden" />

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-xl">
                  🍺
                </div>
                <div>
                  <h2
                    id="modal-title"
                    className="text-lg font-bold text-white tracking-tight"
                  >
                    Start New Session
                  </h2>
                  <p className="text-xs text-slate-400">
                    Give this round or outing a name
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                disabled={isPending}
                aria-label="Close dialog"
                className="w-10 h-10 -mr-2 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-5 h-5"
                >
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="session-name"
                  className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2"
                >
                  Session Name
                </label>
                <input
                  ref={inputRef}
                  id="session-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Friday Drinks at Mulligan's"
                  disabled={isPending}
                  maxLength={50}
                  className="w-full px-4 py-3 bg-slate-800/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all min-h-[48px] text-base"
                />
                {error && (
                  <p className="mt-1.5 text-xs text-rose-400 flex items-center gap-1">
                    <span>⚠️</span> {error}
                  </p>
                )}
              </div>

              {/* Quick suggestion chips */}
              <div>
                <span className="text-[11px] font-medium text-slate-400 block mb-2">
                  Quick suggestions:
                </span>
                <div className="flex flex-wrap gap-2">
                  {QUICK_SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      disabled={isPending}
                      onClick={() => setName(suggestion)}
                      className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700/80 active:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700/60 transition-colors min-h-[36px]"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isPending}
                  className="flex-1 py-3 px-4 rounded-xl text-sm font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 active:bg-slate-750 transition-colors min-h-[48px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || !name.trim()}
                  className="flex-1 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none transition-colors min-h-[48px] flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30"
                >
                  {isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create Session</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
