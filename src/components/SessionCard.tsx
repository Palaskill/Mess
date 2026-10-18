'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
    <Link
      href={`/session/${session.id}`}
      className={`group relative block rounded-2xl bg-slate-800/90 border border-slate-700/80 p-4 sm:p-5 shadow-lg shadow-black/20 backdrop-blur-sm transition-all duration-200 hover:border-slate-500 hover:bg-slate-800 active:scale-[0.99] touch-manipulation ${
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
        <div className="flex items-center">
          {showConfirm ? (
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 bg-slate-900/95 border border-slate-700 px-2 py-1 rounded-xl shadow-lg animate-fade-in"
            >
              <span className="text-xs text-slate-300 font-medium mr-1 hidden xs:inline">
                Delete?
              </span>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting || isPending}
                className="px-2.5 py-1 text-xs font-semibold bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white rounded-lg transition-colors min-h-[32px] flex items-center justify-center"
              >
                {isDeleting || isPending ? '...' : 'Yes'}
              </button>
              <button
                type="button"
                onClick={handleCancelDelete}
                disabled={isDeleting || isPending}
                className="px-2 py-1 text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors min-h-[32px] flex items-center justify-center"
              >
                No
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleDeleteClick}
              aria-label={`Delete ${session.name}`}
              className="w-11 h-11 -mr-2 -mt-2 flex items-center justify-center text-slate-400 hover:text-rose-400 active:text-rose-500 rounded-xl transition-colors hover:bg-slate-700/50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-4 h-4"
              >
                <path
                  fillRule="evenodd"
                  d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 1 .75.74l.5 6.5a.75.75 0 1 1-1.498.11l-.5-6.5a.75.75 0 0 1 .748-.85Zm3.58.74a.75.75 0 0 0-1.498-.11l-.5 6.5a.75.75 0 1 0 1.498.12l.5-6.5a.75.75 0 0 0-.74-.86a.75.75 0 0 0 .74.35Z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Card Footer: Metadata and Action prompt */}
      <div className="mt-3.5 pt-3 border-t border-slate-700/50 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-3">
          {session.participant_count !== undefined ? (
            <span className="flex items-center gap-1.5 font-medium text-slate-300">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-4 h-4 text-blue-400"
              >
                <path d="M7 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM14.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM1.615 16.428a1.224 1.224 0 0 1-.569-1.175 6.002 6.002 0 0 1 11.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 0 1 7 17a9.953 9.953 0 0 1-5.385-.572ZM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 0 0-1.588-3.755 4.502 4.502 0 0 1 5.874 4.163c0 .287-.13.56-.352.736A7.962 7.962 0 0 1 14.5 16Z" />
              </svg>
              {session.participant_count}{' '}
              {session.participant_count === 1 ? 'person' : 'people'}
            </span>
          ) : (
            <span className="text-slate-400">Tap to view session</span>
          )}
        </div>

        <span className="flex items-center gap-1 font-semibold text-blue-400 group-hover:translate-x-0.5 transition-transform">
          Open
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-4 h-4"
          >
            <path
              fillRule="evenodd"
              d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      </div>
    </Link>
  );
}
