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
    let text = `🍻 *${sessionName} — Addition & Partage*\n\n`;

    finalBills.forEach((b) => {
      text += `👤 *${b.participant.name}*: ${formatCurrency(b.grandTotal)}`;
      if (b.tipAmount > 0) {
        text += ` (dont ${formatCurrency(b.tipAmount)} pourboire)`;
      }
      text += '\n';
      b.items.forEach((item) => {
        text += `   • ${item.label} (${formatCurrency(item.amount)})\n`;
      });
      if (b.tipAmount > 0) {
        text += `   • 💵 Pourboire (${formatCurrency(b.tipAmount)})\n`;
      }
      text += '\n';
    });

    text += `──────────────\n`;
    text += `💰 *Sous-total*: ${formatCurrency(total)}\n`;
    if (tipAmount > 0) {
      text += `💵 *Pourboire*: ${formatCurrency(tipAmount)}\n`;
    }
    text += `🧾 *Grand Total*: ${formatCurrency(grandTotalWithTip)}\n`;
    if (unassignedAmount > 0) {
      text += `⚠️ *Non affecté sur la table*: ${formatCurrency(unassignedAmount)}\n`;
    }
    text += `\nPartagé via MEss 🍺`;
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
            <span>Who Pays What</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time split based on individual & shared items
          </p>
        </div>

        <button
          onClick={handleShareTab}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-600/30 active:scale-95 transition-all min-h-[44px] touch-manipulation cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-300" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4" />
              <span>Share Tab</span>
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
              {formatCurrency(unassignedAmount)} non affecté sur la table !
            </h4>
            <p className="text-xs text-amber-200/80 mt-0.5">
              Certaines consommations n&apos;ont pas encore été attribuées. Rendez-vous dans l&apos;onglet Commandes.
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
              {pendingWeightOrders.length} article(s) au grammage sans prix défini (0 DT)
            </h4>
            <p className="text-xs text-amber-200/80 mt-0.5">
              Rendez-vous dans l&apos;onglet <strong>Commandes</strong> pour ajuster le montant exact ou le poids dès réception de l&apos;addition.
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
            onClick={() => (showTipSection ? setShowTipSection(false) : handleOpenTip())}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-800/80 transition-colors active:bg-slate-800 cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-lg">
                <Coins className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <span className="font-bold text-sm text-white block leading-tight">
                  Ajouter un pourboire
                </span>
                <span className="text-[11px] text-slate-400">
                  {tipAmount > 0
                    ? `${formatCurrency(tipAmount)} • ${tipParticipantIds.length} ami${tipParticipantIds.length !== 1 ? 's' : ''}`
                    : 'Gratification optionnelle pour le service'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {tipAmount > 0 && (
                <span className="text-xs font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  +{formatCurrency(tipAmount)}
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
              {/* Quick Fixed Amount Presets */}
              <div className="pt-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Montant du pourboire (DT)
                  </label>
                  {tipAmount > 0 && (
                    <button
                      type="button"
                      onClick={handleClearTip}
                      className="text-[11px] font-semibold text-rose-400 hover:text-rose-300"
                    >
                      Supprimer pourboire
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
                        className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all min-h-[44px] touch-manipulation active:scale-95 ${
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
                    placeholder="Montant libre (ex: 3.500)"
                    className="flex-1 px-4 py-3 rounded-2xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-base font-bold min-h-[46px]"
                  />
                </div>

                {tipAmount > 0 && (
                  <p className="mt-2 text-sm font-extrabold text-emerald-400 flex items-center gap-1.5">
                    <span>💵</span>
                    <span>Total Pourboire : {formatCurrency(tipAmount)}</span>
                  </p>
                )}
              </div>

              {/* Who contributes to the tip? */}
              {tipAmount > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <span>👥</span> Qui participe au pourboire ?
                    </label>
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={selectAllForTip}
                        className="text-blue-400 hover:text-blue-300 font-bold px-2 py-1 min-h-[36px] flex items-center touch-manipulation"
                      >
                        Tous
                      </button>
                      <span className="text-slate-600">•</span>
                      <button
                        type="button"
                        onClick={clearAllForTip}
                        className="text-slate-400 hover:text-slate-300 font-bold px-2 py-1 min-h-[36px] flex items-center touch-manipulation"
                      >
                        Aucun
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
                          className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-semibold transition-all min-h-[40px] touch-manipulation active:scale-95 ${
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
                          Part par participant :
                        </span>
                        <span className="text-emerald-400 font-extrabold text-sm">
                          {formatCurrency(tipPerPerson)}
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-200/60 mt-1">
                        {formatCurrency(tipAmount)} ÷ {tipParticipantIds.length} = {formatCurrency(tipPerPerson)} par personne
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
                      {bill.items.length} {bill.items.length === 1 ? 'item' : 'items'}
                      {bill.tipAmount > 0 && ' + tip'}
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
                      incl. {formatCurrency(bill.tipAmount)} tip
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
                      <span className="truncate pr-2 font-medium">
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
                        <span>💵</span> Pourboire
                      </span>
                      <span className="font-semibold text-emerald-400 shrink-0 tabular-nums">
                        {formatCurrency(bill.tipAmount)}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="pt-2.5 border-t border-dashed border-slate-700/60 text-xs text-slate-500 italic">
                  Aucun article affecté
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
          <span>Subtotal ({orders.length} orders)</span>
          <span className="font-bold">{formatCurrency(total)}</span>
        </div>

        {tipAmount > 0 && (
          <div className="flex items-center justify-between text-emerald-400 text-sm">
            <span className="flex items-center gap-1">
              <span>💵</span>
              <span>Tip</span>
            </span>
            <span className="font-bold">+{formatCurrency(tipAmount)}</span>
          </div>
        )}

        {unassignedAmount > 0 && (
          <div className="flex items-center justify-between text-amber-400 text-xs font-semibold">
            <span>⚠️ Unassigned on table</span>
            <span>{formatCurrency(unassignedAmount)}</span>
          </div>
        )}

        <div className="pt-3 border-t border-slate-700/80 flex items-center justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider font-extrabold text-slate-400 block">
              <ShinyText text="Grand Total" />
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
              <span>{isPending ? 'Closing...' : 'Close Tab'}</span>
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 text-rose-400 border border-rose-500/30 text-xs font-bold">
              <Lock className="w-3.5 h-3.5 text-rose-400" />
              <span>Closed</span>
            </span>
          )}
        </div>
      </SpotlightCard>
    </div>
  );
}
