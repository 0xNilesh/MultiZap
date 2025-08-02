import mongoose, { Document, Schema } from 'mongoose';

export interface IResolverAssignment extends Document {
  _id: string;
  orderId: string;
  resolverAddress: string;
  effectiveAmount: string;
  assignedAt: Date;
  srcEscrowAddress?: string;
  dstEscrowAddress?: string;
  srcTimelock?: number;
  dstTimelock?: number;
  fillAmount?: string;
  takeAmount?: string;
  secret?: string;
  claimTxHash?: string;
  status: 'assigned' | 'src_deployed' | 'dst_deployed' | 'claimed_src' | 'completed' | 'failed';
}

const ResolverAssignmentSchema = new Schema<IResolverAssignment>({
  orderId: { type: String, required: true, unique: true, index: true },
  resolverAddress: { type: String, required: true },
  effectiveAmount: { type: String, required: true },
  assignedAt: { type: Date, required: true, default: Date.now },
  srcEscrowAddress: { type: String, default: null },
  dstEscrowAddress: { type: String, default: null },
  srcTimelock: { type: Number, default: null },
  dstTimelock: { type: Number, default: null },
  fillAmount: { type: String, default: null },
  takeAmount: { type: String, default: null },
  secret: { type: String, default: null },
  claimTxHash: { type: String, default: null },
  status: { 
    type: String, 
    required: true, 
    enum: ['assigned', 'src_deployed', 'dst_deployed', 'claimed_src', 'completed', 'failed'],
    default: 'assigned',
    index: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
ResolverAssignmentSchema.index({ status: 1, assignedAt: -1 });
ResolverAssignmentSchema.index({ resolverAddress: 1, assignedAt: -1 });

export const ResolverAssignment = mongoose.model<IResolverAssignment>('ResolverAssignment', ResolverAssignmentSchema); 