'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';
import { createClient } from '@/utils/supabase/server';
import {
  MenuItem,
  Session,
  Participant,
  Order,
  Assignment,
  OrderWithAssignments,
} from '@/types';

export interface SessionWithCount extends Session {
  participant_count?: number;
}

// Helper to get supabase client
async function getSupabase() {
  const cookieStore = await cookies();
  return createClient(cookieStore);
}

// ==========================================
// 1. MENU ITEMS (Admin CRUD)
// ==========================================

export async function getMenuItems(): Promise<MenuItem[]> {
  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching menu items:', error);
      return [];
    }
    return (data || []) as MenuItem[];
  } catch (err) {
    console.error('Failed to get menu items:', err);
    return [];
  }
}

// In-memory cache for menu order stats (avoids querying entire historical orders table on every action)
let cachedOrderStats: {
  timestamp: number;
  idCountMap: Record<string, number>;
  nameCountMap: Record<string, number>;
} | null = null;
const STATS_CACHE_TTL = 3 * 60 * 1000; // 3 minutes

export async function getActiveMenuItems(): Promise<MenuItem[]> {
  try {
    const supabase = await getSupabase();
    const { data: items, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('is_active', true);

    if (error || !items) {
      console.error('Error fetching active menu items:', error);
      return [];
    }

    const now = Date.now();
    let idCountMap: Record<string, number> = {};
    let nameCountMap: Record<string, number> = {};

    if (cachedOrderStats && now - cachedOrderStats.timestamp < STATS_CACHE_TTL) {
      idCountMap = cachedOrderStats.idCountMap;
      nameCountMap = cachedOrderStats.nameCountMap;
    } else {
      // Fetch order counts across all sessions to rank items by most commonly ordered
      const { data: orderStats } = await supabase
        .from('orders')
        .select('menu_item_id, item_name, quantity');

      if (orderStats) {
        for (const ord of orderStats) {
          const qty = ord.quantity || 1;
          if (ord.menu_item_id) {
            idCountMap[ord.menu_item_id] = (idCountMap[ord.menu_item_id] || 0) + qty;
          }
          if (ord.item_name) {
            const lowerName = ord.item_name.trim().toLowerCase();
            nameCountMap[lowerName] = (nameCountMap[lowerName] || 0) + qty;
          }
        }
      }

      cachedOrderStats = {
        timestamp: now,
        idCountMap,
        nameCountMap,
      };
    }

    // Standard bar staple weights to provide intelligent initial ranking if few orders
    const POPULAR_WEIGHTS: Record<string, number> = {
      beer: 100,
      pizza: 95,
      fromage: 92,
      cheese: 92,
      fries: 85,
      wings: 80,
      cola: 75,
      nachos: 70,
      burger: 65,
      wine: 60,
      water: 50,
      juice: 40,
      coffee: 30,
      'fruit sec': 25,
    };

    const sortedItems = items.map((item: any) => {
      const lower = item.name.trim().toLowerCase();
      const realCount = idCountMap[item.id] || nameCountMap[lower] || 0;
      const defaultScore = POPULAR_WEIGHTS[lower] || 10;
      // Real orders count heavily, default score breaks ties
      const score = realCount * 1000 + defaultScore;
      return {
        ...item,
        order_count: realCount,
        _score: score,
      };
    });

    // Sort descending by popularity score (most commonly ordered first)
    sortedItems.sort((a, b) => b._score - a._score);

    return sortedItems.map(({ _score, ...item }) => item) as MenuItem[];
  } catch (err) {
    console.error('Failed to get active menu items:', err);
    return [];
  }
}

export async function createMenuItem(formData: FormData): Promise<{ success: boolean; data?: MenuItem; error?: string }> {
  try {
    const name = (formData.get('name') as string)?.trim();
    const priceStr = formData.get('price') as string;
    const category = (formData.get('category') as string) || 'drinks';
    const default_split = (formData.get('default_split') as string) || 'individual';

    if (!name || !priceStr) {
      return { success: false, error: 'Name and price are required' };
    }

    const price = parseFloat(priceStr);
    if (isNaN(price) || price < 0) {
      return { success: false, error: 'Invalid price' };
    }

    const supabase = await getSupabase();
    const { data, error } = await supabase.from('menu_items').insert([
      {
        name,
        price,
        category,
        default_split,
        is_active: true,
      },
    ]).select().single();

    if (error) {
      console.error('Error creating menu item:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/admin');
    revalidatePath('/');
    return { success: true, data: data as MenuItem };
  } catch (err: any) {
    console.error('Failed to create menu item:', err);
    return { success: false, error: err?.message || 'Failed to create item' };
  }
}

export async function updateMenuItem(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const id = formData.get('id') as string;
    const name = (formData.get('name') as string)?.trim();
    const priceStr = formData.get('price') as string;
    const category = formData.get('category') as string;
    const default_split = formData.get('default_split') as string;
    const is_active_val = formData.get('is_active');
    const is_active = is_active_val === 'true' || is_active_val === 'on' || is_active_val === '1';

    if (!id || !name || !priceStr) {
      return { success: false, error: 'Missing required fields' };
    }

    const price = parseFloat(priceStr);
    if (isNaN(price) || price < 0) {
      return { success: false, error: 'Invalid price' };
    }

    const supabase = await getSupabase();
    const { error } = await supabase
      .from('menu_items')
      .update({
        name,
        price,
        category,
        default_split,
        is_active,
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating menu item:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/admin');
    revalidatePath('/');
    return { success: true };
  } catch (err: any) {
    console.error('Failed to update menu item:', err);
    return { success: false, error: err?.message || 'Failed to update item' };
  }
}

export async function deleteMenuItem(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getSupabase();
    const { error } = await supabase.from('menu_items').delete().eq('id', id);

    if (error) {
      console.error('Error deleting menu item:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/admin');
    return { success: true };
  } catch (err: any) {
    console.error('Failed to delete menu item:', err);
    return { success: false, error: err?.message || 'Failed to delete item' };
  }
}

// ==========================================
// 2. SESSIONS & ACCESS CONTROL
// ==========================================

function hashSessionPassword(pwd: string): string {
  return crypto.createHash('sha256').update(pwd.trim()).digest('hex');
}

function parseSessionRecord<T extends { name: string; password_hash?: string | null }>(
  raw: T
): T & { has_password: boolean } {
  const rawName = raw.name || '';
  const match = rawName.match(/^([\s\S]*?)::auth:([a-f0-9]+)$/);
  if (match) {
    return {
      ...raw,
      name: match[1],
      has_password: true,
    };
  }
  if (raw.password_hash) {
    return {
      ...raw,
      has_password: true,
    };
  }
  return {
    ...raw,
    has_password: false,
  };
}

function extractPasswordHash(rawName: string, directHash?: string | null): string | null {
  if (directHash) return directHash;
  const match = (rawName || '').match(/^([\s\S]*?)::auth:([a-f0-9]+)$/);
  return match ? match[2] : null;
}

export async function verifySessionPassword(
  sessionId: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error || !data) {
      return { success: false, error: 'Session introuvable' };
    }

    const storedHash = extractPasswordHash(data.name, data.password_hash);
    if (!storedHash) {
      // Session without password (open session)
      return { success: true };
    }

    const inputHash = hashSessionPassword(password);
    if (inputHash === storedHash) {
      return { success: true };
    }

    return { success: false, error: 'Mot de passe incorrect' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erreur lors de la vérification' };
  }
}

export async function getSessions(): Promise<SessionWithCount[]> {
  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from('sessions')
      .select('*, participants(count)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching sessions with count:', error);
      const { data: simpleData, error: simpleError } = await supabase
        .from('sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (simpleError) {
        console.error('Error fetching sessions fallback:', simpleError);
        return [];
      }
      return (simpleData || []).map((s: any) => {
        const parsed = parseSessionRecord(s);
        return {
          id: parsed.id,
          name: parsed.name,
          status: parsed.status,
          created_at: parsed.created_at,
          has_password: parsed.has_password,
        };
      });
    }

    return (data || []).map((s: any) => {
      const parsed = parseSessionRecord(s);
      return {
        id: parsed.id,
        name: parsed.name,
        status: parsed.status,
        created_at: parsed.created_at,
        has_password: parsed.has_password,
        participant_count: Array.isArray(s.participants)
          ? (s.participants[0]?.count ?? 0)
          : 0,
      };
    });
  } catch (err) {
    console.error('Failed to get sessions:', err);
    return [];
  }
}

