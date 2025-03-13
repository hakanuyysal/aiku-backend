import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ITeamMember extends Document {
  firstName: string;
  lastName: string;
  title: string;
  profilePhoto?: string;
  company: mongoose.Schema.Types.ObjectId;
  companyName: string;
  createdAt: Date;
  subscriptionStatus: 'active' | 'pending' | 'trial' | 'cancelled' | 'expired';
  subscriptionStartDate: Date;
  nextBillingDate: Date;
  subscriptionPlan?: string;
  subscriptionAmount?: number;
  trialEndDate?: Date;
  paymentMethod?: 'creditCard' | 'bankTransfer' | 'other';
  savedCardId?: mongoose.Types.ObjectId; 
  lastPaymentDate?: Date;
  paymentHistory?: Array<{
    amount: number;
    date: Date;
    status: 'success' | 'failed' | 'pending';
    transactionId?: string;
  }>;
}

interface ITeamMemberModel extends Model<ITeamMember> {}

const teamMemberSchema = new Schema<ITeamMember>(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    profilePhoto: {
      type: String,
      trim: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Company ID is required'],
      ref: 'Company',
    },
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
    },
    subscriptionStatus: {
      type: String,
      enum: ['active', 'pending', 'trial', 'cancelled', 'expired'],
      default: 'pending',
    },
    subscriptionStartDate: {
      type: Date,
      default: Date.now,
    },
    nextBillingDate: {
      type: Date,
      default: function() {
        const date = new Date(this.subscriptionStartDate);
        date.setMonth(date.getMonth() + 1);
        return date;
      }
    },
    subscriptionPlan: {
      type: String,
      trim: true,
    },
    subscriptionAmount: {
      type: Number,
      min: 0,
    },
    trialEndDate: {
      type: Date,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    paymentMethod: {
      type: String,
      enum: ['creditCard', 'bankTransfer', 'other'],
    },
    savedCardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Card',
    },
    lastPaymentDate: {
      type: Date,
    },
    paymentHistory: [
      {
        amount: {
          type: Number,
          required: true,
        },
        date: {
          type: Date,
          default: Date.now,
        },
        status: {
          type: String,
          enum: ['success', 'failed', 'pending'],
          required: true,
        },
        transactionId: {
          type: String,
        },
      },
    ],
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

teamMemberSchema.virtual('fullName').get(function (this: ITeamMember) {
  return `${this.firstName} ${this.lastName}`;
});

teamMemberSchema.pre('save', async function(next) {
  if (this.isNew) {
    try {
      const company = await mongoose.model('Company').findById(this.company);
      
      if (company && company.companyType === 'Startup') {
        this.subscriptionStatus = 'trial';
        
        const trialEndDate = new Date(this.subscriptionStartDate);
        trialEndDate.setMonth(trialEndDate.getMonth() + 3);
        this.trialEndDate = trialEndDate;
        
        this.nextBillingDate = trialEndDate;
      }
    } catch (error) {
      console.error('Şirket bilgisi kontrol edilirken hata oluştu:', error);
    }
  }
  
  next();
});

export const TeamMember = mongoose.model<ITeamMember, ITeamMemberModel>('TeamMember', teamMemberSchema);
