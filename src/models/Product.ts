import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IProduct extends Document {
  productName: string;
  productLogo?: string;
  productCategory: string;
  productDescription: string;
  detailedDescription: string;
  tags: string[];
  problems: string[];
  solutions: string[];
  improvements: string[];
  keyFeatures: string[];
  pricingModel: string;
  releaseDate?: Date;
  productPrice?: number;
  productWebsite?: string;
  productLinkedIn?: string;
  productTwitter?: string;
  companyId: mongoose.Schema.Types.ObjectId;
  companyName: string;
  user: mongoose.Schema.Types.ObjectId;
  createdAt: Date;
  slug: string;
}

interface IProductModel extends Model<IProduct> {}

const productSchema = new Schema<IProduct>(
  {
    productName: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      unique: true,
    },
    productLogo: {
      type: String,
      trim: true,
    },
    productCategory: {
      type: String,
      required: [true, 'Product category is required'],
      enum: [
        'AI',
        'Fintech',
        'Healthcare',
        'E-commerce',
        'Cybersecurity',
        'Blockchain',
        'LegalTech',
        'EdTech',
        'IoT',
        'Marketing',
        'Social Media',
        'Other',
      ],
    },
    productDescription: {
      type: String,
      required: [true, 'Short description is required'],
      trim: true,
    },
    detailedDescription: {
      type: String,
      required: [true, 'Detailed description is required'],
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    problems: {
      type: [String],
      default: [],
    },
    solutions: {
      type: [String],
      default: [],
    },
    improvements: {
      type: [String],
      default: [],
    },
    keyFeatures: {
      type: [String],
      default: [],
    },
    pricingModel: {
      type: String,
      required: [true, 'Pricing model is required'],
      trim: true,
    },
    releaseDate: {
      type: Date,
    },
    productPrice: {
      type: Number,
      min: [0, 'Price cannot be negative'],
    },
    productWebsite: {
      type: String,
      trim: true,
      match: [
        /^(https?:\/\/)?([\w.-]+)\.([a-z]{2,6}\.?)(\/[\w.-]*)*\/?$/,
        'Please enter a valid URL',
      ],
    },
    productLinkedIn: {
      type: String,
      trim: true,
      match: [
        /^(https?:\/\/)?([\w]+\.)?linkedin\.com\/(company|in)\/[\w-]+\/?$/,
        'Please enter a valid LinkedIn URL',
      ],
    },
    productTwitter: {
      type: String,
      trim: true,
      match: [
        /^(https?:\/\/)?(www\.)?twitter\.com\/[A-Za-z0-9_]+\/?$/,
        'Please enter a valid Twitter URL',
      ],
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Company ID is required'],
      ref: 'Company',
    },
    companyName: {
        type: String,
        required: [true, 'Company name is required'],
        trim: true,
      },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'User ID is required'],
      ref: 'User',
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

productSchema.virtual('slug').get(function (this: IProduct) {
  return this.productName.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
});

export const Product = mongoose.model<IProduct, IProductModel>('Product', productSchema);
