import mongoose, { Document, Schema } from 'mongoose';

export interface IEvent extends Document {
  _id: string;
  orderId: string;
  type: string;
  payload: Record<string, any>;
  timestamp: Date;
}

const EventSchema = new Schema<IEvent>({
  orderId: { type: String, required: true, index: true },
  type: { type: String, required: true },
  payload: { type: Schema.Types.Mixed, required: true },
  timestamp: { type: Date, required: true, default: Date.now }
}, {
  timestamps: true
});

// Index for efficient queries
EventSchema.index({ orderId: 1, timestamp: -1 });
EventSchema.index({ type: 1, timestamp: -1 });

export const Event = mongoose.model<IEvent>('Event', EventSchema); 