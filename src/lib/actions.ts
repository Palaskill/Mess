'use server';

import { separateSharedUnits } from '@/lib/shared-orders';
import { revalidatePath } from 'next/cache';
import { sessionClient, requireSessionEditor, requireMenuEditor, saveSessionGrant, sessionToken, revokeSessionGrant, assertSessionId } from '@/lib/security/session-access';
import { publicSession, validQuantity, validPrice, MAX_BATCH_ITEMS, MAX_EXPANDED_ORDERS } from '@/lib/security/validation';
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
  return sessionClient();
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

export async function getMenuAccess(): Promise<boolean> {
  try { await requireMenuEditor(); return true; } catch { return false; }
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
    if (!validPrice(price)) {
      return { success: false, error: 'Invalid price' };
    }

    const supabase = await requireMenuEditor();
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
    if (!validPrice(price)) {
      return { success: false, error: 'Invalid price' };
    }

    const supabase = await requireMenuEditor();
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
    const supabase = await requireMenuEditor();
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

export async function verifySessionPassword(sessionId: string, password: string): Promise<{ success: boolean; error?: string }> {
  try {
    assertSessionId(sessionId);
    if (typeof password !== 'string' || password.length > 256) return { success: false, error: 'Mot de passe invalide' };
    const client = await getSupabase();
    const { data: token, error } = await client.rpc('mess_unlock_session', { p_session_id: sessionId, p_password: password.trim() });
    if (error || !token) return { success: false, error: 'Mot de passe incorrect, session indisponible ou trop de tentatives. Réessayez dans une minute.' };
    await saveSessionGrant(sessionId, token);
    return { success: true };
  } catch { return { success: false, error: 'Impossible de déverrouiller la session.' }; }
}

export async function getSessionAccess(sessionId: string): Promise<boolean> {
  try { await requireSessionEditor(sessionId, false); return true; } catch { return false; }
}
export async function lockSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
  try { await revokeSessionGrant(sessionId); return { success: true }; }
  catch { return { success: false, error: 'Impossible de verrouiller la session.' }; }
}

