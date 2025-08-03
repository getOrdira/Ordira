// src/models/invitation.model.ts
import { Schema, model, Document, Types } from 'mongoose';

export interface IInvitation extends Document {
  brand:        Types.ObjectId;       // the BrandSettings._id
  manufacturer: Types.ObjectId;       // the Manufacturer._id
  status:       'pending'|'accepted'|'declined';
  createdAt:    Date;
}

const InvitationSchema = new Schema<IInvitation>({
  brand:        { type: Schema.Types.ObjectId, ref: 'BrandSettings', required: true },
  manufacturer: { type: Schema.Types.ObjectId, ref: 'Manufacturer', required: true },
  status:       { type: String, enum: ['pending','accepted','declined'], default: 'pending' }
}, { timestamps: true });

export const Invitation = model<IInvitation>('Invitation', InvitationSchema);
