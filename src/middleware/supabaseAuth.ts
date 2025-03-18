import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { User } from '../models/User';
import dotenv from 'dotenv';

dotenv.config();

// Supabase bağlantı bilgileri
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ''; 

console.log('Supabase Konfigürasyonu:', {
  url: supabaseUrl,
  hasServiceKey: !!supabaseServiceKey,
  serviceKeyLength: supabaseServiceKey?.length
});

// Service key olduğundan emin ol, yoksa anon key kullan
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true
  }
});

// JWT Token doğrulama middleware'i
export const verifySupabaseToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('Auth Header:', req.headers.authorization);
    
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      console.log('Token bulunamadı');
      return res.status(401).json({ 
        success: false,
        message: 'Yetkilendirme token\'ı bulunamadı' 
      });
    }

    console.log('Token alındı, uzunluk:', token.length);
    
    // Supabase token'ını doğrula
    console.log('Supabase auth.getUser çağrılıyor...');
    const { data, error } = await supabase.auth.getUser(token);
    console.log('Supabase yanıtı:', { data, error });

    if (error) {
      console.error('Supabase doğrulama hatası:', error);
      return res.status(401).json({ 
        success: false,
        message: 'Geçersiz veya süresi dolmuş token',
        error: error.message,
        details: {
          name: error.name,
          status: error.status
        }
      });
    }

    const supabaseUser = data.user;
    if (!supabaseUser) {
      console.error('Supabase kullanıcısı bulunamadı');
      return res.status(401).json({ 
        success: false,
        message: 'Geçersiz token - kullanıcı bulunamadı'
      });
    }

    console.log('Supabase kullanıcısı bulundu:', {
      id: supabaseUser.id,
      email: supabaseUser.email
    });

    // MongoDB'den kullanıcıyı bul
    let mongoUser;
    
    // Önce supabaseId ile ara
    if (supabaseUser.id) {
      console.log('SupabaseId ile kullanıcı aranıyor:', supabaseUser.id);
      mongoUser = await User.findOne({ supabaseId: supabaseUser.id });
    }
    
    // Bulunamadıysa email ile ara
    if (!mongoUser && supabaseUser.email) {
      console.log('Email ile kullanıcı aranıyor:', supabaseUser.email);
      mongoUser = await User.findOne({ email: supabaseUser.email });
      
      // Kullanıcı bulunduysa supabaseId'yi güncelle
      if (mongoUser) {
        console.log('Kullanıcı bulundu, supabaseId güncelleniyor');
        mongoUser.supabaseId = supabaseUser.id;
        await mongoUser.save();
      }
    }

    if (!mongoUser) {
      console.error('MongoDB kullanıcısı bulunamadı:', {
        supabaseId: supabaseUser.id,
        email: supabaseUser.email
      });
      return res.status(404).json({ 
        success: false,
        message: 'Kullanıcı bulunamadı',
        debug: {
          supabaseId: supabaseUser.id,
          email: supabaseUser.email
        }
      });
    }

    console.log('MongoDB kullanıcısı bulundu:', {
      id: mongoUser._id,
      email: mongoUser.email
    });
    
    // MongoDB kullanıcısını request'e ekle
    req.user = mongoUser;
    next();
  } catch (error: any) {
    console.error('Token doğrulama hatası:', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ 
      success: false,
      message: 'Token doğrulama hatası',
      error: error.message,
      type: error.constructor.name
    });
  }
}; 