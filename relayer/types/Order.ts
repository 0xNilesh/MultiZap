export interface FusionOrder {
  maker: string;               // EOA address
  makerToken: string;
  takerToken: string;
  makingAmount: string;
  takingAmount: string;
  expiry: number;
  secretHash: string;          // keccak256(secret)
  salt: string;                // unique order ID
  signature: string;
}
