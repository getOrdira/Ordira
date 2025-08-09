// src/models/user.model.ts
import bcrypt from 'bcrypt';

export interface IUser extends Document {
  email: string;
  password: string;
  emailCode: string;
  isEmailVerified: boolean;
  
  // Enhanced security
  lastLoginAt?: Date;
  loginAttempts: number;
  lockUntil?: Date;
  
  // Methods
  comparePassword(candidate: string): Promise<boolean>;
  incrementLoginAttempts(): Promise<IUser>;
  resetLoginAttempts(): Promise<IUser>;
  isAccountLocked(): boolean;
}

const UserSchema = new Schema<IUser>({
  email: { 
    type: String, 
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: { 
    type: String, 
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  emailCode: { type: String, select: false },
  isEmailVerified: { type: Boolean, default: false },
  
  lastLoginAt: { type: Date },
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date }
});

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.comparePassword = function (candidate: string) {
  return bcrypt.compare(candidate, this.password);
};

UserSchema.methods.incrementLoginAttempts = function(): Promise<IUser> {
  if (this.lockUntil && this.lockUntil < new Date()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates: any = { $inc: { loginAttempts: 1 } };
  if (this.loginAttempts + 1 >= 5) {
    updates.$set = { lockUntil: new Date(Date.now() + 2 * 60 * 60 * 1000) };
  }
  
  return this.updateOne(updates);
};

UserSchema.methods.resetLoginAttempts = function(): Promise<IUser> {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 },
    $set: { lastLoginAt: new Date() }
  });
};

UserSchema.methods.isAccountLocked = function(): boolean {
  return !!(this.lockUntil && this.lockUntil > new Date());
};

export const User = model<IUser>('User', UserSchema);