import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IPanelUser extends Document {
  username: string;
  password: string;
  role: 'admin' | 'editor' | 'test';
  totalEntries: number;
  dailyEntries: number;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const panelUserSchema = new Schema<IPanelUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['admin', 'editor', 'test'],
      required: true,
    },
    totalEntries: {
      type: Number,
      default: 0,
    },
    dailyEntries: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Şifre hash'leme middleware
panelUserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Şifre karşılaştırma metodu
panelUserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export const PanelUser = mongoose.model<IPanelUser>('PanelUser', panelUserSchema); 