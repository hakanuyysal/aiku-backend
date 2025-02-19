import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import { IUser, User } from '../models/User';

interface UserResponse {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
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