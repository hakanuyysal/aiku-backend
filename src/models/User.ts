import mongoose, { Document, Model, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  title?: string;
  location?: string;
  profileInfo?: string;
  profilePhoto?: string;
  linkedin?: string;
  instagram?: string;
  facebook?: string;
  twitter?: string;
  createdAt: Date;
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
    required: [true, 'Şifre alanı zorunludur'],
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
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Şifreyi hashleme
userSchema.pre('save', async function (this: IUser, next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Şifre karşılaştırma metodu
userSchema.methods.matchPassword = async function (this: IUser, enteredPassword: string): Promise<boolean> {
  return await bcrypt.compare(enteredPassword, this.password);
};

export const User = mongoose.model<IUser, IUserModel>('User', userSchema);
