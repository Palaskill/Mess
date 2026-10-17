import { Order, Assignment, Participant, ParticipantBill } from '@/types';

/**
 * Calculate how much each person owes based on their assignments.
 */
export function calculateBills(
  orders: Order[],
  assignments: (Assignment & { participant: Participant })[],
  participants: Participant[]
): ParticipantBill[] {
  const bills: ParticipantBill[] = participants.map((p) => ({
    participant: p,
    items: [],
    total: 0,
  }));

  const billMap = new Map(bills.map((b) => [b.participant.id, b]));

  for (const order of orders) {
    const orderAssignments = assignments.filter((a) => a.order_id === order.id);

    if (order.split_type === 'individual') {
      // Individual: each person pays for the units they took
      for (const assignment of orderAssignments) {
        const bill = billMap.get(assignment.participant_id);
        if (bill) {
          const amount = assignment.quantity * order.unit_price;
          bill.items.push({
            order,
            quantity: assignment.quantity,
            amount,
            label: `${assignment.quantity}× ${order.item_name}`,
          });
          bill.total += amount;
        }
      }
    } else {
      // Shared: price is divided equally among all sharers
      const sharerCount = orderAssignments.length;
      if (sharerCount === 0) continue;

      const totalPrice = order.quantity * order.unit_price;
      const perPersonAmount = totalPrice / sharerCount;

      for (const assignment of orderAssignments) {
        const bill = billMap.get(assignment.participant_id);
        if (bill) {
          const fraction = sharerCount > 1 ? `1/${sharerCount}` : '';
          bill.items.push({
            order,
            quantity: 1,
            amount: perPersonAmount,
            label: fraction
              ? `${fraction} ${order.item_name}`
              : order.item_name,
          });
          bill.total += perPersonAmount;
        }
      }
    }
  }

  return bills;
}

/**
 * Calculate unassigned quantity for an individual order.
 */
export function getUnassignedQuantity(
  order: Order,
  assignments: Assignment[]
): number {
  if (order.split_type === 'shared') return 0;
  const assigned = assignments
    .filter((a) => a.order_id === order.id)
    .reduce((sum, a) => sum + a.quantity, 0);
  return order.quantity - assigned;
}

/**
 * Calculate the total bill for all orders.
 */
export function calculateTotal(orders: Order[]): number {
  return orders.reduce((sum, o) => sum + o.quantity * o.unit_price, 0);
}

/**
 * Calculate total unassigned amount.
 */
export function calculateUnassigned(
  orders: Order[],
  assignments: Assignment[]
): number {
  return orders.reduce((sum, order) => {
    if (order.split_type === 'shared') {
      const hasSharers = assignments.some((a) => a.order_id === order.id);
      return sum + (hasSharers ? 0 : order.quantity * order.unit_price);
    }
    return sum + getUnassignedQuantity(order, assignments) * order.unit_price;
  }, 0);
}