const DEFAULT_PARTICIPANT_COLORS = [
  '#3B82F6',
  '#10B981',
  '#8B5CF6',
  '#F59E0B',
  '#EF4444',
  '#EC4899',
  '#06B6D4',
  '#84CC16',
];

export async function createSession(
  nameOrFormData: string | FormData,
  initialParticipants?: { name: string; color: string }[],
  password?: string
): Promise<Session> {
  let name = '';
  let participantsList = initialParticipants || [];
  let sessionPassword = password || '';

  if (typeof nameOrFormData === 'string') {
    name = nameOrFormData.trim();
  } else {
    name = (nameOrFormData.get('name') as string)?.trim();
    sessionPassword = ((nameOrFormData.get('password') as string)?.trim() || sessionPassword);
    const rawParticipants = nameOrFormData.get('participants') as string;
    if (rawParticipants && participantsList.length === 0) {
      try {
        participantsList = JSON.parse(rawParticipants);
      } catch {
        // Fallback comma-separated
        participantsList = rawParticipants.split(',').filter(Boolean).map((n, i) => ({
          name: n.trim(),
          color: DEFAULT_PARTICIPANT_COLORS[i % DEFAULT_PARTICIPANT_COLORS.length],
        }));
      }
    }
  }

  if (!name) {
    throw new Error('Le nom de la session est obligatoire');
  }

  // Format stored name with password hash if provided
  let storedName = name;
  let pwdHash: string | null = null;
  if (sessionPassword) {
    pwdHash = hashSessionPassword(sessionPassword);
    storedName = `${name}::auth:${pwdHash}`;
  }

  const supabase = await getSupabase();
  const insertPayload: any = { name: storedName, status: 'open' };

  const { data: session, error } = await supabase
    .from('sessions')
    .insert([insertPayload])
    .select()
    .single();

  if (error || !session) {
    console.error('Error creating session:', error);
    throw new Error(error?.message || 'Failed to create session');
  }

  // Insert initial participants if provided
  if (participantsList && participantsList.length > 0) {
    const toInsert = participantsList.map((p) => ({
      session_id: session.id,
      name: p.name,
      color: p.color || '#3B82F6',
    }));
    const { error: pError } = await supabase.from('participants').insert(toInsert);
    if (pError) {
      console.error('Error inserting initial participants:', pError);
    }
  }

  revalidatePath('/');
  const parsed = parseSessionRecord(session);
  return parsed as Session;
}

