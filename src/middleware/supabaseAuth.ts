import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Supabase bağlantı bilgileri
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ''; 

// Service key olduğundan emin ol, yoksa anon key kullan (ideal olarak service key kullanılmalı)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// JWT Token doğrulama middleware'i
export const verifySupabaseToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'Yetkilendirme token\'ı bulunamadı' 
      });
    }
    
    // Supabase token'ını doğrula
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ 
        success: false,
        message: 'Geçersiz veya süresi dolmuş token',
        error: error?.message 
      });
    }
    
    // Kullanıcı bilgilerini request nesnesine ekle
    req.user = user;
    next();
  } catch (error: any) {
    console.error('Supabase token doğrulama hatası:', error);
    res.status(500).json({ 
      success: false,
      message: 'Sunucu hatası',
      error: error.message 
    });
  }
}; 