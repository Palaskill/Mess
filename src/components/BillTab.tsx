'use client';

import { useState, useTransition, useMemo } from 'react';
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

interface TipConfig {
  amount: number;
  participantIds: string[]; // who's contributing to the tip
}

const TIP_PRESETS = [5, 10, 15, 20];

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

  // Tip state
  const [tipMode, setTipMode] = useState<'none' | 'percentage' | 'fixed'>('none');
  const [tipPercentage, setTipPercentage] = useState(10);
  const [tipFixed, setTipFixed] = useState('');
  const [tipParticipantIds, setTipParticipantIds] = useState<string[]>([]);
  const [showTipSection, setShowTipSection] = useState(false);

  const bills = calculateBills(orders, assignments, participants);
  const total = calculateTotal(orders);
  const unassignedAmount = calculateUnassigned(orders, assignments);

  // Calculate the tip amount
  const tipAmount = useMemo(() => {
    if (tipMode === 'percentage') return total * (tipPercentage / 100);
    if (tipMode === 'fixed') return parseFloat(tipFixed) || 0;
    return 0;
  }, [tipMode, tipPercentage, tipFixed, total]);

  // Calculate tip per participant
  const tipPerPerson = useMemo(() => {
    const contributors = tipParticipantIds.length;
    if (contributors === 0 || tipAmount <= 0) return 0;
    return tipAmount / contributors;
  }, [tipAmount, tipParticipantIds]);

  // Build final bills with tip included
  const finalBills = useMemo(() => {
    return bills.map((bill) => {
      const isTipContributor = tipParticipantIds.includes(bill.participant.id);
      const personTip = isTipContributor ? tipPerPerson : 0;
      return {
        ...bill,
        tipAmount: personTip,
        grandTotal: bill.total + personTip,
      };
    });
  }, [bills, tipParticipantIds, tipPerPerson]);

  const grandTotalWithTip = total + tipAmount;

  // Toggle tip participant
  const toggleTipParticipant = (id: string) => {
    setTipParticipantIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Select/deselect all for tip
  const selectAllForTip = () => {
    setTipParticipantIds(participants.map((p) => p.id));
  };

  const clearAllForTip = () => {
    setTipParticipantIds([]);
  };

  // Initialize tip section
  const handleOpenTip = () => {
    setShowTipSection(true);
    if (tipMode === 'none') setTipMode('percentage');
    if (tipParticipantIds.length === 0) {
      setTipParticipantIds(participants.map((p) => p.id));
    }
  };

  // Copy breakdown to clipboard (great for sending into WhatsApp)
  const handleCopySummary = () => {
    let text = `🍻 *${sessionName} — Bar Tab Split*\n\n`;

    finalBills.forEach((b) => {
      text += `👤 *${b.participant.name}*: $${b.grandTotal.toFixed(2)}`;
      if (b.tipAmount > 0) {
        text += ` (incl. $${b.tipAmount.toFixed(2)} tip)`;
      }
      text += '\n';
      b.items.forEach((item) => {
        text += `   • ${item.label} ($${item.amount.toFixed(2)})\n`;
      });
      if (b.tipAmount > 0) {
        text += `   • 💵 Tip ($${b.tipAmount.toFixed(2)})\n`;
      }
      text += '\n';
    });

    text += `──────────────\n`;
    text += `💰 *Subtotal*: $${total.toFixed(2)}\n`;
    if (tipAmount > 0) {
      text += `💵 *Tip*: $${tipAmount.toFixed(2)}`;
      if (tipMode === 'percentage') text += ` (${tipPercentage}%)`;
      text += '\n';
    }
    text += `🧾 *Grand Total*: $${grandTotalWithTip.toFixed(2)}\n`;
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
    <div className="space-y-5">
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
        <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-start gap-3">
          <span className="text-xl shrink-0">⚠️</span>
          <div>
            <h4 className="text-sm font-bold text-amber-300">
              ${unassignedAmount.toFixed(2)} in unassigned items!
            </h4>
            <p className="text-xs text-amber-200/80 mt-0.5">
              Some ordered drinks or items haven&apos;t been claimed yet. Check the Orders tab.
            </p>
          </div>
        </div>
      )}

      {/* ==================== TIP SECTION ==================== */}
      {participants.length > 0 && (
        <div className="rounded-2xl border border-slate-700/80 bg-slate-800/60 overflow-hidden">
          {/* Tip Toggle Header */}
          <button
            type="button"
            onClick={() => (showTipSection ? setShowTipSection(false) : handleOpenTip())}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-800/80 transition-colors active:bg-slate-800"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-lg">
                💵
              </div>
              <div>
                <span className="font-bold text-sm text-white block leading-tight">
                  Add a Tip
                </span>
                <span className="text-[11px] text-slate-400">
                  {tipAmount > 0
                    ? `$${tipAmount.toFixed(2)} tip • ${tipParticipantIds.length} friend${tipParticipantIds.length !== 1 ? 's' : ''} splitting`
                    : 'Optional gratuity for the bar staff'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {tipAmount > 0 && (
                <span className="text-xs font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  +${tipAmount.toFixed(2)}
                </span>
              )}
              <span className={`text-slate-400 text-xs transition-transform ${showTipSection ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </div>
          </button>

          {/* Tip Configuration Panel */}
          {showTipSection && (
            <div className="p-4 pt-0 space-y-4 border-t border-slate-700/60">
              {/* Tip Mode Selector */}
              <div className="pt-3">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Tip Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTipMode('percentage')}
                    className={`p-2.5 rounded-xl border text-center text-xs font-bold transition-all min-h-[42px] ${
                      tipMode === 'percentage'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-sm'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    📊 Percentage
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipMode('fixed')}
                    className={`p-2.5 rounded-xl border text-center text-xs font-bold transition-all min-h-[42px] ${
                      tipMode === 'fixed'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-sm'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    💲 Fixed Amount
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTipMode('none');
                      setShowTipSection(false);
                    }}
                    className={`p-2.5 rounded-xl border text-center text-xs font-bold transition-all min-h-[42px] ${
                      tipMode === 'none'
                        ? 'bg-slate-700 border-slate-600 text-white shadow-sm'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    ❌ No Tip
                  </button>
                </div>
              </div>

              {/* Percentage Amount */}
              {tipMode === 'percentage' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    How much? (% of ${total.toFixed(2)})
                  </label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {TIP_PRESETS.map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setTipPercentage(pct)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all min-h-[38px] ${
                          tipPercentage === pct
                            ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400/40'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                    <div className="flex items-center gap-1.5 bg-slate-800 rounded-xl border border-slate-700 px-3 min-h-[38px]">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={tipPercentage}
                        onChange={(e) => setTipPercentage(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-12 bg-transparent text-white text-xs font-bold text-center focus:outline-none"
                      />
                      <span className="text-xs text-slate-400 font-semibold">%</span>
                    </div>
                  </div>
                  <div className="text-sm font-extrabold text-emerald-400 flex items-center gap-1.5">
                    <span>💵</span>
                    <span>Tip amount: ${tipAmount.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* Fixed Amount */}
              {tipMode === 'fixed' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Tip Amount ($)
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-bold text-sm">$</span>
                    <input
                      type="number"
                      step="0.50"
                      min="0"
                      value={tipFixed}
                      onChange={(e) => setTipFixed(e.target.value)}
                      placeholder="5.00"
                      className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-sm font-bold min-h-[42px]"
                    />
                  </div>
                  {tipAmount > 0 && (
                    <p className="mt-2 text-sm font-extrabold text-emerald-400 flex items-center gap-1.5">
                      <span>💵</span>
                      <span>Tip: ${tipAmount.toFixed(2)}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Who contributes to the tip? */}
              {tipMode !== 'none' && tipAmount > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <span>👥</span> Who&apos;s tipping?
                    </label>
                    <div className="flex items-center gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={selectAllForTip}
                        className="text-blue-400 hover:text-blue-300 font-semibold"
                      >
                        All
                      </button>
                      <span className="text-slate-600">•</span>
                      <button
                        type="button"
                        onClick={clearAllForTip}
                        className="text-slate-400 hover:text-slate-300 font-semibold"
                      >
                        None
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {participants.map((p) => {
                      const isSelected = tipParticipantIds.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => toggleTipParticipant(p.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all min-h-[36px] touch-manipulation active:scale-95 ${
                            isSelected
                              ? 'bg-emerald-600 text-white ring-2 ring-emerald-400/40 shadow-sm'
                              : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'
                          }`}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: p.color }}
                          />
                          <span>{p.name}</span>
                          {isSelected && <span className="font-bold">✓</span>}
                        </button>
                      );
                    })}
                  </div>

                  {/* Tip per person preview */}
                  {tipParticipantIds.length > 0 && (
                    <div className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-emerald-300 font-semibold">
                          Each tipper pays:
                        </span>
                        <span className="text-emerald-400 font-extrabold text-sm">
                          ${tipPerPerson.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-200/60 mt-1">
                        ${tipAmount.toFixed(2)} ÷ {tipParticipantIds.length} = ${tipPerPerson.toFixed(2)} per person
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ==================== INDIVIDUAL BILLS ==================== */}
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
          {finalBills
            .sort((a, b) => b.grandTotal - a.grandTotal)
            .map((bill) => (
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
                      {bill.tipAmount > 0 && ' + tip'}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xl font-black text-emerald-400">
                    ${bill.grandTotal.toFixed(2)}
                  </span>
                  {bill.tipAmount > 0 && (
                    <span className="block text-[10px] text-slate-400">
                      incl. ${bill.tipAmount.toFixed(2)} tip
                    </span>
                  )}
                </div>
              </div>

              {/* Itemized breakdown */}
              {bill.items.length > 0 || bill.tipAmount > 0 ? (
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
                  {bill.tipAmount > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-emerald-300/80 font-medium flex items-center gap-1">
                        <span>💵</span> Tip
                      </span>
                      <span className="font-semibold text-emerald-400 shrink-0">
                        ${bill.tipAmount.toFixed(2)}
                      </span>
                    </div>
                  )}
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

      {/* ==================== GRAND TOTAL CARD ==================== */}
      <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 shadow-2xl space-y-3">
        <div className="flex items-center justify-between text-slate-300 text-sm">
          <span>Subtotal ({orders.length} orders)</span>
          <span className="font-bold">${total.toFixed(2)}</span>
        </div>

        {tipAmount > 0 && (
          <div className="flex items-center justify-between text-emerald-400 text-sm">
            <span className="flex items-center gap-1">
              <span>💵</span>
              <span>Tip {tipMode === 'percentage' ? `(${tipPercentage}%)` : ''}</span>
            </span>
            <span className="font-bold">+${tipAmount.toFixed(2)}</span>
          </div>
        )}

        {unassignedAmount > 0 && (
          <div className="flex items-center justify-between text-amber-400 text-xs font-semibold">
            <span>⚠️ Unassigned on table</span>
            <span>${unassignedAmount.toFixed(2)}</span>
          </div>
        )}

        <div className="pt-3 border-t border-slate-700/80 flex items-center justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider font-extrabold text-slate-400 block">
              Grand Total
            </span>
            <span className="text-2xl font-black text-white">
              ${grandTotalWithTip.toFixed(2)}
            </span>
          </div>

          {!isClosed ? (
            <button
              onClick={handleCloseSession}
              disabled={isPending}
              className="px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold transition-all active:scale-95 border border-slate-600 min-h-[42px]"
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
