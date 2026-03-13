export const PAYMENT_ORDER_EXPIRY_SECONDS = 5 * 60;
export const PAYMENT_ORDER_EXPIRY_MS = PAYMENT_ORDER_EXPIRY_SECONDS * 1000;

export function getPaymentOrderExpiryTime(createdAt: Date): number {
  return createdAt.getTime() + PAYMENT_ORDER_EXPIRY_MS;
}
