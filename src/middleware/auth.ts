import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { IUser, User } from '../models/User';

interface JwtPayload {
  id: string;
}

// Request tipini genişletiyoruz
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

export const protect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let token: string | undefined;

    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Bu işlem için yetkiniz bulunmamaktadır'
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
      req.user = await User.findById(decoded.id);
      next();
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Geçersiz token'
      });
    }
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
}; 