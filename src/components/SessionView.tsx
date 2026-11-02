'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  ChevronLeft,
  Receipt,
  Users,
  Wallet,
  Sparkles,
  Lock,
  Unlock,
  ShieldCheck,
  Eye,
  EyeOff,
  X,
  Key,
} from 'lucide-react';
import gsap from 'gsap';
import {
  Session,
  Participant,
  Order,
  Assignment,
  MenuItem,
} from '@/types';
import FriendsTab from '@/components/FriendsTab';
import OrdersTab from '@/components/OrdersTab';
import BillTab from '@/components/BillTab';
import ThemeToggle from '@/components/ThemeToggle';
import LanguageToggle from '@/components/LanguageToggle';
import { getUnassignedQuantity } from '@/lib/calculations';
import { verifySessionPassword, getSessionAccess, lockSession } from '@/lib/actions';
import { useLanguage } from '@/lib/i18n';

interface SessionViewProps {
  session: Session;
  participants: Participant[];
  orders: Order[];
  assignments: (Assignment & { participant: Participant })[];
  menuItems: MenuItem[];
}

export default function SessionView({
  session,
  participants,
  orders,
  assignments,
  menuItems,
}: SessionViewProps) {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';
  const [activeTab, setActiveTab] = useState<'orders' | 'friends' | 'bill'>('orders');

  // Optimistic local states for instant 0ms response on user interactions
  const [localOrders, setLocalOrders] = useState<Order[]>(orders);
  const [localParticipants, setLocalParticipants] = useState<Participant[]>(participants);
  const [localAssignments, setLocalAssignments] = useState<(Assignment & { participant: Participant })[]>(assignments);

  useEffect(() => {
    setLocalOrders(orders);
  }, [orders]);

  useEffect(() => {
    setLocalParticipants(participants);
  }, [participants]);

  useEffect(() => {
    setLocalAssignments(assignments);
  }, [assignments]);

  const isClosed = session.status === 'closed';
  const hasPassword = Boolean(session.has_password);

  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [showUnlockPassword, setShowUnlockPassword] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [isVerifying, startVerifyTransition] = useTransition();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    let active = true;
    // Remove legacy plaintext credentials; authorization now lives in HttpOnly cookies.
    try { localStorage.removeItem(`mess_auth_${session.id}`); } catch {}
    const loadAccess = async () => {
      let allowed = await getSessionAccess(session.id);
      if (!allowed && !hasPassword && !isClosed) allowed = (await verifySessionPassword(session.id, '')).success;
      if (active) setIsUnlocked(allowed);
    };
    void loadAccess();
    return () => { active = false; };
  }, [session.id, hasPassword, isClosed]);

  // Lock body scroll when unlock modal is open
  useEffect(() => {
    if (isUnlockModalOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isUnlockModalOpen]);

  const handleUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = unlockPassword.trim();
    if (!trimmed) {
      setUnlockError(t.session.enterPasswordError);
      return;
    }

    setUnlockError(null);
    startVerifyTransition(async () => {
      const res = await verifySessionPassword(session.id, trimmed);
      if (res.success) {
        setIsUnlocked(true);
        setIsUnlockModalOpen(false);
        setUnlockPassword('');
      } else {
        setUnlockError(res.error || t.common.error);
      }
    });
  };

  const handleLockSession = () => {
    startVerifyTransition(async () => {
      const result = await lockSession(session.id);
      if (result.success) setIsUnlocked(false);
      else window.alert(result.error || t.common.error);
    });
  };

  const canEdit = !isClosed && isUnlocked;
  const tabContentRef = useRef<HTMLDivElement>(null);

  // Smooth tab content transition with GSAP
  useEffect(() => {
    if (tabContentRef.current) {
      gsap.fromTo(
        tabContentRef.current,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.28, ease: 'power2.out', clearProps: 'transform' }
      );
    }
  }, [activeTab]);

  // Calculate unassigned units across all individual orders
  const totalUnassignedUnits = localOrders.reduce((sum, order) => {
    return sum + getUnassignedQuantity(order, localAssignments);
  }, 0);

  return (
    <div className="session-workspace min-h-full pb-36">
      <div className="max-w-3xl mx-auto px-4 sm:px-8 pt-4 sm:pt-8">
        {/* Top bar with back button and session info */}
        <div className="session-topbar flex items-center justify-between gap-2 mb-4 pt-1">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-800/90 active:bg-slate-700 px-3.5 py-2 rounded-2xl border border-slate-700/70 shadow-sm active:scale-95 transition-all min-h-[40px] touch-manipulation group"
          >
            <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-white group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0.5 rtl:rotate-180 transition-transform" />
            <span>{t.session.back}</span>
          </Link>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                !isClosed
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  !isClosed ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                }`}
              />
              {!isClosed ? t.session.active : t.session.closed}
            </span>

            <LanguageToggle variant="compact" />
            <ThemeToggle variant="compact" />
          </div>
        </div>

        {/* Session Name Title */}
        <div className="mb-4">
          <div className="flex items-center gap-2.5">

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight break-words">
              <span>{session.name}</span>
            </h1>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {t.session.openedOn}{' '}
            {new Date(session.created_at).toLocaleDateString(language === 'ar' ? 'ar-TN' : language === 'en' ? 'en-US' : 'fr-FR', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>

        {/* Read-Only Access Banner */}
        {hasPassword && !isUnlocked && (
          <div className="mb-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between gap-3 text-xs animate-fade-in shadow-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="font-bold text-amber-300 block truncate">
                  {t.session.readOnlyTitle}
                </span>
                <span className="text-[11px] text-amber-200/80 block truncate">
                  {t.session.readOnlyDesc}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setUnlockError(null);
                setUnlockPassword('');
                setShowUnlockPassword(false);
                setIsUnlockModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-900 font-bold text-xs shrink-0 active:scale-95 transition-all shadow cursor-pointer min-h-[38px] flex items-center gap-1.5 touch-manipulation"
            >
              <Key className="w-3.5 h-3.5" />
              <span>{t.session.unlock}</span>
            </button>
          </div>
        )}

        {/* Unlocked Creator Banner */}
        {hasPassword && isUnlocked && !isClosed && (
          <div className="organizer-status flex items-center justify-between gap-3 mb-4 text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-semibold">
                {t.session.organizerBadge}
              </span>
            </div>
            <button
              type="button"
              onClick={handleLockSession}
              className="text-[11px] font-bold text-slate-400 hover:text-white px-2.5 py-1 rounded-lg hover:bg-slate-800 active:bg-slate-700 transition active:scale-95 cursor-pointer touch-manipulation"
              title="Passer en mode lecture seule sur cet appareil"
            >
              {t.session.lock}
            </button>
          </div>
        )}

        {/* 3 Main Sticky Tabs (iOS Segmented Control Style) */}
        <div className="session-tabs sticky top-0 z-30 pt-[max(0.6rem,env(safe-area-inset-top))] pb-2.5 backdrop-blur-xl bg-slate-900/90 -mx-4 px-4 sm:mx-0 sm:px-0 transition-colors">
          <div className="relative grid grid-cols-3 p-1.5 rounded-2xl bg-slate-800/90 border border-slate-700/80 shadow-lg shadow-black/20 overflow-hidden">
            {/* Smooth Animated Sliding Indicator Pill */}
            <div
              aria-hidden="true"
              className="absolute top-1.5 bottom-1.5 left-1.5 rtl:right-1.5 rtl:left-auto rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md shadow-blue-900/40 ring-1 ring-white/20 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none"
              style={{
                width: 'calc((100% - 12px) / 3)',
                transform: `translateX(${
                  isRTL
                    ? activeTab === 'orders' ? '0%' : activeTab === 'friends' ? '-100%' : '-200%'
                    : activeTab === 'orders' ? '0%' : activeTab === 'friends' ? '100%' : '200%'
                })`,
              }}
            />

            <button
              aria-pressed={activeTab === 'orders'}
              onClick={() => setActiveTab('orders')}
              className={`relative z-10 flex flex-col items-center justify-center py-2 px-2 rounded-xl text-xs font-bold transition-all min-h-[50px] active:scale-95 touch-manipulation cursor-pointer ${
                activeTab === 'orders'
                  ? 'text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 shrink-0" />
                <span>{t.session.ordersTab}</span>
                {orders.length > 0 && (
                  <span
                    className={`text-xs px-1.5 py-0.2 rounded-full font-black transition-colors ${
                      activeTab === 'orders' ? 'bg-blue-900/80 text-white ring-1 ring-white/20' : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {orders.length}
                  </span>
                )}
              </div>
              {totalUnassignedUnits > 0 ? (
                <span className={`text-xs font-extrabold mt-0.5 transition-colors ${
                  activeTab === 'orders' ? 'text-amber-200' : 'text-amber-400'
                }`}>
                  ⚠️ {totalUnassignedUnits} {t.session.unassignedBadge}
                </span>
              ) : (
                <span className="text-xs text-slate-400/90 font-normal mt-0.5 opacity-80">
                  {orders.length} {t.session.articlesCount}
                </span>
              )}
            </button>

            <button
              aria-pressed={activeTab === 'friends'}
              onClick={() => setActiveTab('friends')}
              className={`relative z-10 flex flex-col items-center justify-center py-2 px-2 rounded-xl text-xs font-bold transition-all min-h-[50px] active:scale-95 touch-manipulation cursor-pointer ${
                activeTab === 'friends'
                  ? 'text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 shrink-0" />
                <span>{t.session.friendsTab}</span>
                {participants.length > 0 && (
                  <span
                    className={`text-xs px-1.5 py-0.2 rounded-full font-black transition-colors ${
                      activeTab === 'friends' ? 'bg-blue-900/80 text-white ring-1 ring-white/20' : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {participants.length}
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-400/90 font-normal mt-0.5 opacity-80">
                {participants.length} {t.session.friendsSeated}
              </span>
            </button>

            <button
              aria-pressed={activeTab === 'bill'}
              onClick={() => setActiveTab('bill')}
              className={`relative z-10 flex flex-col items-center justify-center py-2 px-2 rounded-xl text-xs font-bold transition-all min-h-[50px] active:scale-95 touch-manipulation cursor-pointer ${
                activeTab === 'bill'
                  ? 'text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 shrink-0" />
                <span>{t.session.billTab}</span>
              </div>
              <span className={`text-xs font-extrabold mt-0.5 transition-colors ${
                activeTab === 'bill' ? 'text-emerald-200' : 'text-emerald-400'
              }`}>
                {t.session.splitNet}
              </span>
            </button>
          </div>
        </div>

        {/* Tab Contents with GSAP Transition */}
        <div ref={tabContentRef}>
          {activeTab === 'orders' && (
            <OrdersTab
              sessionId={session.id}
              orders={localOrders}
              participants={localParticipants}
              assignments={localAssignments}
              menuItems={menuItems}
              isClosed={!canEdit}
              setOrders={setLocalOrders}
              setAssignments={setLocalAssignments}
            />
          )}

          {activeTab === 'friends' && (
            <FriendsTab
              sessionId={session.id}
              participants={localParticipants}
              isClosed={!canEdit}
              setParticipants={setLocalParticipants}
              setAssignments={setLocalAssignments}
            />
          )}

          {activeTab === 'bill' && (
            <BillTab
              sessionId={session.id}
              sessionName={session.name}
              isClosed={!canEdit}
              orders={localOrders}
              participants={localParticipants}
              assignments={localAssignments}
            />
          )}
        </div>
      </div>

      {/* Unlock Password Modal (iOS Bottom Sheet & Dialog) */}
      {mounted && isUnlockModalOpen && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-sm animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsUnlockModalOpen(false);
          }}
        >
          <div
            className="w-full max-w-md bg-slate-900 border-t sm:border border-slate-700/80 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-slide-up max-h-[85dvh] overflow-y-auto overscroll-contain pb-[max(5rem,env(safe-area-inset-bottom))] sm:pb-6"
            onClick={(e) => e.stopPropagation()}
            data-lenis-prevent
          >
            {/* Sheet grab handle for mobile */}
            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-4 sm:hidden" />

            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-400">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">
                    {t.session.unlockModalTitle}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {t.session.unlockModalSubtitle}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsUnlockModalOpen(false)}
                className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 active:bg-slate-650 flex items-center justify-center text-slate-400 hover:text-white transition-all active:scale-95 touch-manipulation cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUnlockSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="unlock-password"
                  className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2"
                >
                  {t.session.creatorPassword}
                </label>
                <div className="relative">
                  <input
                    id="unlock-password"
                    type={showUnlockPassword ? 'text' : 'password'}
                    value={unlockPassword}
                    onChange={(e) => setUnlockPassword(e.target.value)}
                    placeholder={t.session.passwordPlaceholder}
                    autoFocus
                    disabled={isVerifying}
                    className="w-full pl-4 pr-11 rtl:pl-11 rtl:pr-4 py-3 bg-slate-800/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all min-h-[48px] text-base font-mono tracking-wider"
                  />
                  <button
                    type="button"
                    onClick={() => setShowUnlockPassword(!showUnlockPassword)}
                    className="absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1.5 rounded-lg active:scale-95 touch-manipulation cursor-pointer"
                    aria-label={showUnlockPassword ? 'Masquer' : 'Afficher'}
                  >
                    {showUnlockPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {unlockError && (
                  <p className="mt-2 text-xs text-rose-400 font-semibold flex items-center gap-1.5">
                    <span>⚠️</span> {unlockError}
                  </p>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsUnlockModalOpen(false)}
                  disabled={isVerifying}
                  className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white text-xs font-semibold transition active:scale-95 min-h-[44px] touch-manipulation cursor-pointer"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isVerifying || !unlockPassword.trim()}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-900 text-xs font-bold shadow-lg shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none min-h-[44px] flex items-center gap-1.5 touch-manipulation cursor-pointer"
                >
                  {isVerifying ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                      <span>{t.session.verifying}</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-4 h-4" />
                      <span>{t.session.unlockAction}</span>
                    </>
                  )}
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
