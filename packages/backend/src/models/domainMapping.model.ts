import { Schema, model, Types, Document } from 'mongoose';

export interface IDomainMapping extends Document {
  business: Types.ObjectId;
  hostname: string;
  createdAt: Date;
  updatedAt: Date;
}

const DomainMappingSchema = new Schema<IDomainMapping>(
  {
    business: {
      type:    Schema.Types.ObjectId,
      ref:     'Business',
      required:true
    },
    hostname: {
      type:     String,
      required: true,
      unique:   true,
      trim:     true,
      lowercase:true
    }
  },
  {
    timestamps: true,  // adds createdAt / updatedAt
  }
);

// If you want a compound uniqueness constraint (e.g. each brand can only register a given hostname once):
// DomainMappingSchema.index({ business: 1, hostname: 1 }, { unique: true });

export const DomainMapping = model<IDomainMapping>(
  'DomainMapping',
  DomainMappingSchema
);
