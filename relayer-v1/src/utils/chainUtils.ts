import { ethers } from 'ethers';
import { RpcProvider } from 'starknet';

export interface ChainConfig {
  rpcUrl: string;
  chainId: string;
  name: string;
}

export class ChainUtils {
  private static ethereumProvider?: ethers.JsonRpcProvider;
  private static starknetProvider?: RpcProvider;

  /**
   * Initialize chain providers
   */
  static initializeProviders(ethereumRpcUrl: string, starknetRpcUrl: string) {
    this.ethereumProvider = new ethers.JsonRpcProvider(ethereumRpcUrl);
    this.starknetProvider = new RpcProvider({ nodeUrl: starknetRpcUrl });
  }

  /**
   * Get current Ethereum block timestamp
   */
  static async getEthereumTimestamp(): Promise<number> {
    if (!this.ethereumProvider) {
      throw new Error('Ethereum provider not initialized');
    }
    
    const block = await this.ethereumProvider.getBlock('latest');
    return block?.timestamp || Math.floor(Date.now() / 1000);
  }

  /**
   * Get current Starknet block timestamp
   */
  static async getStarknetTimestamp(): Promise<number> {
    if (!this.starknetProvider) {
      throw new Error('Starknet provider not initialized');
    }
    
    const block = await this.starknetProvider.getBlock('latest');
    return block?.timestamp || Math.floor(Date.now() / 1000);
  }

  /**
   * Get timestamp for a specific chain
   */
  static async getChainTimestamp(chainName: string): Promise<number> {
    switch (chainName.toLowerCase()) {
      case 'ethereum':
      case 'eth':
        return await this.getEthereumTimestamp();
      case 'starknet':
        return await this.getStarknetTimestamp();
      default:
        // Fallback to system time
        return Math.floor(Date.now() / 1000);
    }
  }

  /**
   * Validate Ethereum address
   */
  static isValidEthereumAddress(address: string): boolean {
    return ethers.isAddress(address);
  }

  /**
   * Validate Starknet address
   */
  static isValidStarknetAddress(address: string): boolean {
    // Starknet addresses are hex strings starting with 0x
    return /^0x[a-fA-F0-9]{63}$/.test(address);
  }

  /**
   * Validate address for a specific chain
   */
  static isValidAddress(address: string, chainName: string): boolean {
    switch (chainName.toLowerCase()) {
      case 'ethereum':
      case 'eth':
        return this.isValidEthereumAddress(address);
      case 'starknet':
        return this.isValidStarknetAddress(address);
      default:
        return false;
    }
  }

  /**
   * Calculate effective amounts based on rate bump
   */
  static calculateEffectiveAmounts(
    makingAmount: string,
    takingAmount: string,
    rateBump: number
  ): { fillAmount: string; takeAmount: string } {
    const makingBigInt = BigInt(makingAmount);
    const takingBigInt = BigInt(takingAmount);
    
    // Apply rate bump to calculate effective amounts
    const bumpMultiplier = BigInt(Math.floor((1 - rateBump) * 1000000)); // 6 decimal precision
    const baseMultiplier = BigInt(1000000);
    
    const fillAmount = (makingBigInt * bumpMultiplier) / baseMultiplier;
    const takeAmount = (takingBigInt * bumpMultiplier) / baseMultiplier;
    
    return {
      fillAmount: fillAmount.toString(),
      takeAmount: takeAmount.toString()
    };
  }

  /**
   * Generate hashlock from secret
   */
  static generateHashlock(secret: string): string {
    return ethers.keccak256(ethers.toUtf8Bytes(secret));
  }

  /**
   * Verify hashlock matches secret
   */
  static verifyHashlock(secret: string, hashlock: string): boolean {
    const calculatedHashlock = this.generateHashlock(secret);
    return calculatedHashlock.toLowerCase() === hashlock.toLowerCase();
  }

  /**
   * Calculate timelock expiration
   */
  static calculateTimelockExpiration(currentTimestamp: number, timelockDuration: number): number {
    return currentTimestamp + timelockDuration;
  }

  /**
   * Check if timelock has expired
   */
  static isTimelockExpired(expirationTimestamp: number, currentTimestamp: number): boolean {
    return currentTimestamp >= expirationTimestamp;
  }

  /**
   * Format amount for display
   */
  static formatAmount(amount: string, decimals: number = 6): string {
    const bigIntAmount = BigInt(amount);
    const divisor = BigInt(10 ** decimals);
    const wholePart = bigIntAmount / divisor;
    const fractionalPart = bigIntAmount % divisor;
    
    return `${wholePart.toString()}.${fractionalPart.toString().padStart(decimals, '0')}`;
  }

  /**
   * Parse amount from display format
   */
  static parseAmount(displayAmount: string, decimals: number = 6): string {
    const [wholePart, fractionalPart = '0'] = displayAmount.split('.');
    const paddedFractional = fractionalPart.padEnd(decimals, '0').slice(0, decimals);
    return (BigInt(wholePart || '0') * BigInt(10 ** decimals) + BigInt(paddedFractional)).toString();
  }
} 