'use client';

import { useState, useTransition } from 'react';
import {
  Order,
  Participant,
  Assignment,
  MenuItem,
} from '@/types';
import {
  createBatchOrders,
  CreateBatchOrderItem,
  deleteOrder,
  assignItem,
  unassignItem,
  toggleSharedAssignment,
} from '@/lib/actions';
import { getUnassignedQuantity } from '@/lib/calculations';

interface OrdersTabProps {
  sessionId: string;
  orders: Order[];
  participants: Participant[];
  assignments: (Assignment & { participant: Participant })[];
  menuItems: MenuItem[];
  isClosed: boolean;
}

export interface RoundItem {
  id: string;
  menuItemId?: string;
  name: string;
  unitPrice: number;
  quantity: number;
  category: 'drinks' | 'food' | 'other';
  splitType: 'individual' | 'shared';
  assignedParticipantIds: string[];
}

export default function OrdersTab({
  sessionId,
  orders,
  participants,
  assignments,
  menuItems,
  isClosed,
}: OrdersTabProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [roundItems, setRoundItems] = useState<RoundItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<'all' | 'drinks' | 'food' | 'other' | 'custom'>('all');

  // Custom item state
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [customQuantity, setCustomQuantity] = useState(1);
  const [customCategory, setCustomCategory] = useState<'drinks' | 'food' | 'other'>('drinks');
  const [customSplitType, setCustomSplitType] = useState<'individual' | 'shared'>('individual');

  // Assign modal state (for individual items already placed)
  const [assigningOrder, setAssigningOrder] = useState<Order | null>(null);

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Active menu items
  const activeMenu = menuItems.filter((i) => i.is_active);

  // Helper: check quantity of a menu item in current round
  const getItemQtyInRound = (menuItemId: string) => {
    const item = roundItems.find((r) => r.menuItemId === menuItemId);
    return item ? item.quantity : 0;
  };

  // Helper: count items from a specific category in current round
  const getCategoryCountInRound = (cat: 'drinks' | 'food' | 'other') => {
    return roundItems
      .filter((r) => r.category === cat)
      .reduce((sum, r) => sum + r.quantity, 0);
  };

  // Add a menu item to the round
  const handleAddItem = (item: MenuItem) => {
    setError(null);
    setRoundItems((prev) => {
      const existing = prev.find((r) => r.menuItemId === item.id);
      if (existing) {
        return prev.map((r) =>
          r.menuItemId === item.id ? { ...r, quantity: r.quantity + 1 } : r
        );
      }
      return [
        ...prev,
        {
          id: `menu-${item.id}`,
          menuItemId: item.id,
          name: item.name,
          unitPrice: Number(item.price),
          quantity: 1,
          category: item.category as 'drinks' | 'food' | 'other',
          splitType: item.default_split,
          assignedParticipantIds: [],
        },
      ];
    });
  };

  // Remove / decrement a menu item in the round
  const handleRemoveItem = (menuItemId: string) => {
    setError(null);
    setRoundItems((prev) => {
      const existing = prev.find((r) => r.menuItemId === menuItemId);
      if (!existing) return prev;
      if (existing.quantity > 1) {
        return prev.map((r) =>
          r.menuItemId === menuItemId ? { ...r, quantity: r.quantity - 1 } : r
        );
      }
      return prev.filter((r) => r.menuItemId !== menuItemId);
    });
  };

  // Stepper inside round review
  const handleUpdateRoundItemQty = (id: string, delta: number) => {
    setError(null);
    setRoundItems((prev) =>
      prev
        .map((r) => {
          if (r.id === id) {
            const next = r.quantity + delta;
            return next > 0 ? { ...r, quantity: next } : null;
          }
          return r;
        })
        .filter(Boolean) as RoundItem[]
    );
  };

  // Toggle friend assignment on a round item
  const handleToggleRoundItemParticipant = (
    itemId: string,
    participantId: string,
    splitType: 'individual' | 'shared'
  ) => {
    setRoundItems((prev) =>
      prev.map((r) => {
        if (r.id !== itemId) return r;
        if (splitType === 'shared') {
          const has = r.assignedParticipantIds.includes(participantId);
          return {
            ...r,
            assignedParticipantIds: has
              ? r.assignedParticipantIds.filter((id) => id !== participantId)
              : [...r.assignedParticipantIds, participantId],
          };
        } else {
          const has = r.assignedParticipantIds.includes(participantId);
          return {
            ...r,
            assignedParticipantIds: has ? [] : [participantId],
          };
        }
      })
    );
  };

  // Toggle split type on a round item
  const handleToggleRoundItemSplit = (itemId: string) => {
    setRoundItems((prev) =>
      prev.map((r) => {
        if (r.id !== itemId) return r;
        return {
          ...r,
          splitType: r.splitType === 'shared' ? 'individual' : 'shared',
          assignedParticipantIds: [],
        };
      })
    );
  };

  // Add custom off-menu item
  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    const name = customName.trim();
    const price = parseFloat(customPrice);
    if (!name || isNaN(price) || price < 0) {
      setError('Please provide a valid item name and price');
      return;
    }

    setRoundItems((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name,
        unitPrice: price,
        quantity: customQuantity,
        category: customCategory,
        splitType: customSplitType,
        assignedParticipantIds: [],
      },
    ]);

    setCustomName('');
    setCustomPrice('');
    setCustomQuantity(1);
    setError(null);
    setActiveCategory('all');
  };

  // Place full multi-category round
  const handlePlaceRound = async () => {
    if (roundItems.length === 0) {
      setError('Please select at least one item');
      return;
    }

    setError(null);

    startTransition(async () => {
      const itemsToSubmit: CreateBatchOrderItem[] = roundItems.map((r) => ({
        menu_item_id: r.menuItemId || null,
        item_name: r.name,
        quantity: r.quantity,
        unit_price: r.unitPrice,
        split_type: r.splitType,
        assigned_participant_ids: r.assignedParticipantIds,
      }));

      const res = await createBatchOrders(sessionId, itemsToSubmit);
      if (res.success) {
        setIsAddOpen(false);
        setRoundItems([]);
        setCustomName('');
        setCustomPrice('');
        setError(null);
      } else {
        setError(res.error || 'Failed to create orders');
      }
    });
  };

  const totalRoundItemsCount = roundItems.reduce((sum, r) => sum + r.quantity, 0);
  const totalRoundCost = roundItems.reduce((sum, r) => sum + r.quantity * r.unitPrice, 0);

  // Delete an order
  const handleDeleteOrder = async (orderId: string, itemName: string) => {
    if (confirm(`Remove "${itemName}" from orders?`)) {
      startTransition(async () => {
        await deleteOrder(orderId, sessionId);
      });
    }
  };

  // Toggle a friend on a shared / food order
  const handleToggleSharer = async (order: Order, participant: Participant) => {
    if (isClosed) return;
    const isAssigned = assignments.some(
      (a) => a.order_id === order.id && a.participant_id === participant.id
    );

    startTransition(async () => {
      await toggleSharedAssignment(
        order.id,
        participant.id,
        isAssigned,
        sessionId
      );
    });
  };

  // Update quantity for individual assignment
  const handleUpdateAssignmentQty = async (
    order: Order,
    participantId: string,
    newQty: number
  ) => {
    if (isClosed) return;
    startTransition(async () => {
      if (newQty <= 0) {
        await unassignItem(order.id, participantId, sessionId);
      } else {
        await assignItem(order.id, participantId, newQty, sessionId);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>📝</span> Orders & Rounds
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {orders.length} {orders.length === 1 ? 'order' : 'orders'} placed
          </p>
        </div>

        {!isClosed && (
          <button
            onClick={() => {
              setError(null);
              setRoundItems([]);
              setActiveCategory('all');
              setIsAddOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-lg shadow-blue-600/30 active:scale-95 transition-all min-h-[44px]"
          >
            <span className="text-lg leading-none">+</span>
            New Order
          </button>
        )}
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-slate-700 bg-slate-800/30">
          <div className="text-4xl mb-3">🍻</div>
          <h3 className="text-base font-bold text-white mb-1">No orders yet</h3>
          <p className="text-xs text-slate-400 mb-4 max-w-xs mx-auto">
            Order drinks or food from the menu. Food can be assigned to 1 person or split among many!
          </p>
          {!isClosed && (
            <button
              onClick={() => {
                setError(null);
                setRoundItems([]);
                setActiveCategory('all');
                setIsAddOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
            >
              + Place First Order
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {orders.map((order) => {
            const orderAssignments = assignments.filter((a) => a.order_id === order.id);
            const totalOrderPrice = order.quantity * order.unit_price;
            const unassigned = getUnassignedQuantity(order, assignments);
            const isShared = order.split_type === 'shared';
            const sharersCount = orderAssignments.length;
            const perSharerPrice = sharersCount > 0 ? totalOrderPrice / sharersCount : totalOrderPrice;

            return (
              <div
                key={order.id}
                className="rounded-2xl bg-slate-800/90 border border-slate-700/80 p-4 shadow-lg"
              >
                {/* Order Top Bar: Item, Qty, Price, Split type */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-700/60 flex items-center justify-center text-xl shrink-0">
                      {isShared ? '🍕' : '🍺'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-white text-base">
                          {order.item_name}
                        </h4>
                        <span className="text-xs font-bold text-slate-400">
                          × {order.quantity}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <span className="text-emerald-400 font-semibold">
                          ${Number(order.unit_price).toFixed(2)} ea
                        </span>
                        <span>•</span>
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            isShared
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-blue-500/20 text-blue-300'
                          }`}
                        >
                          {isShared ? 'Food / Split' : 'Individual'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-base font-black text-white">
                      ${totalOrderPrice.toFixed(2)}
                    </span>
                    {!isClosed && (
                      <button
                        onClick={() => handleDeleteOrder(order.id, order.item_name)}
                        disabled={isPending}
                        aria-label="Delete order"
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-400 transition-colors"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Assignment section */}
                <div className="mt-3.5 pt-3 border-t border-slate-700/60">
                  {isShared ? (
                    /* FOOD / SHARED SPLIT: 1 person or split among friends */
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div>
                          {sharersCount === 0 ? (
                            <span className="text-amber-400 font-bold flex items-center gap-1">
                              ⚠️ Not assigned yet — tap who ordered this:
                            </span>
                          ) : sharersCount === 1 ? (
                            <span className="text-blue-300 font-bold">
                              👤 1 person eating (pays full ${totalOrderPrice.toFixed(2)})
                            </span>
                          ) : (
                            <span className="text-emerald-400 font-bold">
                              🍕 Split {sharersCount} ways (${perSharerPrice.toFixed(2)} each)
                            </span>
                          )}
                        </div>

                        <span className="text-[11px] text-slate-400 hidden sm:inline">
                          Tap to add/remove friends
                        </span>
                      </div>

                      {/* Pill buttons for every participant to easily join/leave */}
                      <div className="flex flex-wrap gap-2">
                        {participants.map((p) => {
                          const isSharing = orderAssignments.some(
                            (a) => a.participant_id === p.id
                          );
                          return (
                            <button
                              key={p.id}
                              onClick={() => handleToggleSharer(order, p)}
                              disabled={isClosed || isPending}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all min-h-[38px] active:scale-95 ${
                                isSharing
                                  ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400/40'
                                  : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                              }`}
                            >
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: p.color }}
                              />
                              <span>{p.name}</span>
                              {isSharing && (
                                <span className="text-[11px] bg-blue-700/90 rounded-full px-1.5 py-0.5 font-bold">
                                  ${perSharerPrice.toFixed(2)}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {participants.length === 0 && (
                        <p className="text-xs text-amber-400/80 italic">
                          Add friends in the Friends tab to assign this dish!
                        </p>
                      )}
                    </div>
                  ) : (
                    /* INDIVIDUAL SPLIT: Assign units to specific friends */
                    <div>
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="text-slate-400 font-medium">Claimed units:</span>
                        {unassigned > 0 ? (
                          <span className="text-amber-400 font-bold flex items-center gap-1">
                            ⚠️ {unassigned} left unassigned
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            ✅ All {order.quantity} assigned
                          </span>
                        )}
                      </div>

                      {/* Display assigned friends */}
                      <div className="flex flex-wrap gap-2 items-center">
                        {orderAssignments.map((a) => (
                          <div
                            key={a.id}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-700/70 border border-slate-600/60 text-xs text-white"
                          >
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: a.participant.color }}
                            />
                            <span className="font-medium">{a.participant.name}:</span>
                            <span className="font-extrabold text-blue-400">{a.quantity}</span>
                          </div>
                        ))}

                        {!isClosed && (
                          <button
                            onClick={() => setAssigningOrder(order)}
                            className="px-3 py-1 rounded-full bg-slate-700 hover:bg-slate-600 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            ✏️ {orderAssignments.length > 0 ? 'Edit Assignments' : 'Assign to Friends'}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* NEW ORDER / ROUND BOTTOM SHEET */}
      {isAddOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border-t sm:border border-slate-700/80 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl animate-slide-up max-h-[90dvh] flex flex-col overscroll-contain pb-[max(5.5rem,env(safe-area-inset-bottom))] sm:pb-6">
            {/* Grab handle for mobile */}
            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-3 sm:hidden shrink-0" />

            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-lg">
                  🍻
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">
                    Add Items & Rounds
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Order drinks, food & snacks across categories at once
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-2.5 mb-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs shrink-0 flex items-center gap-1.5">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Scrollable Content Area */}
            <div className="overflow-y-auto flex-1 space-y-4 pr-1 -mr-1">
              {/* Category Filter Tabs */}
              <div>
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveCategory('all')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1.5 min-h-[36px] ${
                      activeCategory === 'all'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>All Menu</span>
                    {roundItems.length > 0 && (
                      <span className="w-4 h-4 rounded-full bg-white/20 text-[10px] flex items-center justify-center font-black">
                        {totalRoundItemsCount}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveCategory('drinks')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1.5 min-h-[36px] ${
                      activeCategory === 'drinks'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>🍺 Drinks</span>
                    {getCategoryCountInRound('drinks') > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-blue-400 text-slate-950 text-[10px] font-black">
                        {getCategoryCountInRound('drinks')}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveCategory('food')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1.5 min-h-[36px] ${
                      activeCategory === 'food'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>🍕 Food</span>
                    {getCategoryCountInRound('food') > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-amber-300 text-slate-950 text-[10px] font-black">
                        {getCategoryCountInRound('food')}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveCategory('other')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1.5 min-h-[36px] ${
                      activeCategory === 'other'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>🍟 Other</span>
                    {getCategoryCountInRound('other') > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-purple-300 text-slate-950 text-[10px] font-black">
                        {getCategoryCountInRound('other')}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveCategory('custom')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1 min-h-[36px] ${
                      activeCategory === 'custom'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>✨ Custom</span>
                  </button>
                </div>
              </div>

              {/* MENU ITEMS SECTION (when not purely on custom) */}
              {activeCategory !== 'custom' && (
                <div className="space-y-4">
                  {(['drinks', 'food', 'other'] as const).map((catKey) => {
                    if (activeCategory !== 'all' && activeCategory !== catKey) return null;
                    const itemsInCat = activeMenu.filter((m) => m.category === catKey);
                    if (itemsInCat.length === 0) return null;

                    const catTitle =
                      catKey === 'drinks' ? '🍺 Drinks' : catKey === 'food' ? '🍕 Food' : '🍟 Other';

                    return (
                      <div key={catKey}>
                        {activeCategory === 'all' && (
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                              {catTitle}
                            </span>
                            {getCategoryCountInRound(catKey) > 0 && (
                              <span className="text-[11px] font-semibold text-blue-400">
                                {getCategoryCountInRound(catKey)} selected
                              </span>
                            )}
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2">
                          {itemsInCat.map((item) => {
                            const inRoundQty = getItemQtyInRound(item.id);
                            return (
                              <div
                                key={item.id}
                                className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                                  inRoundQty > 0
                                    ? 'bg-blue-950/40 border-blue-500/80 shadow-md ring-1 ring-blue-500/30'
                                    : 'bg-slate-800/80 border-slate-700 hover:border-slate-600'
                                }`}
                              >
                                <div className="mb-2">
                                  <div className="flex items-start justify-between gap-1">
                                    <span className="font-bold text-xs text-white line-clamp-1">
                                      {item.name}
                                    </span>
                                    <span className="text-[10px] px-1 py-0.5 rounded bg-slate-700/60 text-slate-300 shrink-0">
                                      {item.default_split === 'shared' ? '🍕' : '🍺'}
                                    </span>
                                  </div>
                                  <div className="text-xs font-extrabold text-emerald-400 mt-0.5">
                                    ${Number(item.price).toFixed(2)}
                                  </div>
                                </div>

                                {inRoundQty === 0 ? (
                                  <button
                                    type="button"
                                    onClick={() => handleAddItem(item)}
                                    className="w-full py-1 px-2 rounded-lg bg-slate-700/90 hover:bg-blue-600 active:bg-blue-700 text-slate-200 hover:text-white text-xs font-bold transition-colors flex items-center justify-center gap-1 min-h-[34px]"
                                  >
                                    <span className="text-sm leading-none">+</span>
                                    <span>Add</span>
                                  </button>
                                ) : (
                                  <div className="flex items-center justify-between bg-blue-600/30 rounded-lg p-0.5 border border-blue-500/40 min-h-[34px]">
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveItem(item.id)}
                                      className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center active:scale-95"
                                    >
                                      -
                                    </button>
                                    <span className="font-black text-xs text-white px-1">
                                      {inRoundQty}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleAddItem(item)}
                                      className="w-7 h-7 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center active:scale-95"
                                    >
                                      +
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* CUSTOM ITEM FORM (Available on 'custom' tab) */}
              {activeCategory === 'custom' && (
                <form
                  onSubmit={handleAddCustomItem}
                  className="p-4 bg-slate-800/60 rounded-2xl border border-slate-700 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1">
                      <span>✨</span> Off-Menu / Custom Item
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Item Name *
                      </label>
                      <input
                        type="text"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        placeholder="e.g. Special Cocktail, Hookah"
                        required
                        className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500 min-h-[40px]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Price ($) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={customPrice}
                        onChange={(e) => setCustomPrice(e.target.value)}
                        placeholder="10.00"
                        required
                        className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500 min-h-[40px]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Category
                      </label>
                      <select
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value as any)}
                        className="w-full px-2.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500 min-h-[40px]"
                      >
                        <option value="drinks">🍺 Drinks</option>
                        <option value="food">🍕 Food</option>
                        <option value="other">🍟 Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Split Rule
                      </label>
                      <select
                        value={customSplitType}
                        onChange={(e) => setCustomSplitType(e.target.value as any)}
                        className="w-full px-2.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500 min-h-[40px]"
                      >
                        <option value="individual">🍺 By Unit (Individual)</option>
                        <option value="shared">🍕 Shared (Split Price)</option>
                      </select>
                    </div>
                  </div>

                  {/* Quantity Stepper for Custom Item */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] font-semibold text-slate-400">
                      Quantity:
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCustomQuantity((q) => Math.max(1, q - 1))}
                        className="w-8 h-8 rounded-lg bg-slate-700 text-white font-bold text-sm flex items-center justify-center"
                      >
                        -
                      </button>
                      <span className="font-bold text-sm text-white w-6 text-center">
                        {customQuantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCustomQuantity((q) => q + 1)}
                        className="w-8 h-8 rounded-lg bg-slate-700 text-white font-bold text-sm flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md active:scale-98 min-h-[40px]"
                  >
                    + Add to Round
                  </button>
                </form>
              )}

              {/* CURRENT ROUND ITEMS SUMMARY & ASSIGNMENTS */}
              {roundItems.length > 0 && (
                <div className="pt-2 border-t border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <span>🛒</span> Selected Round ({totalRoundItemsCount} items)
                    </span>
                    <button
                      type="button"
                      onClick={() => setRoundItems([])}
                      className="text-[11px] font-semibold text-rose-400 hover:text-rose-300"
                    >
                      Clear All
                    </button>
                  </div>

                  <div className="space-y-2">
                    {roundItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 bg-slate-800/90 rounded-2xl border border-slate-700/80 space-y-2 shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="font-bold text-xs text-white flex items-center gap-1.5">
                              <span>{item.category === 'drinks' ? '🍺' : item.category === 'food' ? '🍕' : '🍟'}</span>
                              <span className="truncate max-w-[170px]">{item.name}</span>
                            </div>
                            <div className="text-[11px] text-slate-400">
                              ${item.unitPrice.toFixed(2)} × {item.quantity} ={' '}
                              <span className="font-bold text-emerald-400">
                                ${(item.unitPrice * item.quantity).toFixed(2)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleUpdateRoundItemQty(item.id, -1)}
                              className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs flex items-center justify-center active:scale-95"
                            >
                              -
                            </button>
                            <span className="w-5 text-center font-black text-xs text-white">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateRoundItemQty(item.id, 1)}
                              className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs flex items-center justify-center active:scale-95"
                            >
                              +
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateRoundItemQty(item.id, -item.quantity)}
                              className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center ml-0.5 text-xs transition-colors"
                            >
                              ✕
                            </button>
                          </div>
                        </div>

                        {/* Split toggle & friend chips */}
                        <div className="flex items-center justify-between pt-1.5 border-t border-slate-700/60">
                          <button
                            type="button"
                            onClick={() => handleToggleRoundItemSplit(item.id)}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors ${
                              item.splitType === 'shared'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                            }`}
                          >
                            <span>{item.splitType === 'shared' ? '🍕 Food / Shared' : '🍺 Drinks / By Unit'}</span>
                            <span className="text-[9px] opacity-70">↻</span>
                          </button>

                          {participants.length > 0 && (
                            <span className="text-[10px] text-slate-400">
                              {item.splitType === 'shared' ? 'Split with:' : 'Assign to:'}
                            </span>
                          )}
                        </div>

                        {participants.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {participants.map((p) => {
                              const isSelected = item.assignedParticipantIds.includes(p.id);
                              return (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() =>
                                    handleToggleRoundItemParticipant(item.id, p.id, item.splitType)
                                  }
                                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all min-h-[28px] ${
                                    isSelected
                                      ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400'
                                      : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-700/60'
                                  }`}
                                >
                                  <span
                                    className="w-1.5 h-1.5 rounded-full"
                                    style={{ backgroundColor: p.color }}
                                  />
                                  <span className="truncate max-w-[70px]">{p.name}</span>
                                  {isSelected && <span className="font-bold">✓</span>}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* STICKY BOTTOM ACTION BAR */}
            <div className="pt-3 border-t border-slate-800 flex items-center gap-3 shrink-0 bg-slate-900">
              <div className="flex-1">
                <span className="text-[11px] text-slate-400 block">
                  {roundItems.length === 0
                    ? 'No items selected'
                    : `${totalRoundItemsCount} item${totalRoundItemsCount > 1 ? 's' : ''} in round`}
                </span>
                <span className="text-lg font-black text-emerald-400">
                  ${totalRoundCost.toFixed(2)}
                </span>
              </div>

              <button
                type="button"
                onClick={handlePlaceRound}
                disabled={isPending || roundItems.length === 0}
                className="py-3 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 active:scale-95 text-white font-bold text-xs shadow-lg shadow-blue-900/30 transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2 min-h-[46px]"
              >
                {isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Placing...</span>
                  </>
                ) : (
                  <span>Place Round ({totalRoundItemsCount}) →</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INDIVIDUAL ASSIGNMENT MODAL */}
      {assigningOrder && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border-t sm:border border-slate-700 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-slide-up max-h-[85dvh] overflow-y-auto overscroll-contain pb-[max(6rem,env(safe-area-inset-bottom))] sm:pb-6">
            {/* Grab handle for mobile */}
            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-4 sm:hidden" />
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>🍺</span> Assign {assigningOrder.item_name}
                </h3>
                <p className="text-xs text-slate-400">
                  Total ordered: {assigningOrder.quantity} units
                </p>
              </div>
              <button
                onClick={() => setAssigningOrder(null)}
                className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Current unassigned count */}
            {(() => {
              const currentUnassigned = getUnassignedQuantity(assigningOrder, assignments);
              return (
                <div
                  className={`p-3 rounded-xl mb-4 text-xs font-semibold flex items-center justify-between ${
                    currentUnassigned > 0
                      ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
                      : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                  }`}
                >
                  <span>
                    {currentUnassigned > 0
                      ? `⚠️ ${currentUnassigned} remaining to assign`
                      : '✅ All units assigned!'}
                  </span>
                  <span>${Number(assigningOrder.unit_price).toFixed(2)} each</span>
                </div>
              );
            })()}

            {/* Friends Stepper List */}
            {participants.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4 text-center">
                Please add friends to the session first in the Friends tab!
              </p>
            ) : (
              <div className="space-y-3">
                {participants.map((p) => {
                  const currentAssignment = assignments.find(
                    (a) => a.order_id === assigningOrder.id && a.participant_id === p.id
                  );
                  const currentQty = currentAssignment?.quantity || 0;

                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-800 border border-slate-700/60"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: p.color }}
                        />
                        <span className="font-semibold text-white text-sm">{p.name}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateAssignmentQty(assigningOrder, p.id, currentQty - 1)
                          }
                          disabled={currentQty === 0 || isPending}
                          className="w-9 h-9 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-30 text-white font-bold flex items-center justify-center active:scale-95"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-bold text-white text-base">
                          {currentQty}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateAssignmentQty(assigningOrder, p.id, currentQty + 1)
                          }
                          disabled={
                            getUnassignedQuantity(assigningOrder, assignments) <= 0 || isPending
                          }
                          className="w-9 h-9 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-30 text-white font-bold flex items-center justify-center active:scale-95"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="pt-4 mt-2">
              <button
                type="button"
                onClick={() => setAssigningOrder(null)}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
