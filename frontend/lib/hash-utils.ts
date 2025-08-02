import { keccak256 } from 'ethers';

// Convert string to bytes
function stringToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

// Generate Keccak hash from secret (matches EVM contracts)
export function generateKeccakHash(secret: string): string {
  try {
    // Convert string to bytes
    const bytes = secret;
    
    // Convert to hex string
    // const hexString = '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Generate Keccak hash (matches EVM keccak256)
    const hash = keccak256(secret);
    
    return hash;
  } catch (error) {
    console.error('Error generating Keccak hash:', error);
    return '';
  }
}

// Generate Keccak hash with reversed byte order (for Starknet contracts)
export function generateKeccakHashReversed(secret: string): string {
  try {
    // Convert string to bytes
    const bytes = stringToBytes(secret);
    
    // Convert to hex string
    const hexString = '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Generate Keccak hash
    const hash = keccak256(hexString);
    
    // Reverse the byte order for Starknet compatibility
    const reversedHash = '0x' + hash.slice(2).match(/.{1,2}/g)?.reverse().join('') || '';
    
    return reversedHash;
  } catch (error) {
    console.error('Error generating reversed Keccak hash:', error);
    return '';
  }
}

// Generate both Keccak hashes
export function generateHashes(secret: string): {
  keccakHash: string;
  keccakHashReversed: string;
} {
  return {
    keccakHash: generateKeccakHash(secret),
    keccakHashReversed: generateKeccakHashReversed(secret)
  };
} 