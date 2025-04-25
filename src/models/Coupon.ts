import mongoose, { Schema, Document } from 'mongoose';

export interface ICoupon extends Document {
  code: string;
  planType: string;
  discountRate: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  usedBy: string[];
}

const CouponSchema: Schema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    planType: {
      type: String,
      required: true,
      enum: ['STARTUP_MONTHLY', 'STARTUP_YEARLY', 'BUSINESS_MONTHLY', 'BUSINESS_YEARLY', 'INVESTOR_MONTHLY', 'INVESTOR_YEARLY'],
    },
    discountRate: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    usedBy: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ICoupon>('Coupon', CouponSchema); 