import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { IUser, User } from '../models/User';

interface UserResponse {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  title?: string;
  location?: string;
  profileInfo?: string;
  profilePhoto?: string;
  linkedin?: string;
  instagram?: string;
  facebook?: string;
  twitter?: string;
}

// JWT Token oluşturma
const createToken = (id: string): string => {
  return jwt.sign({ id }, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// Kayıt işlemi
export const register = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { firstName, lastName, email, password } = req.body;

    // Email kontrolü
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({
        success: false,
        message: 'Bu email adresi zaten kayıtlı'
      });
    }

    // Yeni kullanıcı oluşturma
    user = await User.create({
      firstName,
      lastName,
      email,
      password
    });

    const token = createToken(user._id);

    const userResponse: UserResponse = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email
    };

    res.status(201).json({
      success: true,
      token,
      user: userResponse
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

// Giriş işlemi
export const login = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Email ve şifre kontrolü
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Geçersiz email veya şifre'
      });
    }

    // Şifre kontrolü
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Geçersiz email veya şifre'
      });
    }

    const token = createToken(user._id);

    const userResponse: UserResponse = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email
    };

    res.status(200).json({
      success: true,
      token,
      user: userResponse
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

// Kullanıcı bilgileri getirme
export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ success: false, message: 'Yetkilendirme başarısız, token bulunamadı' });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        title: user.title,
        location: user.location,
        profileInfo: user.profileInfo,
        profilePhoto: user.profilePhoto,
        linkedin: user.linkedin,
        instagram: user.instagram,
        facebook: user.facebook,
        twitter: user.twitter,
        createdAt: user.createdAt
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
  }
};


//Kullanıcı bilgileri güncelleme
export const updateUser = async (req: Request, res: Response) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: 'Yetkilendirme başarısız, token bulunamadı' });
    }

    // Kullanıcıyı doğrula
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    let user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    }

    // Güncellenmek istenen alanları al
    const { firstName, lastName, email, phone, title, location, profileInfo, profilePhoto, linkedin, instagram, facebook, twitter, password } = req.body;

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (title) user.title = title;
    if (location) user.location = location;
    if (profileInfo) user.profileInfo = profileInfo;
    if (profilePhoto) user.profilePhoto = profilePhoto;
    if (linkedin) user.linkedin = linkedin;
    if (instagram) user.instagram = instagram;
    if (facebook) user.facebook = facebook;
    if (twitter) user.twitter = twitter;

    // **Şifre güncelleniyorsa hashle**
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    // Güncellenmiş kullanıcıyı kaydet
    await user.save();

    // Kullanıcı bilgilerini döndür
    const updatedUserResponse: UserResponse = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      title: user.title,
      location: user.location,
      profileInfo: user.profileInfo,
      profilePhoto: user.profilePhoto,
      linkedin: user.linkedin,
      instagram: user.instagram,
      facebook: user.facebook,
      twitter: user.twitter,
    };

    res.status(200).json({ success: true, user: updatedUserResponse });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
  }
};

// Kullanıcı bilgilerini id ile getirme
export const getUserById = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: "Kullanıcı bulunamadı" });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        title: user.title,
        location: user.location,
        profileInfo: user.profileInfo,
        profilePhoto: user.profilePhoto,
        linkedin: user.linkedin,
        instagram: user.instagram,
        facebook: user.facebook,
        twitter: user.twitter,
        createdAt: user.createdAt
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: "Sunucu hatası", error: err.message });
  }
};
