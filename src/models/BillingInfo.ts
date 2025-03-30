import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBillingInfo extends Document {
  user: mongoose.Types.ObjectId;
  billingType: 'individual' | 'corporate'; // Bireysel veya Kurumsal
  
  // Bireysel fatura bilgileri
  identityNumber?: string; // TC Kimlik No (Bireysel için)
  firstName?: string;
  lastName?: string;
  
  // Kurumsal fatura bilgileri
  companyName?: string; // Firma adı (Kurumsal için)
  taxNumber?: string; // Vergi numarası (Kurumsal için)
  taxOffice?: string; // Vergi dairesi (Kurumsal için)
  
  // Ortak fatura bilgileri
  address: string;
  city: string;
  district?: string;
  zipCode?: string;
  phone: string;
  email: string;
  
  // Fatura tercihleri
  isDefault: boolean; // Varsayılan fatura adresi mi?
  
  createdAt: Date;
  updatedAt: Date;
}

interface IBillingInfoModel extends Model<IBillingInfo> {
  // Model statik metodları buraya eklenebilir
}

const billingInfoSchema = new Schema<IBillingInfo>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Kullanıcı ID alanı zorunludur']
  },
  billingType: {
    type: String,
    enum: ['individual', 'corporate'],
    required: [true, 'Fatura tipi alanı zorunludur']
  },
  
  // Bireysel fatura bilgileri
  identityNumber: {
    type: String,
    validate: {
      validator: function(this: IBillingInfo, value: string) {
        // Bireysel fatura tipi için TC Kimlik No zorunlu
        return this.billingType !== 'individual' || (!!value && value.length === 11);
      },
      message: 'Bireysel fatura için geçerli bir TC Kimlik Numarası (11 haneli) girilmelidir'
    }
  },
  firstName: {
    type: String,
    validate: {
      validator: function(this: IBillingInfo, value: string) {
        return this.billingType !== 'individual' || !!value;
      },
      message: 'Bireysel fatura için isim alanı zorunludur'
    }
  },
  lastName: {
    type: String,
    validate: {
      validator: function(this: IBillingInfo, value: string) {
        return this.billingType !== 'individual' || !!value;
      },
      message: 'Bireysel fatura için soyisim alanı zorunludur'
    }
  },
  
  // Kurumsal fatura bilgileri
  companyName: {
    type: String,
    validate: {
      validator: function(this: IBillingInfo, value: string) {
        return this.billingType !== 'corporate' || !!value;
      },
      message: 'Kurumsal fatura için firma adı zorunludur'
    }
  },
  taxNumber: {
    type: String,
    validate: {
      validator: function(this: IBillingInfo, value: string) {
        return this.billingType !== 'corporate' || !!value;
      },
      message: 'Kurumsal fatura için vergi numarası zorunludur'
    }
  },
  taxOffice: {
    type: String,
    validate: {
      validator: function(this: IBillingInfo, value: string) {
        return this.billingType !== 'corporate' || !!value;
      },
      message: 'Kurumsal fatura için vergi dairesi zorunludur'
    }
  },
  
  // Ortak fatura bilgileri
  address: {
    type: String,
    required: [true, 'Adres alanı zorunludur'],
    trim: true
  },
  city: {
    type: String,
    required: [true, 'Şehir alanı zorunludur'],
    trim: true
  },
  district: {
    type: String,
    trim: true
  },
  zipCode: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Telefon alanı zorunludur'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email alanı zorunludur'],
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Lütfen geçerli bir email adresi giriniz']
  },
  
  // Fatura tercihleri
  isDefault: {
    type: Boolean,
    default: false
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Kullanıcı için yalnızca bir varsayılan fatura adresi olabilir
billingInfoSchema.pre('save', async function (next) {
  if (this.isDefault) {
    // Aynı kullanıcının diğer varsayılan fatura adreslerini false yap
    const BillingInfoModel = mongoose.model<IBillingInfo>('BillingInfo');
    await BillingInfoModel.updateMany(
      { user: this.user, _id: { $ne: this._id }, isDefault: true },
      { isDefault: false }
    );
  }
  next();
});

const BillingInfo = mongoose.model<IBillingInfo, IBillingInfoModel>('BillingInfo', billingInfoSchema);

export default BillingInfo; 