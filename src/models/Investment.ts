import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IInvestment extends Document {
  companyName: string;
  companyId: mongoose.Schema.Types.ObjectId;
  productName: string;
  productId: mongoose.Schema.Types.ObjectId;
  targetedInvestment: number;
  minimumTicket: number;
  deadline: Date;
  description: string;
  logo?: string;
  createdAt: Date;
  slug: string;
}

interface IInvestmentModel extends Model<IInvestment> {}

const investmentSchema = new Schema<IInvestment>(
  {
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Company ID is required'],
      ref: 'Company',
    },
    productName: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Product ID is required'],
      ref: 'Product',
    },
    targetedInvestment: {
      type: Number,
      required: [true, 'Targeted investment is required'],
      min: [0, 'Targeted investment cannot be negative'],
    },
    minimumTicket: {
      type: Number,
      required: [true, 'Minimum ticket is required'],
      min: [0, 'Minimum ticket cannot be negative'],
    },
    deadline: {
      type: Date,
      required: [true, 'Deadline is required'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    logo: {
      type: String,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

investmentSchema.virtual('slug').get(function (this: IInvestment) {
  return `${this.companyName} ${this.productName}`
    .toLowerCase()
    .replace(/ /g, '-')
    .replace(/[^\w-]+/g, '');
});

export const Investment = mongoose.model<IInvestment, IInvestmentModel>('Investment', investmentSchema);
