import mongoose, { Document, Schema } from 'mongoose';

export interface IFactorySettings extends Document {
  type: 'nft' | 'voting';
  address: string;
  networkName: string;
  chainId: number;
  deployedAt: Date;
  deployedBy: string; // Relayer wallet address
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const factorySettingsSchema = new Schema<IFactorySettings>({
  type: {
    type: String,
    enum: ['nft', 'voting'],
    required: true,
    unique: true // Only one factory of each type
  },
  address: {
    type: String,
    required: true,
    validate: {
      validator: function(v: string) {
        return /^0x[a-fA-F0-9]{40}$/.test(v);
      },
      message: 'Factory address must be a valid Ethereum address'
    }
  },
  networkName: {
    type: String,
    required: true,
    default: 'base'
  },
  chainId: {
    type: Number,
    required: true,
    default: 8453 // Base mainnet
  },
  deployedAt: {
    type: Date,
    default: Date.now
  },
  deployedBy: {
    type: String,
    required: true,
    validate: {
      validator: function(v: string) {
        return /^0x[a-fA-F0-9]{40}$/.test(v);
      },
      message: 'Deployer address must be a valid Ethereum address'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient lookups
factorySettingsSchema.index({ type: 1 });
factorySettingsSchema.index({ address: 1 });
factorySettingsSchema.index({ isActive: 1 });

export const FactorySettings = mongoose.model<IFactorySettings>('FactorySettings', factorySettingsSchema);

