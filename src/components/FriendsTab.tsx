'use client';

import { useState, useTransition, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { UserPlus, Users, Trash2, X, Lock } from 'lucide-react';
import { Participant, PARTICIPANT_COLORS, Assignment } from '@/types';
import { addParticipant, removeParticipant } from '@/lib/actions';

interface FriendsTabProps {
  sessionId: string;
  participants: Participant[];
  isClosed: boolean;
  setParticipants?: React.Dispatch<React.SetStateAction<Participant[]>>;
  setAssignments?: React.Dispatch<React.SetStateAction<(Assignment & { participant: Participant })[]>>;
}

export default function FriendsTab({
  sessionId,
  participants,
  isClosed,
  setParticipants,
  setAssignments,
}: FriendsTabProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PARTICIPANT_COLORS[0]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isAddOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isAddOpen]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const friendName = name.trim();
    if (!friendName) return;

    setError(null);
    const formData = new FormData();
    formData.set('session_id', sessionId);
    formData.set('name', friendName);
    formData.set('color', selectedColor);

    // ⚡ INSTANT OPTIMISTIC UI: zero second delay!
    const optimisticId = `temp-${Date.now()}`;
    const optimisticFriend: Participant = {
      id: optimisticId,
      session_id: sessionId,
      name: friendName,
      color: selectedColor,
      joined_at: new Date().toISOString(),
    };

    setParticipants?.((prev) => [...prev, optimisticFriend]);
    setName('');
    const nextColor =
      PARTICIPANT_COLORS[
        (participants.length + 1) % PARTICIPANT_COLORS.length
      ];
    setSelectedColor(nextColor);
    setIsAddOpen(false);

    startTransition(async () => {
      try {
        const res = await addParticipant(formData);
        if (!res.success) {
          // Revert optimistic update
          setParticipants?.((prev) => prev.filter((p) => p.id !== optimisticId));
          setError(res.error || 'Failed to add friend');
          setIsAddOpen(true);
        }
      } catch (err: any) {
        setParticipants?.((prev) => prev.filter((p) => p.id !== optimisticId));
        setError(err?.message || 'Failed to add friend');
        setIsAddOpen(true);
      }
    });
  };

  const handleRemove = async (id: string, friendName: string) => {
    if (confirm(`Remove ${friendName} from this session? Their assigned items will be unassigned.`)) {
      // ⚡ INSTANT OPTIMISTIC UI: remove from UI immediately
      const prevParticipants = participants;
      setParticipants?.((prev) => prev.filter((p) => p.id !== id));
      setAssignments?.((prev) => prev.filter((a) => a.participant_id !== id));

      startTransition(async () => {
        try {
          const res = await removeParticipant(id, sessionId);
          if (!res.success) {
            setParticipants?.(prevParticipants);
            alert(res.error || `Failed to remove ${friendName}`);
          }
        } catch (err: any) {
          setParticipants?.(prevParticipants);
          alert(err?.message || `Failed to remove ${friendName}`);
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Friend count and Add button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            <span>Friends at the Table</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {participants.length} {participants.length === 1 ? 'person' : 'people'} joined
          </p>
        </div>

        {!isClosed ? (
          <button
            onClick={() => {
              setError(null);
              setIsAddOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-lg shadow-blue-600/30 active:scale-95 transition-all min-h-[44px] touch-manipulation cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Friend</span>
          </button>
        ) : (
          <span className="px-3 py-1.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/80 text-xs font-semibold flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Lecture seule</span>
          </span>
        )}
      </div>

      {/* Friends List */}
      {participants.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-3xl border border-dashed border-slate-700 bg-slate-800/30">
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-3xl shadow-inner">
            👋
          </div>
          <h3 className="text-base font-bold text-white mb-1">No friends added yet</h3>
          <p className="text-xs text-slate-400 mb-4 max-w-xs mx-auto">
            Add everyone sitting at your table. Friends can also join later and jump into shared food!
          </p>
          {!isClosed && (
            <button
              onClick={() => setIsAddOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 active:scale-95 transition-all cursor-pointer min-h-[40px]"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add First Friend</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-2.5">
          {participants.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/90 border border-slate-700/80 shadow-md backdrop-blur-sm transition-all"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-base shadow-inner ring-2 ring-white/10"
                  style={{ backgroundColor: p.color }}
                >
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">{p.name}</h4>
                  <span className="text-[11px] text-slate-400">
                    Joined{' '}
                    {new Date(p.joined_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>

              {!isClosed && (
                <button
                  onClick={() => handleRemove(p.id, p.name)}
                  disabled={isPending}
                  aria-label={`Remove ${p.name}`}
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-400 active:text-rose-500 hover:bg-rose-500/10 active:bg-rose-500/20 active:scale-90 transition-all touch-manipulation cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Friend Bottom Sheet */}
      {mounted && isAddOpen && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAddOpen(false);
          }}
        >
          <div
            className="w-full max-w-md bg-slate-900 border-t sm:border border-slate-700/80 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-slide-up max-h-[85dvh] overflow-y-auto overscroll-contain pb-[max(6rem,env(safe-area-inset-bottom))] sm:pb-6"
            onClick={(e) => e.stopPropagation()}
            data-lenis-prevent
          >
            {/* Grab handle for mobile */}
            <div className="w-12 h-1.5 bg-slate-600 rounded-full mx-auto mb-4 sm:hidden shrink-0" />

            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-400" />
                <span>Add Friend</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                aria-label="Close dialog"
                className="w-10 h-10 rounded-full bg-slate-800 active:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white active:scale-95 transition-all touch-manipulation cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-3 mb-4 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Friend&apos;s Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  required
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="e.g. Karim, Sarah, Alex"
                  className="w-full px-4 py-3.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-base min-h-[48px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Pick an Avatar Color
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {PARTICIPANT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      aria-label={`Select color ${color}`}
                      onClick={() => setSelectedColor(color)}
                      className={`w-11 h-11 rounded-full transition-transform touch-manipulation active:scale-95 flex items-center justify-center ${
                        selectedColor === color
                          ? 'ring-4 ring-white/70 scale-110 shadow-lg'
                          : 'hover:scale-105 opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: color }}
                    >
                      {selectedColor === color && (
                        <span className="text-white text-xs font-black drop-shadow">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isPending || !name.trim()}
                  className="w-full py-4 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-base shadow-lg shadow-blue-600/30 active:scale-98 transition-all disabled:opacity-50 min-h-[52px] touch-manipulation"
                >
                  {isPending ? 'Adding...' : 'Add Friend'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
