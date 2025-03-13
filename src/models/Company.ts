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
  subscriptionStatus?: 'active' | 'pending' | 'trial' | 'cancelled' | 'expired';
  subscriptionStartDate?: Date;
  trialEndsAt?: Date;
  subscriptionPlan?: string;
  subscriptionAmount?: number;
  autoRenewal?: boolean;
  paymentMethod?: 'creditCard' | 'bankTransfer' | 'other';
  savedCardId?: mongoose.Types.ObjectId; 
  lastPaymentDate?: Date;
  nextPaymentDate?: Date;
  paymentHistory?: Array<{
    amount: number;
    date: Date;
    status: 'success' | 'failed' | 'pending';
    transactionId?: string;
    description?: string;
  }>;
  billingAddress?: string;
  vatNumber?: string;
  
  checkAutoRenewal(): Promise<boolean>;
  processPayment(): Promise<{success: boolean, transactionId?: string, error?: string}>;
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
    subscriptionStatus: {
      type: String,
      enum: ['active', 'pending', 'trial', 'cancelled', 'expired'],
      default: 'pending'
    },
    subscriptionStartDate: {
      type: Date,
      default: Date.now
    },
    trialEndsAt: {
      type: Date
    },
    subscriptionPlan: {
      type: String,
      trim: true
    },
    subscriptionAmount: {
      type: Number,
      min: 0
    },
    autoRenewal: {
      type: Boolean,
      default: true
    },
//ödeme
    paymentMethod: {
      type: String,
      enum: ['creditCard', 'bankTransfer', 'other'],
      default: 'creditCard'
    },
    savedCardId: {
      type: mongoose.Types.ObjectId,
      ref: 'Card',
    },
    lastPaymentDate: {
      type: Date,
    },
    nextPaymentDate: {
      type: Date,
    },
    paymentHistory: {
      type: [
        {
          amount: Number,
          date: Date,
          status: String,
          transactionId: String,
          description: String,
        }
      ],
    },
    billingAddress: {
      type: String,
    },
    vatNumber: {
      type: String,
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

// Şirket oluşturulduğunda, eğer Startup ise 3 aylık deneme süresi tanımlanır
companySchema.pre('save', function(next) {
  if (this.isNew && this.companyType === 'Startup') {
    this.subscriptionStatus = 'trial';
    const trialEndDate = new Date();
    trialEndDate.setMonth(trialEndDate.getMonth() + 3);
    this.trialEndsAt = trialEndDate;
    this.nextPaymentDate = trialEndDate; // Deneme süresi bitiminde otomatik çekim
  }
  next();
});

// Deneme süresinin sonunda otomatik ödemeyi kontrol eden middleware
companySchema.methods.checkAutoRenewal = async function() {
  // Deneme süresinin bitişi kontrol edilir
  if (this.subscriptionStatus === 'trial' && this.trialEndsAt && new Date() >= this.trialEndsAt) {
    // Eğer otomatik yenileme açıksa ve kayıtlı bir kart varsa
    if (this.autoRenewal && this.savedCardId) {
      try {
        // Ödeme işlemini gerçekleştir
        // Not: Bu kısım gerçek ödeme entegrasyonuna göre uyarlanmalıdır
        const paymentResult = await this.processPayment();
        
        if (paymentResult.success) {
          // Ödeme başarılı ise aboneliği aktifleştir
          this.subscriptionStatus = 'active';
          // Bir sonraki ödeme tarihini güncelle
          const nextBillingDate = new Date();
          nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
          this.nextPaymentDate = nextBillingDate;
          
          // Ödeme geçmişine ekle
          if (!this.paymentHistory) this.paymentHistory = [];
          this.paymentHistory.push({
            amount: this.subscriptionAmount || 0,
            date: new Date(),
            status: 'success',
            transactionId: paymentResult.transactionId,
            description: 'Otomatik abonelik yenileme'
          });
          
          this.lastPaymentDate = new Date();
          await this.save();
          return true;
        } else {
          // Ödeme başarısız ise durumu güncelle
          this.subscriptionStatus = 'expired';
          await this.save();
          return false;
        }
      } catch (error) {
        console.error('Otomatik ödeme işleminde hata:', error);
        return false;
      }
    } else {
      // Otomatik yenileme kapalı veya kayıtlı kart yoksa
      this.subscriptionStatus = 'expired';
      await this.save();
      return false;
    }
  }
  return true;
};

// Ödeme işlemini gerçekleştiren metod
companySchema.methods.processPayment = async function() {
  // Bu kısım gerçek ödeme entegrasyonuna göre uyarlanmalıdır
  try {
    if (!this.savedCardId) {
      throw new Error('Kayıtlı kart bulunamadı');
    }
    
    // Kart bilgisini al
    const savedCard = await mongoose.model('SavedCard').findById(this.savedCardId);
    if (!savedCard) {
      throw new Error('Geçerli kart bilgisi bulunamadı');
    }
    
    // Param POS API ile ödeme işlemi
    // Not: Bu kısım gerçek entegrasyonda doldurulmalıdır
    const ParamPosService = await import('../services/ParamPosService');
    const paymentService = ParamPosService.default;
    
    // SavedCard bilgilerinden yeniden kart bilgilerini almalıyız
    // Gerçek uygulamada cardToken kullanılarak işlem yapılmalı
    // Burada örnek olarak veriyoruz
    const paymentResult = await paymentService.payment({
      amount: this.subscriptionAmount || 0,
      cardNumber: savedCard.cardMaskedNumber.replace(/X/g, '0'), // Örnek amaçlı, gerçekte böyle kullanılmamalı
      cardHolderName: savedCard.cardHolderName,
      expireMonth: savedCard.cardExpireMonth,
      expireYear: savedCard.cardExpireYear,
      cvc: '000', // Örnek amaçlı, gerçekte kart kayıt sırasında saklanmamalı
      installment: 1,
      is3D: false,
      userId: this.user.toString()
    });
    
    return {
      success: true,
      transactionId: paymentResult.TURKPOS_RETVAL_Islem_ID || Date.now().toString()
    };
  } catch (error: any) {
    console.error('Ödeme işleminde hata:', error);
    return { success: false, error: error.message };
  }
};

export const Company = mongoose.model<ICompany, ICompanyModel>('Company', companySchema);
