'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  Receipt,
  Users,
  Wallet,
  Sparkles,
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
import { getUnassignedQuantity } from '@/lib/calculations';
import BlurText from '@/components/reactbits/BlurText';

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
  const tabContentRef = useRef<HTMLDivElement>(null);

  // Smooth tab content transition with GSAP
  useEffect(() => {
    if (tabContentRef.current) {
      gsap.fromTo(
        tabContentRef.current,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.28, ease: 'power2.out' }
      );
    }
  }, [activeTab]);

  // Calculate unassigned units across all individual orders
  const totalUnassignedUnits = localOrders.reduce((sum, order) => {
    return sum + getUnassignedQuantity(order, localAssignments);
  }, 0);

  return (
    <div className="min-h-full pb-36">
      <div className="max-w-xl mx-auto px-4 pt-2 sm:pt-4">
        {/* Top bar with back button and session info */}
        <div className="flex items-center justify-between mb-3 pt-1">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-800/90 active:bg-slate-700 px-3.5 py-2 rounded-2xl border border-slate-700/70 shadow-sm active:scale-95 transition-all min-h-[40px] touch-manipulation group"
          >
            <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-white group-hover:-translate-x-0.5 transition-transform" />
            <span>Sessions</span>
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
              {!isClosed ? 'Active' : 'Closed'}
            </span>

            <ThemeToggle variant="compact" />
          </div>
        </div>

        {/* Session Name Title */}
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl sm:text-3xl">🍻</span>
            <BlurText
              text={session.name}
              animateBy="words"
              delay={40}
              className="text-2xl sm:text-3xl font-black text-white tracking-tight truncate"
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Opened{' '}
            {new Date(session.created_at).toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>

        {/* 3 Main Sticky Tabs (iOS Segmented Control Style) */}
        <div className="sticky top-0 z-30 py-2.5 backdrop-blur-xl bg-slate-900/85 -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded-2xl bg-slate-800/90 border border-slate-700/80 shadow-lg shadow-black/20">
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex flex-col items-center justify-center py-2 px-2 rounded-xl text-xs font-bold transition-all min-h-[50px] relative active:scale-98 touch-manipulation ${
                activeTab === 'orders'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40 ring-1 ring-white/15'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 shrink-0" />
                <span>Orders</span>
                {orders.length > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                      activeTab === 'orders' ? 'bg-blue-800 text-white' : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {orders.length}
                  </span>
                )}
              </div>
              {totalUnassignedUnits > 0 ? (
                <span className="text-[9px] text-amber-300 font-extrabold mt-0.5">
                  ⚠️ {totalUnassignedUnits} unassigned
                </span>
              ) : (
                <span className="text-[9px] text-slate-400 font-normal mt-0.5 opacity-80">
                  {orders.length} items
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('friends')}
              className={`flex flex-col items-center justify-center py-2 px-2 rounded-xl text-xs font-bold transition-all min-h-[50px] relative active:scale-98 touch-manipulation ${
                activeTab === 'friends'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40 ring-1 ring-white/15'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 shrink-0" />
                <span>Friends</span>
                {participants.length > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                      activeTab === 'friends' ? 'bg-blue-800 text-white' : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {participants.length}
                  </span>
                )}
              </div>
              <span className="text-[9px] text-slate-400 font-normal mt-0.5 opacity-80">
                {participants.length} seated
              </span>
            </button>

            <button
              onClick={() => setActiveTab('bill')}
              className={`flex flex-col items-center justify-center py-2 px-2 rounded-xl text-xs font-bold transition-all min-h-[50px] relative active:scale-98 touch-manipulation ${
                activeTab === 'bill'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40 ring-1 ring-white/15'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 shrink-0" />
                <span>The Bill</span>
              </div>
              <span className="text-[9px] text-emerald-400 font-extrabold mt-0.5">
                Split tab
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
              isClosed={isClosed}
              setOrders={setLocalOrders}
              setAssignments={setLocalAssignments}
            />
          )}

          {activeTab === 'friends' && (
            <FriendsTab
              sessionId={session.id}
              participants={localParticipants}
              isClosed={isClosed}
              setParticipants={setLocalParticipants}
              setAssignments={setLocalAssignments}
            />
          )}

          {activeTab === 'bill' && (
            <BillTab
              sessionId={session.id}
              sessionName={session.name}
              isClosed={isClosed}
              orders={localOrders}
              participants={localParticipants}
              assignments={localAssignments}
            />
          )}
        </div>
      </div>
    </div>
  );
}
