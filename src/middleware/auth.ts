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
  let token: string | undefined;

  // Token kontrolü
  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Yetkilendirme başarısız, token bulunamadı'
    });
  }

  try {
    // Token'i doğrula
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

    // Kullanıcıyı veritabanında ara (şifreyi hariç tut)
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    // Kullanıcıyı request objesine ekleyerek sonraki middleware'lere ilet
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Geçersiz veya süresi dolmuş token'
    });
  }
};
