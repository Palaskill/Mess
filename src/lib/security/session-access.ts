import 'server-only';

import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOKEN = /^[a-f0-9]{64}$/;
export const GRANT_SECONDS = 12 * 60 * 60;

export function assertSessionId(id: string) {
  if (typeof id !== 'string' || !UUID.test(id)) throw new Error('Session invalide');
}
export function sessionCookieName(id: string) {
  assertSessionId(id);
  return `mess_grant_${id}`;
}
export async function saveSessionGrant(id: string, token: string) {
  if (!TOKEN.test(token)) throw new Error('Autorisation invalide');
  (await cookies()).set(sessionCookieName(id), token, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict',
    path: '/', maxAge: GRANT_SECONDS, priority: 'high',
  });
}
export async function sessionClient(id?: string) {
  const store = await cookies();
  const token = id ? store.get(sessionCookieName(id))?.value : undefined;
  return createClient(store, token && TOKEN.test(token) ? token : undefined);
}
export async function sessionToken(id: string) {
  const token = (await cookies()).get(sessionCookieName(id))?.value;
  return token && TOKEN.test(token) ? token : '';
}
export async function requireSessionEditor(id: string, requireOpen = true) {
  assertSessionId(id);
  const token = await sessionToken(id);
  if (!token) throw new Error('Déverrouillez cette session pour la modifier.');
  const client = await sessionClient(id);
  const { data, error } = await client.rpc('mess_can_edit', {
    p_session_id: id, p_token: token, p_require_open: requireOpen,
  });
  if (error || data !== true) throw new Error('Session verrouillée, fermée ou autorisation expirée.');
  return client;
}
export async function requireMenuEditor() {
  const grants = (await cookies()).getAll().filter(c => c.name.startsWith('mess_grant_')).slice(-20);
  for (const grant of grants) {
    const id = grant.name.slice('mess_grant_'.length);
    if (!UUID.test(id) || !TOKEN.test(grant.value)) continue;
    try { return await requireSessionEditor(id); } catch { /* Try another granted session. */ }
  }
  throw new Error('Déverrouillez une session active pour gérer la carte.');
}
export async function revokeSessionGrant(id: string) {
  const token = await sessionToken(id);
  if (token) {
    const client = await sessionClient(id);
    const { error } = await client.rpc('mess_revoke_grant', { p_session_id: id, p_token: token });
    if (error) throw new Error('Le verrouillage a échoué. Réessayez.');
  }
  (await cookies()).delete(sessionCookieName(id));
}
