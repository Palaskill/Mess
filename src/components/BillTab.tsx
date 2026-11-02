'use client';

import { useState, useTransition, useMemo, useRef } from 'react';
import {
  Share2,
  Check,
  Wallet,
  Coins,
  Lock,
  Scale,
  AlertCircle,
  Copy,
  Sparkles,
} from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Order, Participant, Assignment } from '@/types';
import {
  calculateBills,
  calculateTotal,
  calculateUnassigned,
} from '@/lib/calculations';
import { closeSession } from '@/lib/actions';
import { formatCurrency } from '@/lib/utils';
import SpotlightCard from '@/components/reactbits/SpotlightCard';
import ShinyText from '@/components/reactbits/ShinyText';
import CountUp from '@/components/reactbits/CountUp';
import { useLanguage } from '@/lib/i18n';

interface BillTabProps {
  sessionId: string;
  sessionName: string;
  isClosed: boolean;
  orders: Order[];
  participants: Participant[];
  assignments: (Assignment & { participant: Participant })[];
}

const FIXED_TIP_PRESETS = [1, 2, 3, 5, 10];

export default function BillTab({
  sessionId,
  sessionName,
  isClosed,
  orders,
  participants,
  assignments,
}: BillTabProps) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  // Tip state: always fixed amount
  const [tipFixed, setTipFixed] = useState('');
  const [tipParticipantIds, setTipParticipantIds] = useState<string[]>([]);
  const [showTipSection, setShowTipSection] = useState(false);

  const bills = calculateBills(orders, assignments, participants);
  const total = calculateTotal(orders);
  const unassignedAmount = calculateUnassigned(orders, assignments);
  const pendingWeightOrders = orders.filter((o) => Number(o.unit_price) === 0);

  // GSAP Entrance Animations
  useGSAP(
    () => {
      gsap.fromTo(
        '.bill-card',
        { y: 20, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.4,
          stagger: 0.05,
          ease: 'power2.out',
          clearProps: 'opacity,transform',
        }
      );
      gsap.fromTo(
        '.total-card',
        { scale: 0.96, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 0.45,
          delay: 0.05,
          ease: 'back.out(1.2)',
          clearProps: 'opacity,transform',
        }
      );
    },
    { scope: containerRef, dependencies: [] }
  );

  // Tip amount is always the parsed fixed amount
  const tipAmount = useMemo(() => {
    const parsed = parseFloat(tipFixed);
    return !isNaN(parsed) && parsed > 0 ? parsed : 0;
  }, [tipFixed]);

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
    if (tipParticipantIds.length === 0) {
      setTipParticipantIds(participants.map((p) => p.id));
    }
  };

  // Preset button handler
  const handleSelectPreset = (amount: number) => {
    setTipFixed(amount.toString());
    if (tipParticipantIds.length === 0) {
      setTipParticipantIds(participants.map((p) => p.id));
    }
  };

  // Clear tip handler
  const handleClearTip = () => {
    setTipFixed('');
    setShowTipSection(false);
  };

  // Generate formatted text breakdown
  const generateSummaryText = () => {
    let text = `🍻 *${sessionName} — ${t.bill.shareHeader}*\n\n`;

    finalBills.forEach((b) => {
      text += `👤 *${b.participant.name}*: ${formatCurrency(b.grandTotal)}`;
      if (b.tipAmount > 0) {
        text += ` (${t.bill.tip}: ${formatCurrency(b.tipAmount)})`;
      }
      text += '\n';
      b.items.forEach((item) => {
        text += `   • ${item.label} (${formatCurrency(item.amount)})\n`;
      });
      if (b.tipAmount > 0) {
        text += `   • 💵 ${t.bill.tip} (${formatCurrency(b.tipAmount)})\n`;
      }
      text += '\n';
    });

    text += `──────────────\n`;
    text += `💰 *${t.bill.shareSubtotal}*: ${formatCurrency(total)}\n`;
    if (tipAmount > 0) {
      text += `💵 *${t.bill.shareTip}*: ${formatCurrency(tipAmount)}\n`;
    }
    text += `🧾 *${t.bill.shareGrandTotal}*: ${formatCurrency(grandTotalWithTip)}\n`;
    if (unassignedAmount > 0) {
      text += `⚠️ *${t.bill.shareUnassigned}*: ${formatCurrency(unassignedAmount)}\n`;
    }
    text += `\n${t.bill.shareFooter}`;
    return text;
  };

  // Share via iOS native share sheet (WhatsApp, Messages, etc.) or clipboard fallback
  const handleShareTab = async () => {
    const text = generateSummaryText();
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${sessionName} — Bill Split`,
          text: text,
        });
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return; // User closed share sheet
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleCloseSession = () => {
    if (confirm('Close this session? No more orders or assignments will be edited.')) {
      startTransition(async () => {
        await closeSession(sessionId);
      });
    }
  };

  return (
    <div ref={containerRef} className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-400" />
            <span>{t.bill.whoPaysWhat}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {t.bill.realTimeSplit}
          </p>
        </div>

        <button
          onClick={handleShareTab}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-600/30 active:scale-95 transition-all min-h-[44px] touch-manipulation cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-300" />
              <span>{t.bill.copied}</span>
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4" />
              <span>{t.bill.shareTab}</span>
            </>
          )}
        </button>
      </div>

      {/* Unassigned items warning alert */}
      {unassignedAmount > 0 && (
        <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-amber-300">
              {formatCurrency(unassignedAmount)} {t.bill.unassignedAlert}
            </h4>
            <p className="text-xs text-amber-200/80 mt-0.5">
              {t.session.unassignedBadge}
            </p>
          </div>
        </div>
      )}

      {/* Pending weight/cheese items alert */}
      {pendingWeightOrders.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-start gap-3">
          <Scale className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-amber-300">
              {pendingWeightOrders.length} {t.bill.weightAlert}
            </h4>
            <p className="text-xs text-amber-200/80 mt-0.5">
              {t.orders.weightPending}
            </p>
          </div>
        </div>
      )}

      {/* ==================== TIP SECTION ==================== */}
      {participants.length > 0 && (
        <div className="rounded-2xl border border-slate-700/80 bg-slate-800/60 overflow-hidden shadow-md">
          {/* Tip Toggle Header */}
          <button
            type="button"
            disabled={isClosed}
            onClick={() => (!isClosed && (showTipSection ? setShowTipSection(false) : handleOpenTip()))}
            className={`w-full flex items-center justify-between p-4 text-start transition-colors ${
              isClosed ? 'cursor-default opacity-90' : 'hover:bg-slate-800/80 active:bg-slate-800 cursor-pointer'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-lg">
                <Coins className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <span className="font-bold text-sm text-white block leading-tight">
                  {t.bill.tip}
                </span>
                <span className="text-[11px] text-slate-400">
                  {tipAmount > 0
                    ? `${formatCurrency(tipAmount)} • ${tipParticipantIds.length} ${t.session.friendsSeated}`
                    : isClosed
                    ? '---'
                    : t.bill.tipOptional}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {tipAmount > 0 && (
                <span className="text-xs font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  +{formatCurrency(tipAmount)}
                </span>
              )}
              {!isClosed && (
                <span className={`text-slate-400 text-xs transition-transform ${showTipSection ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              )}
            </div>
          </button>

          {/* Tip Configuration Panel */}
          {showTipSection && (
            <div className="p-4 pt-0 space-y-4 border-t border-slate-700/60">
              {/* Quick Fixed Amount Presets */}
              <div className="pt-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    {t.bill.tipAmount}
                  </label>
                  {tipAmount > 0 && (
                    <button
                      type="button"
                      onClick={handleClearTip}
                      className="text-[11px] font-semibold text-rose-400 hover:text-rose-300 cursor-pointer"
                    >
                      {t.bill.removeTip}
                    </button>
                  )}
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {FIXED_TIP_PRESETS.map((amt) => {
                    const isSelected = tipAmount === amt;
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => handleSelectPreset(amt)}
                        className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all min-h-[44px] touch-manipulation active:scale-95 cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400/40'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                        }`}
                      >
                        {amt} DT
                      </button>
                    );
                  })}
                </div>

                {/* Custom Fixed Amount Input */}
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-bold text-sm">DT</span>
                  <input
                    type="number"
                    step="0.500"
                    min="0"
                    inputMode="decimal"
                    value={tipFixed}
                    onChange={(e) => {
                      setTipFixed(e.target.value);
                      if (tipParticipantIds.length === 0) {
                        setTipParticipantIds(participants.map((p) => p.id));
                      }
                    }}
                    placeholder="ex: 3.500"
                    className="flex-1 px-4 py-3 rounded-2xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-base font-bold min-h-[46px]"
                  />
                </div>

                {tipAmount > 0 && (
                  <p className="mt-2 text-sm font-extrabold text-emerald-400 flex items-center gap-1.5">
                    <span>💵</span>
                    <span>{t.bill.tip} : {formatCurrency(tipAmount)}</span>
                  </p>
                )}
              </div>

              {/* Who contributes to the tip? */}
              {tipAmount > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <span>👥</span> {t.bill.whoTips}
                    </label>
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={selectAllForTip}
                        className="text-blue-400 hover:text-blue-300 font-bold px-2 py-1 min-h-[36px] flex items-center touch-manipulation cursor-pointer"
                      >
                        {t.bill.all}
                      </button>
                      <span className="text-slate-600">•</span>
                      <button
                        type="button"
                        onClick={clearAllForTip}
                        className="text-slate-400 hover:text-slate-300 font-bold px-2 py-1 min-h-[36px] flex items-center touch-manipulation cursor-pointer"
                      >
                        {t.bill.none}
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
                          className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-semibold transition-all min-h-[40px] touch-manipulation active:scale-95 cursor-pointer ${
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
                          {t.bill.eachTipperPays}
                        </span>
                        <span className="text-emerald-400 font-extrabold text-sm">
                          {formatCurrency(tipPerPerson)}
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-200/60 mt-1">
                        {formatCurrency(tipAmount)} ÷ {tipParticipantIds.length} = {formatCurrency(tipPerPerson)}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ==================== VISUAL BILL BREAKDOWN BAR ==================== */}
      {grandTotalWithTip > 0 && participants.length > 0 && (
        <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md space-y-2.5 transition-all">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-300 flex items-center gap-1.5">
              <span>📊</span>
              <span>{t.bill.visualSplit}</span>
            </span>
            <span className="text-[11px] font-semibold text-emerald-400">
              {t.bill.grandTotal} {formatCurrency(grandTotalWithTip)}
            </span>
          </div>

          {/* Segmented Visual Progress Bar */}
          <div className="h-3.5 w-full rounded-full bg-slate-900/90 overflow-hidden flex p-0.5 gap-0.5 border border-slate-700/60 shadow-inner">
            {finalBills
              .filter((b) => b.grandTotal > 0)
              .sort((a, b) => b.grandTotal - a.grandTotal)
              .map((b) => {
                const percent = Math.max(1, (b.grandTotal / grandTotalWithTip) * 100);
                return (
                  <div
                    key={b.participant.id}
                    className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-500 ease-out relative group"
                    style={{
                      width: `${percent}%`,
                      backgroundColor: b.participant.color,
                    }}
                    title={`${b.participant.name}: ${percent.toFixed(1)}% (${formatCurrency(b.grandTotal)})`}
                  />
                );
              })}
          </div>

          {/* Interactive Legend Tags */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {finalBills
              .filter((b) => b.grandTotal > 0)
              .sort((a, b) => b.grandTotal - a.grandTotal)
              .map((b) => {
                const percent = ((b.grandTotal / grandTotalWithTip) * 100).toFixed(0);
                return (
                  <div
                    key={b.participant.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900/60 border border-slate-700/60 text-[11px] font-semibold text-slate-300 transition-transform active:scale-95"
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: b.participant.color }}
                    />
                    <span className="truncate max-w-[90px]">{b.participant.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono font-bold">
                      {percent}%
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ==================== INDIVIDUAL BILLS ==================== */}
      {participants.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-slate-700 bg-slate-800/30">
          <div className="text-4xl mb-3">👥</div>
          <h3 className="text-base font-bold text-white mb-1">{t.friends.noFriends}</h3>
          <p className="text-xs text-slate-400">
            {t.friends.noFriendsDesc}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {finalBills
            .sort((a, b) => b.grandTotal - a.grandTotal)
            .map((bill) => (
            <SpotlightCard
              key={bill.participant.id}
              className="bill-card p-4 rounded-2xl bg-slate-800/90 border border-slate-700/80 shadow-md space-y-3"
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
                      {bill.items.length} {bill.items.length === 1 ? t.common.item : t.common.items}
                      {bill.tipAmount > 0 && ` + ${t.bill.tip}`}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <CountUp
                    to={bill.grandTotal}
                    decimals={3}
                    currency="DT"
                    className="text-xl font-black text-emerald-400 block"
                  />
                  {bill.tipAmount > 0 && (
                    <span className="block text-[10px] text-slate-400">
                      +{formatCurrency(bill.tipAmount)} {t.bill.tip}
                    </span>
                  )}
                </div>
              </div>

              {/* Itemized breakdown */}
              {bill.items.length > 0 || bill.tipAmount > 0 ? (
                <div className="pt-2.5 border-t border-dashed border-slate-700/60 space-y-1.5">
                  {bill.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs text-slate-300"
                    >
                      <span className="truncate pr-2 rtl:pr-0 rtl:pl-2 font-medium">
                        {item.label}
                      </span>
                      <span className="font-semibold text-slate-400 shrink-0 tabular-nums">
                        {formatCurrency(item.amount)}
                      </span>
                    </div>
                  ))}
                  {bill.tipAmount > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-emerald-300/80 font-medium flex items-center gap-1">
                        <span>💵</span> {t.bill.tip}
                      </span>
                      <span className="font-semibold text-emerald-400 shrink-0 tabular-nums">
                        {formatCurrency(bill.tipAmount)}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="pt-2.5 border-t border-dashed border-slate-700/60 text-xs text-slate-500 italic">
                  {t.bill.noItems}
                </div>
              )}
            </SpotlightCard>
          ))}
        </div>
      )}

      {/* ==================== GRAND TOTAL CARD ==================== */}
      <SpotlightCard
        spotlightColor="rgba(16, 185, 129, 0.15)"
        className="total-card p-5 rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 shadow-2xl space-y-3"
      >
        <div className="flex items-center justify-between text-slate-300 text-sm">
          <span>{t.bill.subtotal} ({orders.length} {t.orders.placedCount})</span>
          <span className="font-bold">{formatCurrency(total)}</span>
        </div>

        {tipAmount > 0 && (
          <div className="flex items-center justify-between text-emerald-400 text-sm">
            <span className="flex items-center gap-1">
              <span>💵</span>
              <span>{t.bill.tip}</span>
            </span>
            <span className="font-bold">+{formatCurrency(tipAmount)}</span>
          </div>
        )}

        {unassignedAmount > 0 && (
          <div className="flex items-center justify-between text-amber-400 text-xs font-semibold">
            <span>⚠️ {t.bill.unassignedTable}</span>
            <span>{formatCurrency(unassignedAmount)}</span>
          </div>
        )}

        <div className="pt-3 border-t border-slate-700/80 flex items-center justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider font-extrabold text-slate-400 block">
              <ShinyText text={t.bill.grandTotal} />
            </span>
            <CountUp
              to={grandTotalWithTip}
              decimals={3}
              currency="DT"
              className="text-2xl sm:text-3xl font-black text-white block mt-0.5"
            />
          </div>

          {!isClosed ? (
            <button
              onClick={handleCloseSession}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-slate-700 hover:bg-slate-600 active:bg-slate-650 text-slate-200 text-xs font-bold transition-all active:scale-95 border border-slate-600/70 min-h-[42px] cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>{isPending ? t.bill.closingTab : t.bill.closeTab}</span>
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-xs font-bold">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>{t.bill.readOnlyBadge}</span>
            </span>
          )}
        </div>
      </SpotlightCard>
    </div>
  );
}
