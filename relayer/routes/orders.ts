import express from 'express';
import { getOrders, getSecret, markOrderAsWon, addOrderFromMaker } from '../services/orderManager';

const router = express.Router();

// Get all orders
router.get('/', (req, res) => {
  res.json(getOrders());
});

router.post('/', (req, res) => {
  const { maker, makerToken, takerToken, makingAmount, takingAmount, expiry, salt } = req.body;

  if (!maker || !makerToken || !takerToken || !makingAmount || !takingAmount || !expiry || !salt) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const order = addOrderFromMaker({ maker, makerToken, takerToken, makingAmount, takingAmount, expiry, salt });

  console.log(`Created order for maker ${order.maker} with salt ${order.salt}`);
  res.json({ success: true, order });
});

// Get a specific order by salt
router.get('/:salt', (req, res) => {
  const { salt } = req.params;
  const order = getOrders().find((o) => o.salt === salt);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  res.json(order);
});

// Get secret for a specific order (demo only)
router.get('/:salt/secret', (req, res) => {
  const { salt } = req.params;
  const secret = getSecret(salt);
  if (!secret) {
    return res.status(404).json({ error: 'Secret not found' });
  }
  res.json({ secret });
});

// Mark order as won by a resolver (optional for auction demo)
router.post('/:salt/win', (req, res) => {
  const { salt } = req.params;
  const { resolver } = req.body;

  if (!resolver) {
    return res.status(400).json({ error: 'Missing resolver address' });
  }

  const success = markOrderAsWon(salt, resolver);
  if (!success) {
    return res.status(404).json({ error: 'Order not found or already won' });
  }

  console.log(`Order ${salt} marked as won by resolver ${resolver}`);
  res.json({ success: true });
});

export default router;