export async function closeSession(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getSupabase();
    const { error } = await supabase
      .from('sessions')
      .update({ status: 'closed' })
      .eq('id', id);

    if (error) {
      console.error('Error closing session:', error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/session/${id}`);
    revalidatePath('/');
    return { success: true };
  } catch (err: any) {
    console.error('Failed to close session:', err);
    return { success: false, error: err?.message || 'Failed to close session' };
  }
}

export async function deleteSession(
  id: string,
  password?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getSupabase();

    // Verify session password if protected
    const { data: sessionData } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (sessionData) {
      const storedHash = extractPasswordHash(sessionData.name, sessionData.password_hash);
      if (storedHash) {
        if (!password) {
          return { success: false, error: 'Mot de passe requis pour supprimer cette session' };
        }
        if (hashSessionPassword(password) !== storedHash) {
          return { success: false, error: 'Mot de passe incorrect' };
        }
      }
    }

    const { error } = await supabase.from('sessions').delete().eq('id', id);

    if (error) {
      console.error('Error deleting session:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/');
    return { success: true };
  } catch (err: any) {
    console.error('Failed to delete session:', err);
    return { success: false, error: err?.message || 'Failed to delete session' };
  }
}

// ==========================================
// 3. PARTICIPANTS (Friends)
// ==========================================

export async function getParticipants(sessionId: string): Promise<Participant[]> {
  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .eq('session_id', sessionId)
      .order('joined_at', { ascending: true });

    if (error) {
      console.error('Error fetching participants:', error);
      return [];
    }
    return (data || []) as Participant[];
  } catch (err) {
    console.error('Failed to get participants:', err);
    return [];
  }
}

export async function addParticipant(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const sessionId = formData.get('session_id') as string;
    const name = (formData.get('name') as string)?.trim();
    const color = (formData.get('color') as string) || '#3B82F6';

    if (!sessionId || !name) {
      return { success: false, error: 'Session ID and Name are required' };
    }

    const supabase = await getSupabase();
    const { error } = await supabase.from('participants').insert([
      {
        session_id: sessionId,
        name,
        color,
      },
    ]);

    if (error) {
      console.error('Error adding participant:', error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/session/${sessionId}`);
    revalidatePath('/');
    return { success: true };
  } catch (err: any) {
    console.error('Failed to add participant:', err);
    return { success: false, error: err?.message || 'Failed to add participant' };
  }
}

