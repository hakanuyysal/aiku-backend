import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ICompany extends Document {
  companyName: string;
  companyLogo?: string;
  companyVideo?: string;
  companyType: 'Enterprise' | 'Entrepreneur' | 'Investor' | 'Startup';
  openForInvestments?: boolean;
  businessModel: 'B2B' | 'B2C' | 'B2G' | 'C2C' | 'C2B' | 'D2C' | 'B2B2C';
  companySector: string;
  companySize: '1-10' | '11-50' | '51-200' | '201-500' | '501-1000' | '1001-5000' | '5001-10000' | '10001+';
  companyEmail: string;
  companyPhone: string;
  companyInfo: string;
  detailedDescription: string; 
  companyWebsite?: string;
  companyAddress: string;
  companyLinkedIn?: string;
  companyTwitter?: string;
  companyInstagram?: string;  
  interestedSectors?: string[];
  isIncorporated?: boolean;
  user: mongoose.Schema.Types.ObjectId;
  createdAt: Date;
  slug: string;
}

interface ICompanyModel extends Model<ICompany> {}

const companySchema = new Schema<ICompany>(
  {
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      unique: true,
    },
    companyLogo: {
      type: String,
      trim: true, 
    },
    companyVideo: {
      type: String,
      trim: true,
    },
    companyType: {
      type: String,
      required: [true, 'Company type is required'],
      enum: ['Enterprise', 'Entrepreneur', 'Investor', 'Startup'],
    },
    openForInvestments: {
      type: Boolean,
      default: false,
    },
    businessModel: {
      type: String,
      required: [true, 'Business model is required'],
      enum: ['B2B', 'B2C', 'B2G', 'C2C', 'C2B', 'D2C', 'B2B2C'],
    },
    companySector: {
      type: String,
      required: [true, 'Company sector is required'],
    },
    companySize: {
      type: String,
      required: [true, 'Company size is required'],
      enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5001-10000', '10001+'],
    },
    companyEmail: {
      type: String,
      required: [true, 'Company email is required'],
      trim: true,
      lowercase: true,
      unique: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email address'],
    },
    companyPhone: {
      type: String,
      required: [true, 'Company phone is required'],
      trim: true,
      match: [/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number'],
    },
    companyInfo: {
      type: String,
      required: [true, 'Company information is required'],
      trim: true,
    },
    detailedDescription: {
      type: String,
      required: [true, 'Detailed description is required'],
      trim: true,
    },
    companyWebsite: {
      type: String,
      trim: true,
      match: [
        /^(https?:\/\/)?([\w.-]+)\.([a-z]{2,6}\.?)(\/[\w.-]*)*\/?$/,
        'Please enter a valid URL',
      ],
    },
    companyAddress: {
      type: String,
      required: [true, 'Company address is required'],
      trim: true,
    },
    companyLinkedIn: {
      type: String,
      trim: true,
      match: [
        /^(https?:\/\/)?([\w]+\.)?linkedin\.com\/(company|in)\/[\w-]+\/?$/,
        'Please enter a valid LinkedIn URL',
      ],
    },
    companyTwitter: {
      type: String,
      trim: true,
      match: [
        /^(https?:\/\/)?(www\.)?x\.com\/[A-Za-z0-9_]+\/?$/,
        'Please enter a valid Twitter URL',
      ],
    },
    companyInstagram: {
      type: String,
      trim: true,
      match: [
        /^(https?:\/\/)?(www\.)?instagram\.com\/[A-Za-z0-9_.]+\/?$/,
        'Please enter a valid Instagram URL',
      ],
    },
    interestedSectors: {
      type: [String],
      default: [],
    },
    isIncorporated: {
      type: Boolean,
      default: false,
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

// **Slug oluşturma (companyName üzerinden)**
companySchema.virtual('slug').get(function (this: ICompany) {
  return this.companyName.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
});

export const Company = mongoose.model<ICompany, ICompanyModel>('Company', companySchema);
