// src/models/notification.model.ts
import { Schema, model, Document, Types } from 'mongoose';

export interface INotification extends Document {
  business?:      Types.ObjectId;   // for Brand-scoped alerts
  manufacturer?:  Types.ObjectId;   // for Manufacturer-scoped alerts
  type:           string;           // e.g. 'invite', 'vote', 'certificate', 'billing'
  message:        string;
  data?:          any;              // optional payload (IDs, URLs, etc.)
  read:           boolean;
  createdAt:      Date;
  updatedAt:      Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    business:     { type: Types.ObjectId, ref: 'Business' },
    manufacturer: { type: Types.ObjectId, ref: 'Manufacturer' },
    type:         { type: String, required: true },
    message:      { type: String, required: true },
    data:         { type: Schema.Types.Mixed },
    read:         { type: Boolean, default: false }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Notification = model<INotification>('Notification', NotificationSchema);
