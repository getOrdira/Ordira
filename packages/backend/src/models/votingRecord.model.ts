// src/models/votingRecord.model.ts

import { Schema, model, Document } from 'mongoose';

export interface VotingRecord extends Document {
  business:    string;
  proposalId:  string;
  voteId:      string;
  timestamp:   Date;
}

const VotingRecordSchema = new Schema<VotingRecord>(
  {
    business: {
      type: String,
      required: true,
      index: true
    },
    proposalId: {
      type: String,
      required: true
    },
    voteId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    timestamp: {
      type: Date,
      default: () => new Date(),
      index: true
    }
  }
);

// Compound index for efficient time-window queries
VotingRecordSchema.index({ business: 1, timestamp: 1 });

// Optional: auto-expire records after 30 days to keep collection lean
VotingRecordSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60 }
);

export const VotingRecord = model<VotingRecord>('VotingRecord', VotingRecordSchema);
