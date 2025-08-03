import { generateHashes } from "@/lib/hash-utils";
import { STARKNET_CONFIG } from "@/config/starknet-config";
import { ETHEREUM_CONFIG } from "@/config/ethereum-config";

export interface OrderData {
  makerAddress: string;
  takerAddress: string;
  makerChain: string;
  takerChain: string;
  makingAmount: string;
  takingAmount: string;
  makerAsset: string;
  takerAsset: string;
  ethereumHashlock: string;
  starknetHashlock: string;
  timelocks: {
    srcWithdrawal: number;
    dstWithdrawal: number;
  };
  auction: {
    duration: number;
    startTime: number;
  };
  signature: string;
  orderNonce: string;
}

export class OrderService {
  private static RELAYER_URL = "http://localhost:3001";

  /**
   * Prepare order data for submission
   */
  static prepareOrder(
    sourceChain: string,
    destinationChain: string,
    sourceAddress: string,
    destinationAddress: string,
    sourceAmount: string,
    destinationAmount: string,
    secret: string
  ): OrderData {
    // Generate hashes from secret
    const hashes = generateHashes(secret);
    
    // Convert amounts to wei (18 decimals)
    const sourceAmountWei = (parseFloat(sourceAmount) * 10 ** 18).toString();
    const destinationAmountWei = (parseFloat(destinationAmount) * 10 ** 18).toString();
    
    // Get current timestamp and add 1 minute for start time
    const currentTime = Math.floor(Date.now() / 1000);
    const startTime = currentTime + 60; // 1 minute from now
    
    // Generate random order nonce
    const orderNonce = `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Determine maker and taker based on source and destination
    const makerAddress = sourceAddress;
    const takerAddress = destinationAddress;
    const makerChain = sourceChain;
    const takerChain = destinationChain;
    const makingAmount = sourceAmountWei;
    const takingAmount = destinationAmountWei;
    
    // Get asset addresses based on chains
    const makerAsset = this.getAssetAddress(sourceChain);
    const takerAsset = this.getAssetAddress(destinationChain);
    
    return {
      makerAddress,
      takerAddress,
      makerChain,
      takerChain,
      makingAmount,
      takingAmount,
      makerAsset,
      takerAsset,
      ethereumHashlock: hashes.keccakHash,
      starknetHashlock: hashes.keccakHashReversed,
      timelocks: {
        srcWithdrawal: 10, // Dummy value
        dstWithdrawal: 10  // Dummy value
      },
      auction: {
        duration: 120, // 120 seconds
        startTime
      },
      signature: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef", // Dummy signature
      orderNonce
    };
  }

  /**
   * Send order to relayer
   */
  static async submitOrder(orderData: OrderData): Promise<any> {
    try {
      const response = await fetch(`${this.RELAYER_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error submitting order:', error);
      throw error;
    }
  }

  /**
   * Get asset address based on chain
   */
  private static getAssetAddress(chain: string): string {
    switch (chain) {
      case 'sepolia':
        return ETHEREUM_CONFIG.USDC_TOKEN;
      case 'starknet':
        return STARKNET_CONFIG.USDC_TOKEN;
      default:
        throw new Error(`Unsupported chain: ${chain}`);
    }
  }
} 