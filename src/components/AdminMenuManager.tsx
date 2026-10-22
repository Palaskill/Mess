'use client';

import { useState, useTransition } from 'react';
import { MenuItem } from '@/types';
import {
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
} from '@/lib/actions';

interface AdminMenuManagerProps {
  initialItems: MenuItem[];
}

export default function AdminMenuManager({ initialItems }: AdminMenuManagerProps) {
  const [items, setItems] = useState<MenuItem[]>(initialItems);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'drinks' | 'food' | 'other'>('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Filtered items
  const filteredItems = items.filter((item) => {
    if (selectedCategory === 'all') return true;
    return item.category === selectedCategory;
  });

  const categories = [
    { id: 'all', label: 'All', icon: '🍽️' },
    { id: 'drinks', label: 'Drinks', icon: '🍺' },
    { id: 'food', label: 'Food', icon: '🍕' },
    { id: 'other', label: 'Other', icon: '🍿' },
  ];

  // Handle Add Item
  const handleAddSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);

    startTransition(async () => {
      try {
        const res = await createMenuItem(formData);
        if (res.success && res.data) {
          setIsAddOpen(false);
          setItems((prev) => [...prev, res.data!]);
        } else if (res.success) {
          setIsAddOpen(false);
          const name = formData.get('name') as string;
          const price = parseFloat(formData.get('price') as string);
          const category = (formData.get('category') as any) || 'drinks';
          const default_split = (formData.get('default_split') as any) || 'individual';
          const newItem: MenuItem = {
            id: crypto.randomUUID(),
            name,
            price,
            category,
            default_split,
            is_active: true,
            created_at: new Date().toISOString(),
          };
          setItems((prev) => [...prev, newItem]);
        } else {
          setError(res.error || 'Failed to create item');
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to create item');
      }
    });
  };

  // Handle Edit Item
  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingItem) return;
    const formData = new FormData(e.currentTarget);
    formData.set('id', editingItem.id);
    setError(null);

    startTransition(async () => {
      try {
        const res = await updateMenuItem(formData);
        if (res.success) {
          const name = formData.get('name') as string;
          const price = parseFloat(formData.get('price') as string);
          const category = formData.get('category') as any;
          const default_split = formData.get('default_split') as any;
          const is_active = formData.get('is_active') === 'true';

          setItems((prev) =>
            prev.map((i) =>
              i.id === editingItem.id
                ? { ...i, name, price, category, default_split, is_active }
                : i
            )
          );
          setEditingItem(null);
        } else {
          setError(res.error || 'Failed to update item');
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to update item');
      }
    });
  };

  // Handle Delete Item
  const handleDelete = async (id: string, itemName: string) => {
    if (!confirm(`Delete "${itemName}" from menu?`)) return;
    setDeletingId(id);
    startTransition(async () => {
      try {
        const res = await deleteMenuItem(id);
        if (res.success) {
          setItems((prev) => prev.filter((i) => i.id !== id));
        } else {
          alert(res.error || 'Failed to delete item');
        }
      } catch (err: any) {
        alert(err?.message || 'Failed to delete item');
      } finally {
        setDeletingId(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Category selector pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCategory(c.id as any)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all shrink-0 min-h-[44px] ${
              selectedCategory === c.id
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700/80 border border-slate-700/60'
            }`}
          >
            <span>{c.icon}</span>
            <span>{c.label}</span>
          </button>
        ))}
      </div>

      {/* Item count & Quick Add Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          Showing <span className="font-semibold text-white">{filteredItems.length}</span> items
        </p>
        <button
          onClick={() => {
            setError(null);
            setIsAddOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-lg shadow-blue-600/30 active:scale-95 transition-all min-h-[44px]"
        >
          <span className="text-lg leading-none">+</span>
          Add Item
        </button>
      </div>

      {/* Menu items list */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-slate-700 bg-slate-800/30">
          <div className="text-4xl mb-3">📋</div>
          <h3 className="text-base font-bold text-white mb-1">No items found</h3>
          <p className="text-xs text-slate-400 mb-4">
            {selectedCategory === 'all'
              ? 'Add items to your bar menu so your friends can order easily.'
              : `No items in ${selectedCategory} category yet.`}
          </p>
          <button
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold"
          >
            + Add First Item
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`flex items-center justify-between p-4 rounded-2xl bg-slate-800/90 border transition-all ${
                item.is_active ? 'border-slate-700/80 shadow-md' : 'border-slate-800 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-slate-700/50 flex items-center justify-center text-xl shrink-0">
                  {item.category === 'drinks' ? '🍺' : item.category === 'food' ? '🍕' : '🍿'}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-white text-base truncate">{item.name}</h4>
                    {!item.is_active && (
                      <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">
                        Hidden
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                        item.default_split === 'shared'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-blue-500/20 text-blue-300'
                      }`}
                    >
                      {item.default_split === 'shared' ? '🍕 Shared' : '🍺 Individual'}
                    </span>
                    <span>•</span>
                    <span className="capitalize">{item.category}</span>
                  </div>
                </div>
              </div>

              {/* Price and actions */}
              <div className="flex items-center gap-3 shrink-0 ml-2">
                <span className="text-base font-extrabold text-emerald-400">
                  ${Number(item.price).toFixed(2)}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setError(null);
                      setEditingItem(item);
                    }}
                    aria-label={`Edit ${item.name}`}
                    className="w-9 h-9 rounded-lg flex items-center justify-center bg-slate-700/70 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(item.id, item.name)}
                    disabled={deletingId === item.id || isPending}
                    aria-label={`Delete ${item.name}`}
                    className="w-9 h-9 rounded-lg flex items-center justify-center bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors disabled:opacity-50"
                  >
                    {deletingId === item.id ? '...' : '🗑️'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Item Bottom Sheet / Modal */}
      {isAddOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAddOpen(false);
          }}
        >
          <div
            className="w-full max-w-md bg-slate-900 border-t sm:border border-slate-700/80 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-slide-up max-h-[85dvh] overflow-y-auto overscroll-contain pb-[max(6rem,env(safe-area-inset-bottom))] sm:pb-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Grab handle for mobile */}
            <div className="w-12 h-1.5 bg-slate-600 rounded-full mx-auto mb-4 sm:hidden shrink-0" />
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>➕</span> Add Menu Item
              </h3>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                aria-label="Close dialog"
                className="w-10 h-10 rounded-full bg-slate-800 active:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white active:scale-95 transition-all touch-manipulation"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 mb-4 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Item Name *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. Draught Beer, Margherita Pizza"
                  className="w-full px-4 py-3.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-base min-h-[48px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Price ($) *
                </label>
                <input
                  type="number"
                  name="price"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  required
                  placeholder="4.50"
                  className="w-full px-4 py-3.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-base min-h-[48px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Category
                  </label>
                  <select
                    name="category"
                    defaultValue="drinks"
                    className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="drinks">🍺 Drinks</option>
                    <option value="food">🍕 Food</option>
                    <option value="other">🍿 Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Default Split
                  </label>
                  <select
                    name="default_split"
                    defaultValue="individual"
                    className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="individual">🍺 Individual</option>
                    <option value="shared">🍕 Shared</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 active:scale-98 transition-all disabled:opacity-50 min-h-[48px]"
                >
                  {isPending ? 'Saving...' : 'Add to Menu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {editingItem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingItem(null);
          }}
        >
          <div
            className="w-full max-w-md bg-slate-900 border-t sm:border border-slate-700/80 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-slide-up max-h-[85dvh] overflow-y-auto overscroll-contain pb-[max(6rem,env(safe-area-inset-bottom))] sm:pb-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Grab handle for mobile */}
            <div className="w-12 h-1.5 bg-slate-600 rounded-full mx-auto mb-4 sm:hidden shrink-0" />
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>✏️</span> Edit Item
              </h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                aria-label="Close dialog"
                className="w-10 h-10 rounded-full bg-slate-800 active:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white active:scale-95 transition-all touch-manipulation"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 mb-4 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Item Name *
                </label>
                <input
                  type="text"
                  name="name"
                  defaultValue={editingItem.name}
                  required
                  className="w-full px-4 py-3.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-blue-500 text-base min-h-[48px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Price ($) *
                </label>
                <input
                  type="number"
                  name="price"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  defaultValue={editingItem.price}
                  required
                  className="w-full px-4 py-3.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-blue-500 text-base min-h-[48px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Category
                  </label>
                  <select
                    name="category"
                    defaultValue={editingItem.category}
                    className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="drinks">🍺 Drinks</option>
                    <option value="food">🍕 Food</option>
                    <option value="other">🍿 Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Default Split
                  </label>
                  <select
                    name="default_split"
                    defaultValue={editingItem.default_split}
                    className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="individual">🍺 Individual</option>
                    <option value="shared">🍕 Shared</option>
                  </select>
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800 border border-slate-700">
                <span className="text-sm font-semibold text-slate-300">Visible on Menu</span>
                <select
                  name="is_active"
                  defaultValue={editingItem.is_active ? 'true' : 'false'}
                  className="px-3 py-1.5 rounded-lg bg-slate-700 text-white text-xs font-semibold focus:outline-none"
                >
                  <option value="true">Active</option>
                  <option value="false">Hidden</option>
                </select>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 active:scale-98 transition-all disabled:opacity-50"
                >
                  {isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
