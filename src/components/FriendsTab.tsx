'use client';

import { useState, useTransition } from 'react';
import { Participant, PARTICIPANT_COLORS } from '@/types';
import { addParticipant, removeParticipant } from '@/lib/actions';

interface FriendsTabProps {
  sessionId: string;
  participants: Participant[];
  isClosed: boolean;
}

export default function FriendsTab({
  sessionId,
  participants,
  isClosed,
}: FriendsTabProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PARTICIPANT_COLORS[0]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setError(null);
    const formData = new FormData();
    formData.set('session_id', sessionId);
    formData.set('name', name.trim());
    formData.set('color', selectedColor);

    startTransition(async () => {
      const res = await addParticipant(formData);
      if (res.success) {
        setName('');
        // Rotate to next unused color
        const nextColor =
          PARTICIPANT_COLORS[
            (participants.length + 1) % PARTICIPANT_COLORS.length
          ];
        setSelectedColor(nextColor);
        setIsAddOpen(false);
      } else {
        setError(res.error || 'Failed to add friend');
      }
    });
  };

  const handleRemove = async (id: string, friendName: string) => {
    if (confirm(`Remove ${friendName} from this session? Their assigned items will be unassigned.`)) {
      startTransition(async () => {
        await removeParticipant(id, sessionId);
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Friend count and Add button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>👥</span> Friends at the Table
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {participants.length} {participants.length === 1 ? 'person' : 'people'} joined
          </p>
        </div>

        {!isClosed && (
          <button
            onClick={() => {
              setError(null);
              setIsAddOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-lg shadow-blue-600/30 active:scale-95 transition-all min-h-[44px]"
          >
            <span className="text-lg leading-none">+</span>
            Add Friend
          </button>
        )}
      </div>

      {/* Friends List */}
      {participants.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-slate-700 bg-slate-800/30">
          <div className="text-4xl mb-3">👋</div>
          <h3 className="text-base font-bold text-white mb-1">No friends added yet</h3>
          <p className="text-xs text-slate-400 mb-4 max-w-xs mx-auto">
            Add everyone sitting at your table. Friends can also join later and jump into shared food!
          </p>
          {!isClosed && (
            <button
              onClick={() => setIsAddOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
            >
              + Add First Friend
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-2.5">
          {participants.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/90 border border-slate-700/80 shadow-md"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-base shadow-inner"
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
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Friend Bottom Sheet */}
      {isAddOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border-t sm:border border-slate-700 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-slide-up max-h-[85dvh] overflow-y-auto overscroll-contain pb-[max(6rem,env(safe-area-inset-bottom))] sm:pb-6">
            {/* Grab handle for mobile */}
            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-4 sm:hidden" />

            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>👤</span> Add Friend
              </h3>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
              >
                ✕
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
                  placeholder="e.g. Karim, Sarah, Alex"
                  className="w-full px-4 py-3.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-base"
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
                      onClick={() => setSelectedColor(color)}
                      className={`w-9 h-9 rounded-full transition-transform ${
                        selectedColor === color
                          ? 'ring-4 ring-white/60 scale-110 shadow-lg'
                          : 'hover:scale-105 opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isPending || !name.trim()}
                  className="w-full py-4 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-base shadow-lg shadow-blue-600/30 active:scale-98 transition-all disabled:opacity-50 min-h-[52px]"
                >
                  {isPending ? 'Adding...' : 'Add Friend'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
