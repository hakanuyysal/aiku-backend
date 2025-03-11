import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  phone?: string;
  title?: string;
  location?: string;
  profileInfo?: string;
  profilePhoto?: string;
  linkedin?: string;
  instagram?: string;
  facebook?: string;
  twitter?: string;
  authProvider?: string;
  emailVerified: boolean;
  locale?: {
    country: string;
    language: string;
  };
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  favoriteUsers?: mongoose.Types.ObjectId[];
  favoriteCompanies?: mongoose.Types.ObjectId[];
  favoriteProducts?: mongoose.Types.ObjectId[];
  matchPassword(enteredPassword: string): Promise<boolean>;
}

interface IUserModel extends Model<IUser> {
  // Model statik metodları buraya eklenebilir
}

const userSchema = new Schema<IUser>({
  firstName: {
    type: String,
    required: [true, 'İsim alanı zorunludur'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Soyisim alanı zorunludur'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email alanı zorunludur'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Lütfen geçerli bir email adresi giriniz']
  },
  password: {
    type: String,
    required: function() {
      return !this.authProvider;
    },
    minlength: [6, 'Şifre en az 6 karakter olmalıdır'],
    select: false
  },
  phone: {
    type: String,
    trim: true
  },
  title: {
    type: String,
    trim: true
  },
  location: {
    type: String,
    trim: true
  },
  profileInfo: {
    type: String,
    trim: true
  },
  profilePhoto: {
    type: String,
    default: null
  },
  linkedin: {
    type: String,
    trim: true
  },
  instagram: {
    type: String,
    trim: true
  },
  facebook: {
    type: String,
    trim: true
  },
  twitter: {
    type: String,
    trim: true
  },
  authProvider: {
    type: String,
    enum: ['local', 'linkedin'],
    default: 'local'
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  locale: {
    country: { type: String },
    language: { type: String }
  },
  lastLogin: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  favoriteUsers: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: []
  }],
  favoriteCompanies: [{
    type: Schema.Types.ObjectId,
    ref: 'Company',
    default: []
  }],
  favoriteProducts: [{
    type: Schema.Types.ObjectId,
    ref: 'Product',
    default: []
  }]
}, {
  timestamps: true
});

userSchema.pre('save', async function (this: IUser, next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (this: IUser, enteredPassword: string): Promise<boolean> {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

export const User = mongoose.model<IUser, IUserModel>('User', userSchema);
