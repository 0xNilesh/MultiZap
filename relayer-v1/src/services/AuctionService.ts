import { Order, IOrder } from '../models/Order';

export interface AuctionInfo {
  orderId: string;
  makerAddress: string;
  makingAmount: string;
  takingAmount: string;
  auction: {
    initialRateBump: number;
    duration: number;
    startTime: number;
  };
  currentBump: number;
  status: string;
}

export class AuctionService {
  /**
   * Calculate current rate bump for a Dutch auction
   * @param auction Auction parameters
   * @param currentTimestamp Current timestamp
   * @returns Current rate bump (0 to initialRateBump)
   */
  static calculateCurrentBump(
    auction: { initialRateBump: number; duration: number; startTime: number },
    currentTimestamp: number
  ): number {
    const elapsed = currentTimestamp - auction.startTime;
    const fraction = Math.max(0, Math.min(1, elapsed / auction.duration));
    return auction.initialRateBump * (1 - fraction);
  }

  /**
   * Get all pending auction orders with current bump calculation
   * @param currentTimestamp Current timestamp for bump calculation
   * @returns Array of auction info with current bump
   */
  static async getPendingAuctions(currentTimestamp: number): Promise<AuctionInfo[]> {
    const orders = await Order.find({ status: 'pending_auction' }).sort({ 'auction.startTime': 1 });
    
    return orders.map(order => ({
      orderId: order._id.toString(),
      makerAddress: order.makerAddress,
      makingAmount: order.makingAmount,
      takingAmount: order.takingAmount,
      auction: order.auction,
      currentBump: this.calculateCurrentBump(order.auction, currentTimestamp),
      status: order.status
    }));
  }

  /**
   * Check if an order is still valid for auction
   * @param order Order to check
   * @param currentTimestamp Current timestamp
   * @returns True if order is still valid
   */
  static isOrderValid(order: IOrder, currentTimestamp: number): boolean {
    const elapsed = currentTimestamp - order.auction.startTime;
    return elapsed <= order.auction.duration && order.status === 'pending_auction';
  }

  /**
   * Get current timestamp from source chain (placeholder - should be replaced with actual chain timestamp)
   * @returns Current timestamp
   */
  static getCurrentTimestamp(): number {
    // TODO: Replace with actual source chain timestamp
    return Math.floor(Date.now() / 1000);
  }

  /**
   * Calculate effective amounts based on rate bump
   * @param makingAmount Original making amount
   * @param takingAmount Original taking amount
   * @param rateBump Current rate bump
   * @returns Effective amounts
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
} 