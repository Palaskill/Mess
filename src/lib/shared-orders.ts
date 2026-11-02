/** Each shared unit owns its diners, even when the receipt groups identical items. */
export function separateSharedUnits<T extends { quantity: number; split_type?: string }>(items: T[]): T[] {
  return items.flatMap(item => {
    const quantity = Math.max(1, Math.trunc(Number(item.quantity)) || 1);
    return item.split_type === 'shared'
      ? Array.from({ length: quantity }, () => ({ ...item, quantity: 1 }))
      : [item];
  });
}
