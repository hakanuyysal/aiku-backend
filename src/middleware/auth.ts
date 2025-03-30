import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Supabase bağlantı bilgileri
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface JwtPayload {
  id: string;
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

  // Token kontrolü
  if (req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Oturum açmanız gerekiyor'
    });
  }

  try {
    // Token'i doğrula
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

    // Kullanıcıyı veritabanında ara (şifreyi hariç tut)
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Kullanıcı bulunamadı",
      });
    }

    // Kullanıcıyı request objesine ekleyerek sonraki middleware'lere ilet
    req.user = user;
    next();
  } catch (err) {
    console.error("Token doğrulama hatası:", err);
    return res.status(401).json({
      success: false,
      message: "Geçersiz veya süresi dolmuş token",
    });
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

  // Token kontrolü
  if (req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Oturum açmanız gerekiyor'
    });
  }

  try {
    // Önce normal JWT token olarak doğrulamayı dene
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
      const user = await User.findById(decoded.id).select("-password");
      
      if (user) {
        // Kullanıcı bulundu, request'e ekle ve devam et
        req.user = user;
        return next();
      }
    } catch (jwtError) {
      // JWT doğrulama hatası, Supabase ile deneyelim
      console.log('JWT token doğrulama başarısız, Supabase ile deneniyor');
    }

    // JWT başarısız oldu, Supabase token olarak dene
    const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);
    
    if (error || !supabaseUser) {
      return res.status(401).json({ 
        success: false,
        message: 'Geçersiz veya süresi dolmuş token',
        error: error?.message 
      });
    }
    
    // Supabase ID ile MongoDB'deki kullanıcıyı bul
    const user = await User.findOne({ supabaseId: supabaseUser.id });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Kullanıcı bulunamadı",
      });
    }
    
    // Kullanıcıyı request nesnesine ekle
    req.user = user;
    next();
  } catch (err) {
    console.error("Token doğrulama hatası:", err);
    return res.status(401).json({
      success: false,
      message: "Geçersiz veya süresi dolmuş token",
    });
  }
};
