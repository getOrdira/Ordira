// --------------------------------------------------
// user.model.ts
// --------------------------------------------------
import { Schema, model, Document } from 'mongoose';
import bcrypt from 'bcrypt';

export interface User extends Document {
  email:    string;
  password: string;
  emailCode: string;
  isEmailVerified: boolean;
  comparePassword(candidate: string): Promise<boolean>;
}

const UserSchema = new Schema<User>({
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },
  emailCode:  { type: String },
  isEmailVerified: { type: Boolean, default: false }
});

// Hash password before save
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare passwords
UserSchema.methods.comparePassword = function (candidate: string) {
  return bcrypt.compare(candidate, this.password);
};

export const User = model<User>('User', UserSchema);