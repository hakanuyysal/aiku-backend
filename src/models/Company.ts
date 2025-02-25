import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ICompany extends Document {
  companyName: string;
  companyType: 'Enterprise' | 'Entrepreneur' | 'Investor' | 'Startup';
  openForInvestments?: boolean;
  businessModel: 'B2B' | 'B2C' | 'B2G' | 'C2C' | 'C2B' | 'D2C' | 'B2B2C';
  companySector: string;
  companySize: '1-10' | '11-50' | '51-200' | '201-500' | '501-1000' | '1001-5000' | '5001-10000' | '10001+';
  companyEmail: string;
  companyPhone: string;
  companyInfo: string;
  companyWebsite: string;
  companyAddress: string;
  companyLinkedIn: string;
  companyTwitter: string;
  user: mongoose.Schema.Types.ObjectId;
  createdAt: Date;
}

interface ICompanyModel extends Model<ICompany> {}

const companySchema = new Schema<ICompany>({
  companyName: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true
  },
  companyType: {
    type: String,
    required: [true, 'Company type is required'],
    enum: ['Enterprise', 'Entrepreneur', 'Investor', 'Startup']
  },
  openForInvestments: {
    type: Boolean,
    default: false
  },
  businessModel: {
    type: String,
    required: [true, 'Business model is required'],
    enum: ['B2B', 'B2C', 'B2G', 'C2C', 'C2B', 'D2C', 'B2B2C']
  },
  companySector: {
    type: String,
    required: [true, 'Company sector is required']
  },
  companySize: {
    type: String,
    required: [true, 'Company size is required'],
    enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5001-10000', '10001+']
  },
  companyEmail: {
    type: String,
    required: [true, 'Company email is required'],
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email address']
  },
  companyPhone: {
    type: String,
    required: [true, 'Company phone is required'],
    trim: true
  },
  companyInfo: {
    type: String,
    required: [true, 'Company information is required'],
    trim: true
  },
  companyWebsite: {
    type: String,
    required: [true, 'Company website is required'],
    trim: true
  },
  companyAddress: {
    type: String,
    required: [true, 'Company address is required'],
    trim: true
  },
  companyLinkedIn: {
    type: String,
    required: [true, 'Company LinkedIn is required'],
    trim: true
  },
  companyTwitter: {
    type: String,
    required: [true, 'Company Twitter is required'],
    trim: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'User ID is required'],
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const Company = mongoose.model<ICompany, ICompanyModel>('Company', companySchema);
