import { keccak256, toUtf8Bytes } from 'ethers';

export function computeSecretHash(secret: string): string {
  return keccak256(toUtf8Bytes(secret));
}
