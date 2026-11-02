/** Name matching is only for decorative effects, never a measure of intoxication. */
export function isAlcoholItem(itemName: string): boolean {
  const name = itemName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/sans alcool|non.?alcohol|alcohol.?free|\b0[.,]0\b|\bvirgin\b|rose water|eau de rose|sirop/.test(name)) return false;
  return /\b(bieres?|beers?|celtia|beck.?s|heineken|desperados|wines?|vin|vins|vodka|whisk[ey]*|rhum|rum|gin|tequila|cocktail|pastis|boukha|mojito)\b/.test(name) || /بيرة|نبيذ|فودكا|ويسكي/.test(name);
}

interface PartyItem {
  name: string;
  quantity: number;
  shared: boolean;
  participantIds: string[];
}

export function countPartyItems(items: PartyItem[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    if (!isAlcoholItem(item.name) || item.participantIds.length === 0) continue;
    if (item.shared) {
      const ids = [...new Set(item.participantIds)];
      for (const id of ids) counts[id] = (counts[id] || 0) + item.quantity / ids.length;
    } else {
      for (const id of item.participantIds) counts[id] = (counts[id] || 0) + 1;
    }
  }
  return counts;
}

export function countSavedPartyItems(
  orders: { id: string; item_name: string; quantity: number; split_type: string }[],
  assignments: { order_id: string; participant_id: string; quantity: number }[]
): Record<string, number> {
  return countPartyItems(orders.map(order => ({
    name: order.item_name,
    quantity: order.quantity,
    shared: order.split_type === 'shared',
    participantIds: assignments.filter(a => a.order_id === order.id).flatMap(a =>
      Array.from({ length: order.split_type === 'shared' ? 1 : Math.max(0, Math.trunc(a.quantity)) }, () => a.participant_id)),
  })));
}
