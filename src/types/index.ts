// Database types matching Supabase schema

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: 'drinks' | 'food' | 'other';
  default_split: 'individual' | 'shared';
  is_active: boolean;
  created_at: string;
  order_count?: number;
}

export interface Session {
  id: string;
  name: string;
  status: 'open' | 'closed';
  created_at: string;
  has_password?: boolean;
}

export interface Participant {
  id: string;
  session_id: string;
  name: string;
  color: string;
  joined_at: string;
}

export interface Order {
  id: string;
  session_id: string;
  menu_item_id: string | null;
  item_name: string;
  quantity: number;
  unit_price: number;
  split_type: 'individual' | 'shared';
  created_at: string;
}

export interface Assignment {
  id: string;
  order_id: string;
  participant_id: string;
  quantity: number;
}

// Extended types with joins
export interface OrderWithAssignments extends Order {
  assignments: (Assignment & { participant: Participant })[];
}

export interface ParticipantBill {
  participant: Participant;
  items: {
    order: Order;
    quantity: number;
    amount: number;
    label: string; // e.g. "2× Beer" or "½ Pizza"
  }[];
  total: number;
}

// Preset colors for participants
export const PARTICIPANT_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
  '#14B8A6', // teal
  '#6366F1', // indigo
];
