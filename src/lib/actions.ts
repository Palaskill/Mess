'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
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

export async function getActiveMenuItems(): Promise<MenuItem[]> {
  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching active menu items:', error);
      return [];
    }
    return (data || []) as MenuItem[];
  } catch (err) {
    console.error('Failed to get active menu items:', err);
    return [];
  }
}

export async function createMenuItem(formData: FormData): Promise<{ success: boolean; error?: string }> {
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
    const { error } = await supabase.from('menu_items').insert([
      {
        name,
        price,
        category,
        default_split,
        is_active: true,
      },
    ]);

    if (error) {
      console.error('Error creating menu item:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/admin');
    revalidatePath('/');
    return { success: true };
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
// 2. SESSIONS
// ==========================================

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
      return (simpleData || []) as SessionWithCount[];
    }

    return (data || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      status: s.status,
      created_at: s.created_at,
      participant_count: Array.isArray(s.participants)
        ? (s.participants[0]?.count ?? 0)
        : 0,
    }));
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
  initialParticipants?: { name: string; color: string }[]
): Promise<Session> {
  let name = '';
  let participantsList = initialParticipants || [];

  if (typeof nameOrFormData === 'string') {
    name = nameOrFormData.trim();
  } else {
    name = (nameOrFormData.get('name') as string)?.trim();
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
    throw new Error('Session name is required');
  }

  const supabase = await getSupabase();
  const { data: session, error } = await supabase
    .from('sessions')
    .insert([{ name, status: 'open' }])
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
  return session as Session;
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

export async function deleteSession(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getSupabase();
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
      .order('created_at', { ascending: true });

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

    const supabase = await getSupabase();
    const { data: newOrder, error } = await supabase
      .from('orders')
      .insert([
        {
          session_id: sessionId,
          menu_item_id: menuItemId,
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
  assigned_participant_ids?: string[];
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

    const supabase = await getSupabase();

    for (const item of items) {
      const quantity = Math.max(1, parseInt(String(item.quantity), 10) || 1);
      const unitPrice = parseFloat(String(item.unit_price));
      const itemName = item.item_name?.trim();

      if (!itemName || isNaN(unitPrice) || unitPrice < 0) {
        continue;
      }

      const { data: newOrder, error } = await supabase
        .from('orders')
        .insert([
          {
            session_id: sessionId,
            menu_item_id: item.menu_item_id || null,
            item_name: itemName,
            quantity,
            unit_price: unitPrice,
            split_type: item.split_type || 'individual',
          },
        ])
        .select('id')
        .single();

      if (error || !newOrder) {
        console.error('Error creating order in batch:', error);
        continue;
      }

      if (item.assigned_participant_ids && item.assigned_participant_ids.length > 0) {
        if (item.split_type === 'shared') {
          const assignmentsToInsert = item.assigned_participant_ids.map((pId) => ({
            order_id: newOrder.id,
            participant_id: pId,
            quantity: 1,
          }));
          await supabase.from('assignments').insert(assignmentsToInsert);
        } else {
          await supabase.from('assignments').insert([
            {
              order_id: newOrder.id,
              participant_id: item.assigned_participant_ids[0],
              quantity: quantity,
            },
          ]);
        }
      }
    }

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

    revalidatePath(`/session/${sessionId}`);
    return { success: true };
  } catch (err: any) {
    console.error('Failed to delete order:', err);
    return { success: false, error: err?.message || 'Failed to delete order' };
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
      supabase.from('orders').select('*').eq('session_id', sessionId).order('created_at', { ascending: true }),
      supabase.from('assignments').select('*, participant:participants!inner(*)').eq('participant.session_id', sessionId),
    ]);

    return {
      session: sessionRes.data as Session | null,
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
