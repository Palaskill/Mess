'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Sparkles, Plus, X, Beer, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
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

export const REGULAR_FRIENDS = [
  { name: 'Firas', color: '#3B82F6' },
  { name: 'Dhia', color: '#10B981' },
  { name: 'Fahd', color: '#8B5CF6' },
  { name: 'Khalil', color: '#F59E0B' },
];

export default function CreateSessionForm({
  mode = 'fab',
  buttonText = 'Start First Session',
  showFab = true,
}: CreateSessionFormProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([
    'Firas',
    'Dhia',
    'Fahd',
    'Khalil',
  ]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll on iPhone / mobile when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setName('');
      setPassword('');
      setShowPassword(false);
      setSelectedFriends(REGULAR_FRIENDS.map((f) => f.name));
      // Slight delay to allow modal render for smooth focus
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const toggleFriend = (friendName: string) => {
    setSelectedFriends((prev) =>
      prev.includes(friendName)
        ? prev.filter((n) => n !== friendName)
        : [...prev, friendName]
    );
  };

  const selectAllFriends = () => {
    setSelectedFriends(REGULAR_FRIENDS.map((f) => f.name));
  };

  const clearAllFriends = () => {
    setSelectedFriends([]);
  };

  const handleOpen = () => setIsOpen(true);
  const handleClose = () => {
    if (isPending) return;
    setIsOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Veuillez entrer un nom pour la session');
      return;
    }

    const trimmedPassword = password.trim();
    if (!trimmedPassword) {
      setError('Veuillez définir un mot de passe pour verrouiller les modifications');
      return;
    }

    if (trimmedPassword.length < 2) {
      setError('Le mot de passe doit comporter au moins 2 caractères');
      return;
    }

    setError(null);

    startTransition(async () => {
      try {
        const initialParticipants = REGULAR_FRIENDS.filter((f) =>
          selectedFriends.includes(f.name)
        );
        const newSession = await createSession(trimmed, initialParticipants, trimmedPassword);
        
        // Save creator auth key to localStorage immediately
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(`mess_auth_${newSession.id}`, trimmedPassword);
          } catch (e) {
            console.error('Failed to save session key in localStorage', e);
          }
        }

        setIsOpen(false);
        router.push(`/session/${newSession.id}`);
      } catch (err: any) {
        console.error('Failed to create session:', err);
        setError(err?.message || 'Impossible de créer la session. Veuillez réessayer.');
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
          className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 sm:right-6 z-40 flex items-center gap-2 px-5 py-3.5 rounded-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 active:scale-95 text-white font-bold shadow-xl shadow-blue-900/40 border border-blue-400/30 transition-all duration-200 touch-manipulation min-h-[50px] cursor-pointer"
        >
          <Sparkles className="w-5 h-5 text-amber-300 animate-spin-slow shrink-0" />
          <span className="text-sm tracking-wide">New Session</span>
        </button>
      ) : null}

      {/* Modal / Bottom Sheet */}
      {mounted && isOpen && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-sm animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          <div
            className="w-full max-w-lg bg-slate-900 border-t sm:border border-slate-700/80 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-slide-up max-h-[85dvh] overflow-y-auto overscroll-contain pb-[max(6rem,env(safe-area-inset-bottom))] sm:pb-6"
            onClick={(e) => e.stopPropagation()}
            data-lenis-prevent
          >
            {/* Sheet grab handle for mobile */}
            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-4 sm:hidden" />

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Beer className="w-5 h-5" />
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
                className="w-11 h-11 -mr-2 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 active:bg-slate-700 active:scale-95 transition-all touch-manipulation cursor-pointer"
              >
                <X className="w-5 h-5" />
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
                  placeholder="ex: Verre du vendredi au Cosy"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  disabled={isPending}
                  maxLength={50}
                  className="w-full px-4 py-3 bg-slate-800/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all min-h-[48px] text-base"
                />
              </div>

              {/* Creator Password Field */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor="session-password"
                    className="block text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5"
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Mot de passe créateur</span>
                  </label>
                  <span className="text-[10px] text-amber-300 font-bold bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30">
                    Obligatoire
                  </span>
                </div>
                <div className="relative">
                  <input
                    id="session-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="ex: 1234 ou votre code secret"
                    autoComplete="new-password"
                    autoCorrect="off"
                    spellCheck={false}
                    disabled={isPending}
                    className="w-full pl-4 pr-11 py-3 bg-slate-800/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all min-h-[48px] text-base font-mono tracking-wider"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1.5 rounded-lg active:scale-95 touch-manipulation cursor-pointer"
                    aria-label={showPassword ? 'Masquer' : 'Afficher'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="mt-1.5 text-[11px] text-slate-400 leading-snug">
                  🔒 <strong>Seul vous</strong> pourrez ajouter des commandes, scanner ou affecter. Les autres personnes auront un accès en lecture seule.
                </p>
                {error && (
                  <p className="mt-2 text-xs text-rose-400 flex items-center gap-1 font-semibold">
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

              {/* Regular Crew Quick Selector */}
              <div className="pt-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span>👥</span> Regulars Present?
                  </span>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={selectAllFriends}
                      className="text-blue-400 hover:text-blue-300 font-medium px-1 py-0.5"
                    >
                      All
                    </button>
                    <span className="text-slate-600">•</span>
                    <button
                      type="button"
                      onClick={clearAllFriends}
                      className="text-slate-400 hover:text-slate-300 font-medium px-1 py-0.5"
                    >
                      None
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {REGULAR_FRIENDS.map((friend) => {
                    const isSelected = selectedFriends.includes(friend.name);
                    return (
                      <button
                        key={friend.name}
                        type="button"
                        onClick={() => toggleFriend(friend.name)}
                        disabled={isPending}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all touch-manipulation min-h-[46px] ${
                          isSelected
                            ? 'friend-chip-selected bg-slate-800/90 border-blue-500/80 text-white shadow-sm ring-1 ring-blue-500/20'
                            : 'friend-chip-unselected bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700 opacity-60'
                        }`}
                      >
                        <div
                          className="w-3.5 h-3.5 rounded-full flex-shrink-0 transition-transform"
                          style={{
                            backgroundColor: friend.color,
                            boxShadow: isSelected ? `0 0 8px ${friend.color}80` : 'none',
                          }}
                        />
                        <span className="truncate font-medium text-xs flex-1">
                          {friend.name}
                        </span>
                        {isSelected && (
                          <span className="text-blue-400 text-xs font-bold">
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[11px] text-slate-400">
                  {selectedFriends.length > 0
                    ? `✓ ${selectedFriends.length} friend${selectedFriends.length > 1 ? 's' : ''} will be seated automatically.`
                    : 'No friends selected. You can add them later.'}
                </p>
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
                  disabled={isPending || !name.trim() || !password.trim()}
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
        </div>,
        document.body
      )}
    </>
  );
}
