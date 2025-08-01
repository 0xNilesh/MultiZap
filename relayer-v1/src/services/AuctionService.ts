import { Order, IOrder } from '../models/Order';

export interface AuctionInfo {
  orderId: string;
  makerAddress: string;
  makingAmount: string;
  takingAmount: string;
  auction: {
    duration: number;
    startTime: number;
  };
  currentAmount: string;
  status: string;
}

export class AuctionService {
  /**
   * Calculate current amount for a Dutch auction
   * @param auction Auction parameters
   * @param currentTimestamp Current timestamp
   * @param makingAmount Original making amount
   * @param takingAmount Original taking amount
   * @returns Current amount (linear decay from makingAmount to takingAmount)
   */
  static calculateCurrentAmount(
    auction: { duration: number; startTime: number },
    currentTimestamp: number,
    makingAmount: string,
    takingAmount: string
  ): string {
    const elapsed = currentTimestamp - auction.startTime;
    const fraction = Math.max(0, Math.min(1, elapsed / auction.duration));
    
    const makingBigInt = BigInt(makingAmount);
    const takingBigInt = BigInt(takingAmount);
    
    // Linear interpolation: makingAmount -> takingAmount
    const currentAmount = makingBigInt - (makingBigInt - takingBigInt) * BigInt(Math.floor(fraction * 1000000)) / BigInt(1000000);
    
    return currentAmount.toString();
  }

  /**
   * Get all pending auction orders with current amount calculation
   * @param currentTimestamp Current timestamp for amount calculation
   * @returns Array of auction info with current amount
   */
  static async getPendingAuctions(currentTimestamp: number): Promise<AuctionInfo[]> {
    const orders = await Order.find({ status: 'pending_auction' }).sort({ 'auction.startTime': 1 });
    
    return orders.map(order => ({
      orderId: order._id.toString(),
      makerAddress: order.makerAddress,
      makingAmount: order.makingAmount,
      takingAmount: order.takingAmount,
      auction: order.auction,
      currentAmount: this.calculateCurrentAmount(order.auction, currentTimestamp, order.makingAmount, order.takingAmount),
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
   * Calculate effective amounts based on current auction amount
   * @param makingAmount Original making amount
   * @param takingAmount Original taking amount
   * @param currentAmount Current auction amount
   * @returns Effective amounts
   */
  static calculateEffectiveAmounts(
    makingAmount: string,
    takingAmount: string,
    currentAmount: string
  ): { fillAmount: string; takeAmount: string } {
    return {
      fillAmount: makingAmount, // Resolver gets full makingAmount from source escrow
      takeAmount: currentAmount  // Resolver pays currentAmount to destination escrow
    };
  }
} 