import { FusionOrder } from '../types/Order';
import crypto from 'crypto';
import { computeSecretHash } from '../utils/crypto';

interface StoredOrder extends FusionOrder {
  secret: string;
  resolver?: string;
}

const orders = new Map<string, StoredOrder>();

function generateSecret(): string {
  return '0x' + crypto.randomBytes(32).toString('hex');
}

export function addOrderFromMaker(
  partialOrder: Omit<FusionOrder, 'secretHash' | 'signature'>
): FusionOrder {
  const secret = generateSecret();
  const secretHash = computeSecretHash(secret.slice(2));

  const order: StoredOrder = {
    ...partialOrder,
    secretHash,
    signature: '',
    secret,
  };

  orders.set(order.salt, order);
  return order;
}

export function getOrders(): Omit<StoredOrder, 'secret'>[] {
  return Array.from(orders.values()).map(({ secret, ...rest }) => rest);
}

export function getSecret(salt: string): string | null {
  const order = orders.get(salt);
  return order ? order.secret : null;
}

export function markOrderAsWon(salt: string, resolver: string): boolean {
  const order = orders.get(salt);
  if (!order || order.resolver) return false;

  order.resolver = resolver;
  return true;
}
