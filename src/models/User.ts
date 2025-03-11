import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  profilePicture?: string;
  locale?: {
    country: string;
    language: string;
  };
  emailVerified: boolean;
  authProvider: string;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  profilePicture: { type: String },
  locale: {
    country: { type: String },
    language: { type: String }
  },
  emailVerified: { type: Boolean, default: false },
  authProvider: { type: String, required: true },
  lastLogin: { type: Date },
}, {
  timestamps: true
});

export const User = mongoose.model<IUser>('User', UserSchema);
