export const MAX_BATCH_ITEMS = 100;
export const MAX_UNITS_PER_ORDER = 100;
export const MAX_EXPANDED_ORDERS = 300;
export function validQuantity(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 1 && value <= MAX_UNITS_PER_ORDER;
}
export function validPrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100000;
}
export function publicSession(raw: Record<string, unknown>) {
  // An explicit allowlist also strips future sensitive database columns.
  return {
    id: String(raw.id), name: String(raw.name || '').replace(/::auth:[a-f0-9]+$/, ''),
    status: raw.status === 'closed' ? 'closed' as const : 'open' as const,
    created_at: String(raw.created_at || ''), has_password: Boolean(raw.has_password || raw.password_hash || /::auth:[a-f0-9]+$/.test(String(raw.name || ''))),
  };
}
