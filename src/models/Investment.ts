import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IInvestment extends Document {
  investmentTitle: string;
  companyName: string;
  companyId: mongoose.Schema.Types.ObjectId;
  productName?: string;
  productId?: mongoose.Schema.Types.ObjectId;
  targetedInvestment: number;
  minimumTicket: number;
  deadline: Date;
  investmentType: string;
  description: string;
  logo?: string;
  completedInvestment: number;
  createdAt: Date;
  slug: string;
}

interface IInvestmentModel extends Model<IInvestment> { }

const investmentSchema = new Schema<IInvestment>(
  {
    investmentTitle: {
      type: String,
      required: [true, 'Investment title is required'],
      trim: true,
    },
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
      trim: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
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
    investmentType: {
      type: String,
      required: [true, 'Investment type is required'],
      trim: true,
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
    completedInvestment: {
      type: Number,
      default: 0,
      min: [0, 'Completed investment cannot be negative'],
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
  const prodPart = this.productName ? ` ${this.productName}` : '';
  return `${this.companyName}${prodPart}`
    .toLowerCase()
    .replace(/ /g, '-')
    .replace(/[^\w-]+/g, '');
});

export const Investment = mongoose.model<IInvestment, IInvestmentModel>(
  'Investment',
  investmentSchema
);
