import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { OrderService, CreateOrderRequest, AssignOrderRequest, CompleteOrderRequest } from '../services/OrderService';

const router = Router();

// Validation schemas
const createOrderValidation = [
  body('makerAddress').isString().notEmpty(),
  body('takerAddress').isString().notEmpty(), // Destination address
  body('makerChain').isString().notEmpty(),
  body('takerChain').isString().notEmpty(),
  body('makingAmount').isString().notEmpty(),
  body('takingAmount').isString().notEmpty(),
  body('makerAsset').isString().notEmpty(),
  body('takerAsset').isString().notEmpty(),
  body('ethereumHashlock').isString().notEmpty(), // Ethereum hashlock
  body('starknetHashlock').isString().notEmpty(), // Starknet hashlock
  body('timelocks.srcWithdrawal').isNumeric(),
  body('timelocks.dstWithdrawal').isNumeric(),
  body('auction.duration').isNumeric(),
  body('auction.startTime').isNumeric(),
  body('signature').isString().notEmpty(),
  body('orderNonce').isString().notEmpty()
];

const assignOrderValidation = [
  body('resolverAddress').isString().notEmpty(),
  body('effectiveAmount').isString().notEmpty()
];



const completeOrderValidation = [
  body('status').isIn(['completed', 'refunded_src', 'refunded_dst', 'failed']),
  body('details').optional().isObject()
];

// POST /orders - Create new order
router.post('/', createOrderValidation, async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const orderData: CreateOrderRequest = req.body;
    const result = await OrderService.createOrder(orderData);
    
    res.status(201).json(result);
  } catch (error: any) {
    console.error('Error creating order:', error);
    res.status(400).json({ error: error.message });
  }
});

// GET /orders - Get pending auction orders
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    
    if (status === 'pending_auction') {
      const orders = await OrderService.getPendingAuctions();
      res.json(orders);
    } else {
      res.status(400).json({ error: 'Invalid status parameter' });
    }
  } catch (error: any) {
    console.error('Error getting orders:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /orders/:orderId/assign - Assign order to resolver
router.post('/:orderId/assign', assignOrderValidation, async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { orderId } = req.params;
    const assignmentData: AssignOrderRequest = req.body;
    
    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }
    
    const result = await OrderService.assignOrder(orderId, assignmentData);
    res.json(result);
  } catch (error: any) {
    console.error('Error assigning order:', error);
    res.status(400).json({ error: error.message });
  }
});

// GET /orders/:orderId - Get order details
router.get('/:orderId', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    
    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }
    
    const orderDetails = await OrderService.getOrderDetails(orderId);
    res.json(orderDetails);
  } catch (error: any) {
    console.error('Error getting order details:', error);
    res.status(404).json({ error: error.message });
  }
});

// POST /orders/:orderId/complete - Complete order
router.post('/:orderId/complete', completeOrderValidation, async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { orderId } = req.params;
    const completionData: CompleteOrderRequest = req.body;
    
    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }
    
    await OrderService.completeOrder(orderId, completionData);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error completing order:', error);
    res.status(400).json({ error: error.message });
  }
});

// POST /orders/:orderId/feed-assignment - Update assignment details
router.post('/:orderId/feed-assignment', [
  body('srcEscrowAddress').optional().isString(),
  body('dstEscrowAddress').optional().isString(),
  body('srcTimelock').optional().isNumeric(),
  body('dstTimelock').optional().isNumeric(),
  body('fillAmount').optional().isString(),
  body('takeAmount').optional().isString(),
  body('status').optional().isIn(['src_deployed', 'dst_deployed', 'claimed_src', 'completed', 'failed'])
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { orderId } = req.params;
    const assignmentData = req.body;
    
    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }
    
    await OrderService.updateAssignment(orderId, assignmentData);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error updating assignment:', error);
    res.status(400).json({ error: error.message });
  }
});

// POST /orders/:orderId/upload-secret - Upload secret after user claims
router.post('/:orderId/upload-secret', [
  body('secret').isString().notEmpty(),
  body('destinationTxHash').optional().isString()
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { orderId } = req.params;
    const { secret, destinationTxHash } = req.body;
    
    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }
    
    await OrderService.uploadSecret(orderId, secret, destinationTxHash);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error uploading secret:', error);
    res.status(400).json({ error: error.message });
  }
});

// GET /orders/:orderId/get-secret - Get secret for resolver to claim
router.get('/:orderId/get-secret', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    
    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }
    
    const secret = await OrderService.getSecret(orderId);
    res.json({ secret });
  } catch (error: any) {
    console.error('Error getting secret:', error);
    res.status(404).json({ error: error.message });
  }
});

// GET /orders/revealed/:resolverAddress - Get all revealed orders for resolver
router.get('/revealed/:resolverAddress', async (req: Request, res: Response) => {
  try {
    const { resolverAddress } = req.params;
    
    if (!resolverAddress) {
      return res.status(400).json({ error: 'Resolver address is required' });
    }
    
    const revealedOrders = await OrderService.getRevealedOrders(resolverAddress);
    res.json(revealedOrders);
  } catch (error: any) {
    console.error('Error getting revealed orders:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router; 