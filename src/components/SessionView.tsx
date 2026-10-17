'use client';

import { useState } from 'react';
import Link from 'next/link';
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

  const isClosed = session.status === 'closed';

  // Calculate unassigned units across all individual orders
  const totalUnassignedUnits = orders.reduce((sum, order) => {
    return sum + getUnassignedQuantity(order, assignments);
  }, 0);

  return (
    <div className="min-h-full pb-32">
      <div className="max-w-xl mx-auto px-4 pt-4 sm:pt-6">
        {/* Top bar with back button and session info */}
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/60 active:scale-95 transition-all"
          >
            ← Back
          </Link>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                !isClosed
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  !isClosed ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                }`}
              />
              {!isClosed ? 'Active Session' : 'Closed Tab'}
            </span>

            <ThemeToggle variant="compact" />
          </div>
        </div>

        {/* Session Name Title */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <span>🍻</span>
            <span className="truncate">{session.name}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Created on{' '}
            {new Date(session.created_at).toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>

        {/* 3 Main Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded-2xl bg-slate-800/90 border border-slate-700/80 mb-6 shadow-inner">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl text-xs font-bold transition-all min-h-[48px] relative ${
              activeTab === 'orders'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span>📝</span>
              <span>Orders</span>
              {orders.length > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                    activeTab === 'orders' ? 'bg-blue-800 text-white' : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {orders.length}
                </span>
              )}
            </div>
            {totalUnassignedUnits > 0 && (
              <span className="text-[10px] text-amber-300 font-semibold mt-0.5">
                ⚠️ {totalUnassignedUnits} unassigned
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('friends')}
            className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl text-xs font-bold transition-all min-h-[48px] ${
              activeTab === 'friends'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span>👥</span>
              <span>Friends</span>
              {participants.length > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                    activeTab === 'friends' ? 'bg-blue-800 text-white' : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {participants.length}
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 font-normal mt-0.5">
              {participants.length} at table
            </span>
          </button>

          <button
            onClick={() => setActiveTab('bill')}
            className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl text-xs font-bold transition-all min-h-[48px] ${
              activeTab === 'bill'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span>💰</span>
              <span>The Bill</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-semibold mt-0.5">
              Split tab
            </span>
          </button>
        </div>

        {/* Tab Contents */}
        <div>
          {activeTab === 'orders' && (
            <OrdersTab
              sessionId={session.id}
              orders={orders}
              participants={participants}
              assignments={assignments}
              menuItems={menuItems}
              isClosed={isClosed}
            />
          )}

          {activeTab === 'friends' && (
            <FriendsTab
              sessionId={session.id}
              participants={participants}
              isClosed={isClosed}
            />
          )}

          {activeTab === 'bill' && (
            <BillTab
              sessionId={session.id}
              sessionName={session.name}
              isClosed={isClosed}
              orders={orders}
              participants={participants}
              assignments={assignments}
            />
          )}
        </div>
      </div>
    </div>
  );
}
