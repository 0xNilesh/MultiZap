import { Order, IOrder } from '../models/Order';
import { ResolverAssignment, IResolverAssignment } from '../models/ResolverAssignment';
import { Event } from '../models/Event';
import { AuctionService } from './AuctionService';

export interface CreateOrderRequest {
  makerAddress: string;
  takerAddress: string; // Destination address
  makerChain: string;
  takerChain: string;
  makingAmount: string;
  takingAmount: string;
  makerAsset: string;
  takerAsset: string;
  ethereumHashlock: string; // Ethereum hashlock
  starknetHashlock: string; // Starknet hashlock
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
  status: 'completed' | 'refunded_src' | 'refunded_dst' | 'failed';
  details?: {
    srcClaimTx?: string;
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
  static async assignOrder(orderId: string, assignmentData: AssignOrderRequest): Promise<{ orderId: string; assignedResolver: string; effectiveAmount: string; status: string }> {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status !== 'pending_auction') {
      throw new Error('Order is not available for assignment');
    }

    // Check if order is still valid
    // const currentTimestamp = AuctionService.getCurrentTimestamp();
    // if (!AuctionService.isOrderValid(order, currentTimestamp)) {
    //   throw new Error('Order auction has expired');
    // }

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
      assignment.status = completionData.status === 'completed' ? 'completed' : 'failed';
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

    // Log specific event based on status
    let eventType = 'assignment_updated';
    if (assignmentData.status === 'src_deployed') {
      eventType = 'src_escrow_deployed';
    } else if (assignmentData.status === 'dst_deployed') {
      eventType = 'dst_escrow_deployed';
    } else if (assignmentData.status === 'claimed_src') {
      eventType = 'src_claimed';
    }

    await Event.create({
      orderId,
      type: eventType,
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

  /**
   * Upload secret after user claims from source escrow
   */
  static async uploadSecret(orderId: string, secret: string, destinationTxHash?: string): Promise<void> {
    const assignment = await ResolverAssignment.findOne({ orderId });
    if (!assignment) {
      throw new Error('Assignment not found');
    }

    // Update assignment with secret and destination tx hash
    assignment.secret = secret;
    assignment.claimTxHash = destinationTxHash; // This is the destination claim tx hash
    assignment.status = 'claimed_src';
    await assignment.save();

    // Update order to mark secret as revealed
    const order = await Order.findById(orderId);
    if (order) {
      order.secretRevealed = true;
      await order.save();
    }

    // Log event
    await Event.create({
      orderId,
      type: 'secret_uploaded',
      payload: {
        destinationTxHash,
        hasSecret: true
      }
    });
  }

  /**
   * Get secret for resolver to claim from destination escrow
   */
  static async getSecret(orderId: string): Promise<string> {
    const assignment = await ResolverAssignment.findOne({ orderId });
    if (!assignment) {
      throw new Error('Assignment not found');
    }

    if (!assignment.secret) {
      throw new Error('Secret not available yet');
    }

    return assignment.secret;
  }

  /**
   * Get all revealed orders for a resolver that are not completed
   */
  static async getRevealedOrders(resolverAddress: string): Promise<any[]> {
    // Find assignments for this resolver that have secrets but are not completed
    const assignments = await ResolverAssignment.find({
      resolverAddress,
      secret: { $exists: true, $ne: null },
      status: { $nin: ['completed', 'failed'] }
    });

    // Get the corresponding orders
    const orderIds = assignments.map(a => a.orderId);
    const orders = await Order.find({
      _id: { $in: orderIds },
      secretRevealed: true
    });

    // Combine orders with their assignments
    const revealedOrders = orders.map(order => {
      const assignment = assignments.find(a => a.orderId === order._id.toString());
      return {
        order: order.toObject(),
        assignment: assignment?.toObject() || null
      };
    });

    return revealedOrders;
  }
} 