export async function removeParticipant(id: string, sessionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getSupabase();
    const { error } = await supabase.from('participants').delete().eq('id', id);

    if (error) {
      console.error('Error removing participant:', error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/session/${sessionId}`);
    revalidatePath('/');
    return { success: true };
  } catch (err: any) {
    console.error('Failed to remove participant:', err);
    return { success: false, error: err?.message || 'Failed to remove participant' };
  }
}

// ==========================================
// 4. ORDERS
// ==========================================

export async function getOrders(sessionId: string): Promise<Order[]> {
  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
      return [];
    }
    return (data || []) as Order[];
  } catch (err) {
    console.error('Failed to get orders:', err);
    return [];
  }
}

export async function createOrder(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const sessionId = formData.get('session_id') as string;
    const menuItemId = (formData.get('menu_item_id') as string) || null;
    const itemName = (formData.get('item_name') as string)?.trim();
    const quantityStr = formData.get('quantity') as string;
    const unitPriceStr = formData.get('unit_price') as string;
    const splitType = (formData.get('split_type') as string) || 'individual';

    if (!sessionId || !itemName || !unitPriceStr) {
      return { success: false, error: 'Item name, price, and session ID are required' };
    }

    const quantity = parseInt(quantityStr, 10) || 1;
    const unitPrice = parseFloat(unitPriceStr);

    if (quantity <= 0 || isNaN(unitPrice) || unitPrice < 0) {
      return { success: false, error: 'Invalid quantity or price' };
    }

    let finalMenuItemId = menuItemId;
    const supabase = await getSupabase();

    // Dynamically insert into menu_items if not already present
    if (!finalMenuItemId && itemName) {
      const { data: existingMenu } = await supabase
        .from('menu_items')
        .select('id')
        .ilike('name', itemName)
        .limit(1)
        .maybeSingle();

      if (existingMenu) {
        finalMenuItemId = existingMenu.id;
      } else {
        const { data: newMenu } = await supabase
          .from('menu_items')
          .insert([
            {
              name: itemName,
              price: unitPrice,
              category: splitType === 'shared' ? 'food' : 'drinks',
              default_split: splitType,
              is_active: true,
            },
          ])
          .select('id')
          .maybeSingle();

        if (newMenu) {
          finalMenuItemId = newMenu.id;
          revalidatePath('/admin');
          revalidatePath('/');
        }
      }
    }

    const { data: newOrder, error } = await supabase
      .from('orders')
      .insert([
        {
          session_id: sessionId,
          menu_item_id: finalMenuItemId,
          item_name: itemName,
          quantity,
          unit_price: unitPrice,
          split_type: splitType,
        },
      ])
      .select('id')
      .single();

    if (error || !newOrder) {
      console.error('Error creating order:', error);
      return { success: false, error: error?.message || 'Failed to create order' };
    }

    const assignedIdsStr = formData.get('assigned_participant_ids') as string;
    if (assignedIdsStr) {
      const pIds = assignedIdsStr.split(',').filter(Boolean);
      if (pIds.length > 0) {
        if (splitType === 'shared') {
          const assignmentsToInsert = pIds.map((pId) => ({
            order_id: newOrder.id,
            participant_id: pId,
            quantity: 1,
          }));
          await supabase.from('assignments').insert(assignmentsToInsert);
        } else {
          await supabase.from('assignments').insert([
            {
              order_id: newOrder.id,
              participant_id: pIds[0],
              quantity: quantity,
            },
          ]);
        }
      }
    }

    revalidatePath('/admin');
    revalidatePath('/');
    revalidatePath(`/session/${sessionId}`);
    return { success: true };
  } catch (err: any) {
    console.error('Failed to create order:', err);
    return { success: false, error: err?.message || 'Failed to create order' };
  }
}

export interface CreateBatchOrderItem {
  menu_item_id?: string | null;
  item_name: string;
  quantity: number;
  unit_price: number;
  split_type: 'individual' | 'shared';
  category?: 'drinks' | 'food' | 'other';
  assigned_participant_ids?: string[];
  auto_add_to_menu?: boolean;
}

export async function createBatchOrders(
  sessionId: string,
  items: CreateBatchOrderItem[]
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!sessionId) {
      return { success: false, error: 'Session ID is required' };
    }
    if (!items || items.length === 0) {
      return { success: false, error: 'At least one item is required' };
    }

    const validItems = items.filter((item) => {
      const unitPrice = parseFloat(String(item.unit_price));
      const itemName = item.item_name?.trim();
      return itemName && !isNaN(unitPrice) && unitPrice >= 0;
    });

    if (validItems.length === 0) {
      return { success: false, error: 'No valid items to order' };
    }

    const supabase = await getSupabase();

    // 0. Auto-sync missing items to menu_items catalog dynamically
    const { data: currentCatalog } = await supabase
      .from('menu_items')
      .select('id, name, price, category, default_split');

    const catalogByName = new Map<string, { id: string; name: string }>();
    (currentCatalog || []).forEach((m: any) => {
      catalogByName.set(m.name.trim().toLowerCase(), { id: m.id, name: m.name });
    });

    const newMenuItemsToInsert: {
      name: string;
      price: number;
      category: 'drinks' | 'food' | 'other';
      default_split: 'individual' | 'shared';
      is_active: boolean;
    }[] = [];

    // Identify items that should be dynamically added to the products catalog
    for (const item of validItems) {
      const cleanName = item.item_name.trim();
      const normalizedName = cleanName.toLowerCase();
      const shouldAutoAdd = item.auto_add_to_menu !== false;

      if (shouldAutoAdd && !item.menu_item_id && !catalogByName.has(normalizedName)) {
        // Reserve key to prevent duplicate inserts for identical items in same batch
        catalogByName.set(normalizedName, { id: '', name: cleanName });
        newMenuItemsToInsert.push({
          name: cleanName,
          price: Math.max(0, parseFloat(String(item.unit_price)) || 0),
          category: item.category || (item.split_type === 'shared' ? 'food' : 'drinks'),
          default_split: item.split_type || 'individual',
          is_active: true,
        });
      }
    }

    if (newMenuItemsToInsert.length > 0) {
      const { data: createdItems, error: menuErr } = await supabase
        .from('menu_items')
        .insert(newMenuItemsToInsert)
        .select('id, name');

      if (!menuErr && createdItems) {
        createdItems.forEach((created: any) => {
          catalogByName.set(created.name.trim().toLowerCase(), { id: created.id, name: created.name });
        });
      } else if (menuErr) {
        console.warn('Notice: Dynamic menu insertion skipped:', menuErr.message);
      }
    }

    // 1. Bulk insert all orders in a single database round-trip with resolved menu_item_id
    const ordersToInsert = validItems.map((item) => {
      const normalizedName = item.item_name.trim().toLowerCase();
      const catalogMatch = catalogByName.get(normalizedName);
      const resolvedMenuItemId = item.menu_item_id || (catalogMatch?.id ? catalogMatch.id : null);

      return {
        session_id: sessionId,
        menu_item_id: resolvedMenuItemId,
        item_name: item.item_name.trim(),
        quantity: Math.max(1, parseInt(String(item.quantity), 10) || 1),
        unit_price: parseFloat(String(item.unit_price)),
        split_type: item.split_type || 'individual',
      };
    });

    const { data: insertedOrders, error: orderError } = await supabase
      .from('orders')
      .insert(ordersToInsert)
      .select('id');

    if (orderError || !insertedOrders || insertedOrders.length === 0) {
      console.error('Error creating orders in bulk:', orderError);
      return { success: false, error: orderError?.message || 'Failed to create orders' };
    }

    // 2. Prepare and bulk insert all assignments in a single database round-trip
    const allAssignmentsToInsert: {
      order_id: string;
      participant_id: string;
      quantity: number;
    }[] = [];

    insertedOrders.forEach((newOrder, idx) => {
      const item = validItems[idx];
      const quantity = Math.max(1, parseInt(String(item.quantity), 10) || 1);

      if (item.assigned_participant_ids && item.assigned_participant_ids.length > 0) {
        if (item.split_type === 'shared') {
          for (const pId of item.assigned_participant_ids) {
            allAssignmentsToInsert.push({
              order_id: newOrder.id,
              participant_id: pId,
              quantity: 1,
            });
          }
        } else {
          if (item.assigned_participant_ids.length === 1 && quantity > 1) {
            allAssignmentsToInsert.push({
              order_id: newOrder.id,
              participant_id: item.assigned_participant_ids[0],
              quantity: quantity,
            });
          } else {
            const counts: Record<string, number> = {};
            for (const pId of item.assigned_participant_ids) {
              counts[pId] = (counts[pId] || 0) + 1;
            }
            for (const [pId, count] of Object.entries(counts)) {
              allAssignmentsToInsert.push({
                order_id: newOrder.id,
                participant_id: pId,
                quantity: Math.min(count, quantity),
              });
            }
          }
        }
      }
    });

    if (allAssignmentsToInsert.length > 0) {
      const { error: assignError } = await supabase
        .from('assignments')
        .insert(allAssignmentsToInsert);

      if (assignError) {
        console.error('Error inserting bulk assignments:', assignError);
      }
    }

    revalidatePath('/admin');
    revalidatePath('/');
    revalidatePath(`/session/${sessionId}`);
    return { success: true };
  } catch (err: any) {
    console.error('Failed to create batch orders:', err);
    return { success: false, error: err?.message || 'Failed to create orders' };
  }
}

export async function deleteOrder(id: string, sessionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getSupabase();
    const { error } = await supabase.from('orders').delete().eq('id', id);

    if (error) {
      console.error('Error deleting order:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/admin');
    revalidatePath('/');
    revalidatePath(`/session/${sessionId}`);
    return { success: true };
  } catch (err: any) {
    console.error('Failed to delete order:', err);
    return { success: false, error: err?.message || 'Failed to delete order' };
  }
}

export async function updateOrder(
  id: string,
  sessionId: string,
  updates: {
    unit_price?: number;
    item_name?: string;
    quantity?: number;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getSupabase();
    const payload: any = {};
    if (updates.unit_price !== undefined) {
      payload.unit_price = updates.unit_price;
    }
    if (updates.item_name !== undefined) {
      payload.item_name = updates.item_name.trim();
    }
    if (updates.quantity !== undefined) {
      payload.quantity = updates.quantity;
    }

    const { error } = await supabase
      .from('orders')
      .update(payload)
      .eq('id', id);

    if (error) {
      console.error('Error updating order:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/admin');
    revalidatePath('/');
    revalidatePath(`/session/${sessionId}`);
    return { success: true };
  } catch (err: any) {
    console.error('Failed to update order:', err);
    return { success: false, error: err?.message || 'Failed to update order' };
  }
}

// ==========================================
// 5. ASSIGNMENTS
// ==========================================

export async function getAssignments(sessionId: string): Promise<(Assignment & { participant: Participant })[]> {
  try {
    const supabase = await getSupabase();

    // Query assignments joined with participants whose session_id matches
    const { data, error } = await supabase
      .from('assignments')
      .select('*, participant:participants!inner(*)')
      .eq('participant.session_id', sessionId);

    if (error) {
      console.error('Error fetching assignments:', error);
      return [];
    }

    return (data || []) as (Assignment & { participant: Participant })[];
  } catch (err) {
    console.error('Failed to get assignments:', err);
    return [];
  }
}

export async function assignItem(
  orderId: string,
  participantId: string,
  quantity: number,
  sessionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (quantity <= 0) {
      return unassignItem(orderId, participantId, sessionId);
    }

    const supabase = await getSupabase();

    // Upsert assignment by unique key (order_id, participant_id)
    const { error } = await supabase
      .from('assignments')
      .upsert(
        {
          order_id: orderId,
          participant_id: participantId,
          quantity,
        },
        { onConflict: 'order_id,participant_id' }
      );

    if (error) {
      console.error('Error assigning item:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/admin');
    revalidatePath('/');
    revalidatePath(`/session/${sessionId}`);
    return { success: true };
  } catch (err: any) {
    console.error('Failed to assign item:', err);
    return { success: false, error: err?.message || 'Failed to assign item' };
  }
}

export async function unassignItem(
  orderId: string,
  participantId: string,
  sessionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getSupabase();
    const { error } = await supabase
      .from('assignments')
      .delete()
      .eq('order_id', orderId)
      .eq('participant_id', participantId);

    if (error) {
      console.error('Error unassigning item:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/admin');
    revalidatePath('/');
    revalidatePath(`/session/${sessionId}`);
    return { success: true };
  } catch (err: any) {
    console.error('Failed to unassign item:', err);
    return { success: false, error: err?.message || 'Failed to unassign item' };
  }
}

// Toggle a participant on a shared order
export async function toggleSharedAssignment(
  orderId: string,
  participantId: string,
  isCurrentlyAssigned: boolean,
  sessionId: string
): Promise<{ success: boolean; error?: string }> {
  if (isCurrentlyAssigned) {
    return unassignItem(orderId, participantId, sessionId);
  } else {
    return assignItem(orderId, participantId, 1, sessionId);
  }
}

// ==========================================
// 6. COMBINED SESSION DATA FETCH
// ==========================================

export async function getSessionData(sessionId: string): Promise<{
  session: Session | null;
  participants: Participant[];
  orders: Order[];
  assignments: (Assignment & { participant: Participant })[];
}> {
  try {
    const supabase = await getSupabase();

    const [sessionRes, participantsRes, ordersRes, assignmentsRes] = await Promise.all([
      supabase.from('sessions').select('*').eq('id', sessionId).single(),
      supabase.from('participants').select('*').eq('session_id', sessionId).order('joined_at', { ascending: true }),
      supabase.from('orders').select('*').eq('session_id', sessionId).order('created_at', { ascending: false }),
      supabase.from('assignments').select('*, participant:participants!inner(*)').eq('participant.session_id', sessionId),
    ]);

    return {
      session: sessionRes.data ? (parseSessionRecord(sessionRes.data) as Session) : null,
      participants: (participantsRes.data || []) as Participant[],
      orders: (ordersRes.data || []) as Order[],
      assignments: (assignmentsRes.data || []) as (Assignment & { participant: Participant })[],
    };
  } catch (err) {
    console.error('Failed to get session data:', err);
    return {
      session: null,
      participants: [],
      orders: [],
      assignments: [],
    };
  }
}
