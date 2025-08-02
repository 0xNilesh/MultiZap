import * as crypto from 'crypto';

export function generateSecret(): string {
  return '0x' + crypto.randomBytes(32).toString('hex');
}

export function hashSecret(secret: string): string {
  return '0x' + crypto.createHash('sha256').update(Buffer.from(secret.slice(2), 'hex')).digest('hex');
}

export function verifySecretAndHash(secret: string, hash: string): boolean {
  return hashSecret(secret) === hash;
}
