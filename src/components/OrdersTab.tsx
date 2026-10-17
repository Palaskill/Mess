'use client';

import { useState, useTransition } from 'react';
import {
  Order,
  Participant,
  Assignment,
  MenuItem,
} from '@/types';
import {
  createOrder,
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

export default function OrdersTab({
  sessionId,
  orders,
  participants,
  assignments,
  menuItems,
  isClosed,
}: OrdersTabProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [splitType, setSplitType] = useState<'individual' | 'shared'>('individual');
  const [activeCategory, setActiveCategory] = useState<'all' | 'drinks' | 'food' | 'other'>('all');
  const [selectedInitialSharers, setSelectedInitialSharers] = useState<string[]>([]);

  // Assign modal state (for individual items)
  const [assigningOrder, setAssigningOrder] = useState<Order | null>(null);

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Filter menu items
  const activeMenu = menuItems.filter((i) => i.is_active);
  const filteredMenu = activeMenu.filter((i) =>
    activeCategory === 'all' ? true : i.category === activeCategory
  );

  // Handle selecting a menu item in new order sheet
  const handleSelectMenuItem = (item: MenuItem) => {
    setSelectedMenuItem(item);
    setCustomName(item.name);
    setCustomPrice(item.price.toString());
    setSplitType(item.default_split);
  };

  // Submit new order
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const itemName = customName.trim();
    const unitPrice = parseFloat(customPrice);

    if (!itemName || isNaN(unitPrice) || unitPrice < 0) {
      setError('Please provide valid name and price');
      return;
    }

    const formData = new FormData();
    formData.set('session_id', sessionId);
    formData.set('item_name', itemName);
    formData.set('unit_price', unitPrice.toString());
    formData.set('quantity', quantity.toString());
    formData.set('split_type', splitType);
    if (selectedMenuItem) {
      formData.set('menu_item_id', selectedMenuItem.id);
    }
    if (selectedInitialSharers.length > 0) {
      formData.set('assigned_participant_ids', selectedInitialSharers.join(','));
    }

    startTransition(async () => {
      const res = await createOrder(formData);
      if (res.success) {
        setIsAddOpen(false);
        setSelectedMenuItem(null);
        setCustomName('');
        setCustomPrice('');
        setQuantity(1);
        setSplitType('individual');
        setSelectedInitialSharers([]);
      } else {
        setError(res.error || 'Failed to create order');
      }
    });
  };

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
              setSelectedInitialSharers([]);
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
                setSelectedInitialSharers([]);
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

      {/* NEW ORDER BOTTOM SHEET */}
      {isAddOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border-t sm:border border-slate-700 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-slide-up max-h-[85dvh] overflow-y-auto overscroll-contain pb-[max(6rem,env(safe-area-inset-bottom))] sm:pb-6">
            {/* Grab handle for mobile */}
            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-4 sm:hidden" />
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>➕</span> New Bar Order
              </h3>
              <button
                onClick={() => setIsAddOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 mb-4 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs">
                {error}
              </div>
            )}

            {/* Quick Menu Picker */}
            {activeMenu.length > 0 && (
              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Pick from Menu
                </label>

                {/* Category tabs */}
                <div className="flex gap-1.5 mb-2.5 overflow-x-auto pb-1 scrollbar-none text-xs">
                  {(['all', 'drinks', 'food', 'other'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveCategory(cat)}
                      className={`px-3 py-1 rounded-lg font-semibold capitalize shrink-0 ${
                        activeCategory === cat
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Items grid */}
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1 bg-slate-800/40 rounded-xl border border-slate-700/50">
                  {filteredMenu.map((item) => {
                    const isSelected = selectedMenuItem?.id === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectMenuItem(item)}
                        className={`flex items-center justify-between p-2.5 rounded-lg text-left text-xs transition-all ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                        }`}
                      >
                        <span className="font-semibold truncate pr-1">{item.name}</span>
                        <span className="font-bold opacity-90">${Number(item.price).toFixed(2)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Item Name *
                  </label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => {
                      setCustomName(e.target.value);
                      setSelectedMenuItem(null);
                    }}
                    required
                    placeholder="e.g. Pizza, Wings, Beer"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Price ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    required
                    placeholder="12.00"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm"
                  />
                </div>
              </div>

              {/* Quantity Stepper */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Quantity
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-11 h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-lg flex items-center justify-center border border-slate-700 active:scale-95"
                  >
                    -
                  </button>
                  <span className="text-xl font-black text-white w-12 text-center">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-11 h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-lg flex items-center justify-center border border-slate-700 active:scale-95"
                  >
                    +
                  </button>
                  <div className="ml-auto text-right">
                    <span className="text-xs text-slate-400 block">Total</span>
                    <span className="text-base font-extrabold text-emerald-400">
                      ${((parseFloat(customPrice) || 0) * quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Split Type Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Type of Item
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSplitType('shared');
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      splitType === 'shared'
                        ? 'bg-amber-500/20 border-amber-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    <div className="font-bold text-sm mb-0.5">🍕 Food / Dish</div>
                    <div className="text-[11px] opacity-80 leading-tight">
                      For 1 person or split evenly among sharers
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSplitType('individual');
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      splitType === 'individual'
                        ? 'bg-blue-600/20 border-blue-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    <div className="font-bold text-sm mb-0.5">🍺 Drinks (by unit)</div>
                    <div className="text-[11px] opacity-80 leading-tight">
                      Units assigned to specific people (beers, sodas)
                    </div>
                  </button>
                </div>
              </div>

              {/* Optional: Who ordered this right now? */}
              {participants.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    {splitType === 'shared'
                      ? 'Who is having this? (tap 1 or more friends)'
                      : 'Assign units to (optional):'}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {participants.map((p) => {
                      const isSelected = selectedInitialSharers.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            if (splitType === 'shared') {
                              setSelectedInitialSharers((prev) =>
                                prev.includes(p.id)
                                  ? prev.filter((id) => id !== p.id)
                                  : [...prev, p.id]
                              );
                            } else {
                              setSelectedInitialSharers((prev) =>
                                prev.includes(p.id) ? [] : [p.id]
                              );
                            }
                          }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all min-h-[34px] ${
                            isSelected
                              ? 'bg-blue-600 text-white ring-2 ring-blue-400 shadow-md'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: p.color }}
                          />
                          <span>{p.name}</span>
                          {isSelected && <span>✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isPending || !customName.trim() || !customPrice}
                  className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 active:scale-98 transition-all disabled:opacity-50 min-h-[48px]"
                >
                  {isPending ? 'Adding Order...' : 'Add Order'}
                </button>
              </div>
            </form>
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
