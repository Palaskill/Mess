'use client';

import { useState, useTransition } from 'react';
import { Order, Participant, Assignment } from '@/types';
import {
  calculateBills,
  calculateTotal,
  calculateUnassigned,
} from '@/lib/calculations';
import { closeSession } from '@/lib/actions';

interface BillTabProps {
  sessionId: string;
  sessionName: string;
  isClosed: boolean;
  orders: Order[];
  participants: Participant[];
  assignments: (Assignment & { participant: Participant })[];
}

export default function BillTab({
  sessionId,
  sessionName,
  isClosed,
  orders,
  participants,
  assignments,
}: BillTabProps) {
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const bills = calculateBills(orders, assignments, participants);
  const total = calculateTotal(orders);
  const unassignedAmount = calculateUnassigned(orders, assignments);

  // Copy breakdown to clipboard (great for sending into WhatsApp)
  const handleCopySummary = () => {
    let text = `🍻 *${sessionName} — Bar Tab Split*\n\n`;

    bills.forEach((b) => {
      text += `👤 *${b.participant.name}*: $${b.total.toFixed(2)}\n`;
      b.items.forEach((item) => {
        text += `   • ${item.label} ($${item.amount.toFixed(2)})\n`;
      });
      text += '\n';
    });

    text += `──────────────\n`;
    text += `💰 *Total Bill*: $${total.toFixed(2)}\n`;
    if (unassignedAmount > 0) {
      text += `⚠️ *Unassigned Items*: $${unassignedAmount.toFixed(2)}\n`;
    }
    text += `\nShared via MEss 🍺`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCloseSession = () => {
    if (confirm('Close this session? No more orders or assignments will be edited.')) {
      startTransition(async () => {
        await closeSession(sessionId);
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>💰</span> Who Pays What
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time split based on individual & shared items
          </p>
        </div>

        <button
          onClick={handleCopySummary}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 active:scale-95 transition-all min-h-[40px]"
        >
          <span>{copied ? '✓ Copied!' : '📋 Copy Tab'}</span>
        </button>
      </div>

      {/* Unassigned items warning alert */}
      {unassignedAmount > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-start gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <h4 className="text-sm font-bold text-amber-300">
              ${unassignedAmount.toFixed(2)} in unassigned items!
            </h4>
            <p className="text-xs text-amber-200/80 mt-0.5">
              Some ordered drinks or items haven&apos;t been claimed yet. Check the Orders tab to assign them to friends.
            </p>
          </div>
        </div>
      )}

      {/* Individual Bills List */}
      {participants.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-slate-700 bg-slate-800/30">
          <div className="text-4xl mb-3">👥</div>
          <h3 className="text-base font-bold text-white mb-1">No friends added</h3>
          <p className="text-xs text-slate-400">
            Add friends in the Friends tab to see the bill split.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {bills.map((bill) => (
            <div
              key={bill.participant.id}
              className="p-4 rounded-2xl bg-slate-800/90 border border-slate-700/80 shadow-md space-y-3"
            >
              {/* Person Header & Total */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-white text-base shadow-inner shrink-0"
                    style={{ backgroundColor: bill.participant.color }}
                  >
                    {bill.participant.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-white text-base">
                      {bill.participant.name}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {bill.items.length} {bill.items.length === 1 ? 'item' : 'items'}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xl font-black text-emerald-400">
                    ${bill.total.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Itemized breakdown */}
              {bill.items.length > 0 ? (
                <div className="pt-2 border-t border-slate-700/50 space-y-1.5">
                  {bill.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs text-slate-300"
                    >
                      <span className="truncate pr-2 font-medium">
                        {item.label}
                      </span>
                      <span className="font-semibold text-slate-400 shrink-0">
                        ${item.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="pt-2 border-t border-slate-700/50 text-xs text-slate-500 italic">
                  No items assigned yet
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Bill Grand Total Summary Card */}
      <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 shadow-2xl space-y-3">
        <div className="flex items-center justify-between text-slate-300 text-sm">
          <span>Total Orders ({orders.length})</span>
          <span className="font-bold">${total.toFixed(2)}</span>
        </div>

        {unassignedAmount > 0 && (
          <div className="flex items-center justify-between text-amber-400 text-xs font-semibold">
            <span>Unassigned on table</span>
            <span>${unassignedAmount.toFixed(2)}</span>
          </div>
        )}

        <div className="pt-3 border-t border-slate-700/80 flex items-center justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider font-extrabold text-slate-400 block">
              Grand Total
            </span>
            <span className="text-2xl font-black text-white">
              ${total.toFixed(2)}
            </span>
          </div>

          {!isClosed ? (
            <button
              onClick={handleCloseSession}
              disabled={isPending}
              className="px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold transition-all active:scale-95 border border-slate-600"
            >
              {isPending ? 'Closing...' : 'Close Tab 🔒'}
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 text-rose-400 border border-rose-500/30 text-xs font-bold">
              🔒 Closed
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
