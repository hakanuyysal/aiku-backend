import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { UnauthorizedError } from '../utils/errors';
import { PanelUser } from '../models/PanelUser';

dotenv.config();

// Supabase bağlantı bilgileri
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface JwtPayload {
  id: string;
  userId?: string;
  type?: string;
}

// Request tipini genişletiyoruz - module augmentation kullanarak
import 'express';
declare module 'express' {
  interface Request {
    user?: any; // any kullanarak tip uyumsuzluğunu geçici olarak çözüyoruz
  }
}

export const protect = async (req: Request, res: Response, next: NextFunction) => {
  let token: string | undefined;
  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Oturum açmanız gerekiyor' });
  }

  try {
    // Token'i doğrula (hem normal hem panel login token'ı bu secret ile)
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

    let userDoc;
    if (decoded.type === 'panel' && decoded.userId) {
      // panel login token
      userDoc = await PanelUser.findById(decoded.userId).select('-password');
    } else if (decoded.id) {
      // normal email/password login token
      userDoc = await User.findById(decoded.id).select('-password');
    }

    if (!userDoc) {
      return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    }

    // İster PanelUser, ister normal User; frontend için ortak `req.user`
    req.user = userDoc;
    next();

  } catch (err) {
    console.error('Token doğrulama hatası:', err);
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};


/**
 * Admin yetkilendirmesi için middleware
 * protect middleware'inden sonra kullanılmalıdır
 */
export const adminProtect = (req: Request, res: Response, next: NextFunction) => {
  // protect middleware'i req.user'ı oluşturmuş olmalı
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Oturum açmanız gerekiyor'
    });
  }

  // Kullanıcının admin olup olmadığını kontrol et
  if (!req.user.isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Bu işlem için admin yetkileri gerekiyor'
    });
  }

  // Admin yetkisi doğrulandı, bir sonraki middleware'e geç
  next();
};

/**
 * Hem normal JWT token hem de Supabase token ile doğrulama yapan middleware
 * Önce JWT token kontrolü yapar, başarısız olursa Supabase token kontrolü yapar
 */
export const optionalSupabaseToken = async (req: Request, res: Response, next: NextFunction) => {
  let token: string | undefined;

  if (req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Oturum açmanız gerekiyor' });
  }

  try {
    // 1) Önce JWT olarak deneyelim (normal user ya da panel user)
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

      // -- panel token mı?
      if (decoded.type === 'panel' && decoded.userId) {
        const panelUser = await PanelUser.findById(decoded.userId).select('-password');
        if (panelUser) {
          req.user = panelUser;
          return next();
        }
      }
      // -- normal JWT token mı?
      if (decoded.id) {
        const user = await User.findById(decoded.id).select('-password');
        if (user) {
          req.user = user;
          return next();
        }
      }
    } catch (jwtErr) {
      // JWT doğrulama hatası ise bir sonraki adıma geç
      console.log('JWT doğrulama başarısız veya token tipi farklı, Supabase ile deneniyor');
    }

    // 2) Supabase token olarak dene
    const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);
    if (error || !supabaseUser) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token', error: error?.message });
    }

    // Supabase ID ile MongoDB'deki kullanıcıyı bul
    const user = await User.findOne({ supabaseId: supabaseUser.id });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    }

    req.user = user;
    next();

  } catch (err) {
    console.error("Token doğrulama hatası:", err);
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};


export const authenticateToken = (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    throw new UnauthorizedError('Token bulunamadı');
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = user;
    next();
  } catch (error) {
    throw new UnauthorizedError('Geçersiz token');
  }
};
