// --------------------------------------------------
// pendingVote.model.ts
// --------------------------------------------------
import { Schema, model, Document } from 'mongoose';

export interface PendingVote extends Document {
  businessId: string;
  proposalId: string;
  userId:     string;
  voteId:     string;
  createdAt:  Date;
}

const PendingVoteSchema = new Schema<PendingVote>({
  businessId:   { type: String, required: true, index: true },
  proposalId:   { type: String, required: true },
  userId:       { type: String, required: true },
  voteId:       { type: String, required: true, unique: true },
  createdAt:    { type: Date,   default: () => new Date() }
});

// Ensure one vote per user per proposal per brand
PendingVoteSchema.index(
  { businessId: 1, proposalId: 1, userId: 1 },
  { unique: true }
);

export const PendingVote = model<PendingVote>('PendingVote', PendingVoteSchema);