export async function getSessions(): Promise<SessionWithCount[]> {
  try {
    const client = await getSupabase();
    const { data, error } = await client.rpc('mess_sessions');
    if (error) return [];
    return (data || []).map((raw: Record<string, unknown>) => ({ ...publicSession(raw), participant_count: Number(raw.participant_count) || 0 }));
  } catch { return []; }
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

  if (name.length > 80 || sessionPassword.trim().length < 8 || Buffer.byteLength(sessionPassword.trim(), 'utf8') > 72
      || !Array.isArray(participantsList) || participantsList.length > 30
      || participantsList.some(p => typeof p?.name !== 'string' || !p.name.trim() || p.name.length > 80 || !/^#[a-fA-F0-9]{6}$/.test(p.color))) {
    throw new Error('Nom ou participants invalides. Le mot de passe doit contenir au moins 8 caractères (72 octets maximum).');
  }
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc('mess_create_session', {
    p_name: name, p_password: sessionPassword.trim(), p_participants: participantsList,
  });
  if (error || !data?.session || !data?.token) throw new Error('Création impossible. Vérifiez que la migration de sécurité est installée.');
  await saveSessionGrant(data.session.id, data.token);
  revalidatePath('/');
  return publicSession(data.session) as Session;
}

export async function closeSession(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await requireSessionEditor(id);
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
    if (!(await getSessionAccess(id))) {
      const unlocked = await verifySessionPassword(id, password || '');
      if (!unlocked.success) return unlocked;
    }
    const supabase = await requireSessionEditor(id, false);
    const { data, error } = await supabase.from('sessions').delete().eq('id', id).select('id').single();
    if (error || !data) return { success: false, error: 'Suppression refusée.' };
    await revokeSessionGrant(id);

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

    const supabase = await requireSessionEditor(sessionId);
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
    const supabase = await requireSessionEditor(sessionId);
    const { error } = await supabase.from('participants').delete().eq('id', id).eq('session_id', sessionId);

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

async function requireParticipantsInSession(client: Awaited<ReturnType<typeof getSupabase>>, sessionId: string, participantIds: string[]) {
  const ids = [...new Set(participantIds)];
  if (ids.length === 0) return;
  if (participantIds.length > 300 || ids.some(id => typeof id !== 'string')) throw new Error('Participants invalides');
  const { data, error } = await client.from('participants').select('id').eq('session_id', sessionId).in('id', ids);
  if (error || data?.length !== ids.length) throw new Error('Chaque participant doit appartenir à cette session.');
}
async function requireAssignmentScope(client: Awaited<ReturnType<typeof getSupabase>>, sessionId: string, orderId: string, participantId: string) {
  await requireParticipantsInSession(client, sessionId, [participantId]);
  const { data, error } = await client.from('orders').select('id,quantity,split_type').eq('id', orderId).eq('session_id', sessionId).single();
  if (error || !data) throw new Error('La commande doit appartenir à cette session.');
  return data;
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

    if (!validQuantity(quantity) || !validPrice(unitPrice) || itemName.length > 160 || !['shared','individual'].includes(splitType)) {
      return { success: false, error: 'Invalid quantity or price' };
    }

    let finalMenuItemId = menuItemId;
    const supabase = await requireSessionEditor(sessionId);

    const participantIds = String(formData.get('assigned_participant_ids') || '').split(',').filter(Boolean);
    await requireParticipantsInSession(supabase, sessionId, participantIds);

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

    if (!Array.isArray(items) || items.length > MAX_BATCH_ITEMS || items.some(item =>
      !item || typeof item.item_name !== 'string' || !item.item_name.trim() || item.item_name.length > 160 ||
      !validQuantity(item.quantity) || !validPrice(item.unit_price) || !['shared','individual'].includes(item.split_type) ||
      (item.assigned_participant_ids !== undefined && (!Array.isArray(item.assigned_participant_ids) || item.assigned_participant_ids.length > 300)))) {
      return { success: false, error: 'Articles invalides ou limite de commande dépassée.' };
    }
    const expandedCount = items.reduce((n,item) => n + (item.split_type === 'shared' ? item.quantity : 1), 0);
    if (expandedCount > MAX_EXPANDED_ORDERS) return { success: false, error: 'Trop d’articles à importer.' };
    const supabase = await requireSessionEditor(sessionId);
    await requireParticipantsInSession(supabase, sessionId, items.flatMap(item => item.assigned_participant_ids || []));
    const validItems = separateSharedUnits(items);

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
    const supabase = await requireSessionEditor(sessionId);
    const { error } = await supabase.from('orders').delete().eq('id', id).eq('session_id', sessionId);

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
    const supabase = await requireSessionEditor(sessionId);
    if ((updates.quantity !== undefined && !validQuantity(updates.quantity)) ||
        (updates.unit_price !== undefined && !validPrice(updates.unit_price)) ||
        (updates.item_name !== undefined && (!updates.item_name.trim() || updates.item_name.length > 160))) {
      return { success: false, error: 'Quantité, prix ou nom invalide.' };
    }
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
      .eq('id', id).eq('session_id', sessionId);

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

    const supabase = await requireSessionEditor(sessionId);
    const scopedOrder = await requireAssignmentScope(supabase, sessionId, orderId, participantId);
    if (!validQuantity(quantity) || (scopedOrder.split_type === 'shared' && quantity !== 1) || quantity > scopedOrder.quantity) {
      return { success: false, error: 'Quantité d’affectation invalide.' };
    }

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
    const supabase = await requireSessionEditor(sessionId);
    await requireAssignmentScope(supabase, sessionId, orderId, participantId);
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
      supabase.rpc('mess_session', { p_session_id: sessionId }),
      supabase.from('participants').select('*').eq('session_id', sessionId).order('joined_at', { ascending: true }),
      supabase.from('orders').select('*').eq('session_id', sessionId).order('created_at', { ascending: false }),
      supabase.from('assignments').select('*, participant:participants!inner(*)').eq('participant.session_id', sessionId),
    ]);

    return {
      session: sessionRes.data ? (publicSession(sessionRes.data) as Session) : null,
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
