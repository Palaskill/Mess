'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Trash2, ArrowRight } from 'lucide-react';
import { Session } from '@/types';
import { deleteSession } from '@/lib/actions';
import { timeAgo } from '@/lib/utils';

interface SessionCardProps {
  session: Session & {
    participant_count?: number;
  };
}

export default function SessionCard({ session }: SessionCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isOpen = session.status === 'open';

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowConfirm(true);
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowConfirm(false);
  };

  const handleConfirmDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDeleting(true);

    startTransition(async () => {
      try {
        const res = await deleteSession(session.id);
        if (res.success) {
          router.refresh();
        } else {
          alert(res.error || 'Failed to delete session');
          setIsDeleting(false);
          setShowConfirm(false);
        }
      } catch (err: any) {
        console.error('Failed to delete session:', err);
        alert(err?.message || 'Failed to delete session');
        setIsDeleting(false);
        setShowConfirm(false);
      }
    });
  };

  return (
    <div
      onClick={() => router.push(`/session/${session.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          router.push(`/session/${session.id}`);
        }
      }}
      className={`group relative block rounded-2xl bg-slate-800/90 border border-slate-700/80 p-4 sm:p-5 shadow-lg shadow-black/20 backdrop-blur-sm transition-all duration-200 hover:border-slate-500 hover:bg-slate-800 active:scale-[0.99] cursor-pointer touch-manipulation ${
        isDeleting || isPending ? 'opacity-50 pointer-events-none' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Session Title & Badges */}
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide ${
                isOpen
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                }`}
              />
              {isOpen ? 'Open' : 'Closed'}
            </span>

            <span className="text-xs text-slate-400 font-medium">
              {timeAgo(session.created_at)}
            </span>
          </div>

          <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors truncate">
            {session.name}
          </h3>
        </div>

        {/* Delete Action & Confirm */}
        <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
          {showConfirm ? (
            <div
              className="flex items-center gap-1.5 bg-slate-900/95 border border-slate-700 px-2.5 py-1.5 rounded-xl shadow-lg animate-fade-in"
            >
              <span className="text-xs text-slate-300 font-medium mr-1 hidden xs:inline">
                Delete?
              </span>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting || isPending}
                className="px-3 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white rounded-lg transition-colors min-h-[36px] flex items-center justify-center"
              >
                {isDeleting || isPending ? '...' : 'Yes'}
              </button>
              <button
                type="button"
                onClick={handleCancelDelete}
                disabled={isDeleting || isPending}
                className="px-3 py-1.5 text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors min-h-[36px] flex items-center justify-center"
              >
                No
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleDeleteClick}
              aria-label={`Delete ${session.name}`}
              className="w-11 h-11 -mr-2 -mt-2 flex items-center justify-center text-slate-400 hover:text-rose-400 active:text-rose-500 rounded-xl transition-colors hover:bg-rose-500/10 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Card Footer: Metadata and Action prompt */}
      <div className="mt-3.5 pt-3 border-t border-slate-700/50 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-3">
          {session.participant_count !== undefined ? (
            <span className="flex items-center gap-1.5 font-medium text-slate-300">
              <Users className="w-4 h-4 text-blue-400 shrink-0" />
              {session.participant_count}{' '}
              {session.participant_count === 1 ? 'person' : 'people'}
            </span>
          ) : (
            <span className="text-slate-400">Tap to view session</span>
          )}
        </div>

        <span className="flex items-center gap-1 font-semibold text-blue-400 group-hover:translate-x-0.5 transition-transform">
          <span>Open</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </div>
  );
}
