import mongoose, { Document, Schema } from 'mongoose';

export interface IOrder extends Document {
  _id: string;
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
  secretRevealed: boolean;
  auction: {
    duration: number;
    startTime: number;
  };
  timelocks: {
    srcWithdrawal: number;
    dstWithdrawal: number;
  };
  orderNonce: string;
  signature: string;
  status: 'pending_auction' | 'assigned' | 'src_deployed' | 'dst_deployed' | 'claimed_src' | 'completed' | 'failed' | 'refunded_src' | 'refunded_dst';
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>({
  makerAddress: { type: String, required: true, index: true },
  takerAddress: { type: String, required: true }, // Destination address
  makerChain: { type: String, required: true },
  takerChain: { type: String, required: true },
  makingAmount: { type: String, required: true },
  takingAmount: { type: String, required: true },
  makerAsset: { type: String, required: true },
  takerAsset: { type: String, required: true },
  ethereumHashlock: { type: String, required: true, index: true }, // Ethereum hashlock
  starknetHashlock: { type: String, required: true, index: true }, // Starknet hashlock
  secretRevealed: { type: Boolean, default: false },
  auction: {
    duration: { type: Number, required: true },
    startTime: { type: Number, required: true }
  },
  timelocks: {
    srcWithdrawal: { type: Number, required: true },
    dstWithdrawal: { type: Number, required: true }
  },
  orderNonce: { type: String, required: true, unique: true },
  signature: { type: String, required: true },
  status: { 
    type: String, 
    required: true, 
    enum: ['pending_auction', 'assigned', 'src_deployed', 'dst_deployed', 'claimed_src', 'completed', 'failed', 'refunded_src', 'refunded_dst'],
    default: 'pending_auction',
    index: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
OrderSchema.index({ status: 1, 'auction.startTime': 1 });
OrderSchema.index({ makerAddress: 1, createdAt: -1 });

export const Order = mongoose.model<IOrder>('Order', OrderSchema); 