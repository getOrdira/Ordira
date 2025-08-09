// src/models/votingRecord.model.ts
export interface IVotingRecord extends Document {
  business: string;
  proposalId: string;
  voteId: string;
  timestamp: Date;
  
  // Enhanced fields
  voteChoice: 'for' | 'against' | 'abstain';
  voterAddress?: string;
  blockNumber?: number;
  gasUsed?: string;
}

const VotingRecordSchema = new Schema<IVotingRecord>(
  {
    business: {
      type: String,
      required: [true, 'Business ID is required'],
      index: true,
      trim: true
    },
    proposalId: {
      type: String,
      required: [true, 'Proposal ID is required'],
      trim: true,
      index: true
    },
    voteId: {
      type: String,
      required: [true, 'Vote ID is required'],
      unique: true,
      index: true,
      trim: true
    },
    timestamp: {
      type: Date,
      default: () => new Date(),
      index: true
    },
    
    voteChoice: {
      type: String,
      enum: ['for', 'against', 'abstain'],
      required: [true, 'Vote choice is required']
    },
    voterAddress: {
      type: String,
      trim: true,
      match: [/^0x[a-fA-F0-9]{40}$/, 'Invalid voter address format']
    },
    blockNumber: {
      type: Number,
      min: [0, 'Block number must be positive']
    },
    gasUsed: {
      type: String,
      trim: true
    }
  }
);

// Compound indexes
VotingRecordSchema.index({ business: 1, timestamp: 1 });
VotingRecordSchema.index({ business: 1, proposalId: 1 });

// TTL index - auto-expire after 90 days
VotingRecordSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 }
);

// Static methods
VotingRecordSchema.statics.getVoteStats = function(businessId: string, proposalId?: string) {
  const match: any = { business: businessId };
  if (proposalId) match.proposalId = proposalId;
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: { proposalId: '$proposalId', voteChoice: '$voteChoice' },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.proposalId',
        votes: {
          $push: {
            choice: '$_id.voteChoice',
            count: '$count'
          }
        },
        totalVotes: { $sum: '$count' }
      }
    }
  ]);
};

export const VotingRecord = model<IVotingRecord>('VotingRecord', VotingRecordSchema);
