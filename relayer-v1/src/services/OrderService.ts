import { Order, IOrder } from '../models/Order';
import { ResolverAssignment, IResolverAssignment } from '../models/ResolverAssignment';
import { Event } from '../models/Event';
import { AuctionService } from './AuctionService';

export interface CreateOrderRequest {
  makerAddress: string;
  makerChain: string;
  takerChain: string;
  makingAmount: string;
  takingAmount: string;
  makerAsset: string;
  takerAsset: string;
  hashlock: string;
  timelocks: { srcWithdrawal: number; dstWithdrawal: number };
  auction: { initialRateBump: number; duration: number; startTime: number };
  signature: string;
  orderNonce: string;
}

export interface AssignOrderRequest {
  resolverAddress: string;
  effectiveAmount: string;
}



export interface CompleteOrderRequest {
  status: 'filled' | 'refunded_src' | 'refunded_dst' | 'failed';
  details?: {
    srcClaimTx?: string;
    dstClaimTx?: string;
    resolverPayout?: string;
    makerReceived?: string;
  };
}

export class OrderService {
  /**
   * Create a new order
   */
  static async createOrder(orderData: CreateOrderRequest): Promise<{ orderId: string; status: string }> {
    // Check if order with same nonce already exists
    const existingOrder = await Order.findOne({ orderNonce: orderData.orderNonce });
    if (existingOrder) {
      throw new Error('Order with this nonce already exists');
    }

    const order = new Order({
      ...orderData,
      status: 'pending_auction'
    });

    await order.save();

    // Log event
    await Event.create({
      orderId: order._id.toString(),
      type: 'order_created',
      payload: {
        makerAddress: orderData.makerAddress,
        makerChain: orderData.makerChain,
        takerChain: orderData.takerChain,
        makingAmount: orderData.makingAmount,
        takingAmount: orderData.takingAmount
      }
    });

    return {
      orderId: order._id.toString(),
      status: order.status
    };
  }

  /**
   * Get pending auction orders with current bump
   */
  static async getPendingAuctions(): Promise<any[]> {
    const currentTimestamp = AuctionService.getCurrentTimestamp();
    return await AuctionService.getPendingAuctions(currentTimestamp);
  }

  /**
   * Assign an order to a resolver
   */
  static async assignOrder(orderId: string, assignmentData: AssignOrderRequest): Promise<{ orderId: string; assignedResolver: string; status: string }> {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status !== 'pending_auction') {
      throw new Error('Order is not available for assignment');
    }

    // Check if order is still valid
    const currentTimestamp = AuctionService.getCurrentTimestamp();
    if (!AuctionService.isOrderValid(order, currentTimestamp)) {
      throw new Error('Order auction has expired');
    }

    // Check if already assigned
    const existingAssignment = await ResolverAssignment.findOne({ orderId });
    if (existingAssignment) {
      throw new Error('Order already assigned');
    }

    // Create resolver assignment
    const assignment = new ResolverAssignment({
      orderId,
      resolverAddress: assignmentData.resolverAddress,
      effectiveAmount: assignmentData.effectiveAmount,
      status: 'assigned'
    });

    await assignment.save();

    // Update order status
    order.status = 'assigned';
    await order.save();

    // Log event
    await Event.create({
      orderId,
      type: 'order_assigned',
      payload: {
        resolverAddress: assignmentData.resolverAddress,
        effectiveAmount: assignmentData.effectiveAmount
      }
    });

    return {
      orderId,
      assignedResolver: assignmentData.resolverAddress,
      effectiveAmount: assignmentData.effectiveAmount,
      status: 'assigned'
    };
  }

  /**
   * Get order details with assignment info
   */
  static async getOrderDetails(orderId: string): Promise<any> {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    const assignment = await ResolverAssignment.findOne({ orderId });
    const events = await Event.find({ orderId }).sort({ timestamp: -1 }).limit(10);

    return {
      order: order.toObject(),
      assignment: assignment?.toObject() || null,
      events: events.map(e => e.toObject())
    };
  }



  /**
   * Complete an order
   */
  static async completeOrder(orderId: string, completionData: CompleteOrderRequest): Promise<void> {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    // Update order status
    order.status = completionData.status;
    await order.save();

    // Update assignment status
    const assignment = await ResolverAssignment.findOne({ orderId });
    if (assignment) {
      assignment.status = completionData.status === 'filled' ? 'completed' : 'failed';
      await assignment.save();
    }

    // Log event
    await Event.create({
      orderId,
      type: 'order_completed',
      payload: {
        status: completionData.status,
        details: completionData.details
      }
    });
  }

  /**
   * Update assignment details (generic method for resolver to feed data)
   */
  static async updateAssignment(orderId: string, assignmentData: {
    srcEscrowAddress?: string;
    dstEscrowAddress?: string;
    srcTimelock?: number;
    dstTimelock?: number;
    fillAmount?: string;
    takeAmount?: string;
    status?: 'src_deployed' | 'dst_deployed' | 'claimed_src' | 'completed' | 'failed';
  }): Promise<void> {
    const assignment = await ResolverAssignment.findOne({ orderId });
    if (!assignment) {
      throw new Error('Assignment not found');
    }

    // Update assignment fields
    if (assignmentData.srcEscrowAddress !== undefined) {
      assignment.srcEscrowAddress = assignmentData.srcEscrowAddress;
    }
    if (assignmentData.dstEscrowAddress !== undefined) {
      assignment.dstEscrowAddress = assignmentData.dstEscrowAddress;
    }
    if (assignmentData.srcTimelock !== undefined) {
      assignment.srcTimelock = assignmentData.srcTimelock;
    }
    if (assignmentData.dstTimelock !== undefined) {
      assignment.dstTimelock = assignmentData.dstTimelock;
    }
    if (assignmentData.fillAmount !== undefined) {
      assignment.fillAmount = assignmentData.fillAmount;
    }
    if (assignmentData.takeAmount !== undefined) {
      assignment.takeAmount = assignmentData.takeAmount;
    }
    if (assignmentData.status !== undefined) {
      assignment.status = assignmentData.status;
    }

    await assignment.save();

    // Log event
    await Event.create({
      orderId,
      type: 'assignment_updated',
      payload: assignmentData
    });
  }

  /**
   * Update assignment status (for escrow deployments)
   */
  static async updateAssignmentStatus(orderId: string, status: string, escrowData?: { srcEscrowAddress?: string; dstEscrowAddress?: string }): Promise<void> {
    const assignment = await ResolverAssignment.findOne({ orderId });
    if (!assignment) {
      throw new Error('Assignment not found');
    }

    assignment.status = status as any;
    if (escrowData) {
      if (escrowData.srcEscrowAddress) assignment.srcEscrowAddress = escrowData.srcEscrowAddress;
      if (escrowData.dstEscrowAddress) assignment.dstEscrowAddress = escrowData.dstEscrowAddress;
    }

    await assignment.save();

    // Log event
    await Event.create({
      orderId,
      type: `assignment_${status}`,
      payload: escrowData || {}
    });
  }
} 