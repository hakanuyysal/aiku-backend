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
    
    // Önce body'den provider bilgisini alalım
    const provider = req.body?.provider || '';
    console.log('İstek gönderen provider:', provider);
    
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
    console.log('Supabase yanıtı:', { data, error: error?.message });

    if (error) {
      console.error('Supabase doğrulama hatası:', error);
      
      // LinkedIn entegrasyonu için özel durum kontrolü
      if (provider === 'linkedin_oidc' || provider === 'linkedin') {
        // LinkedIn entegrasyonu için token hatalarında daha esnek davranabiliriz
        console.log('LinkedIn entegrasyonu için devam ediliyor...');
        
        // Kullanıcı bilgilerini body'den alalım
        if (req.body?.email) {
          req.user = { 
            email: req.body.email, 
            _id: req.body.user_id || null 
          };
          next();
          return;
        }
      }
      
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
      
      // LinkedIn için esneklik
      if (provider === 'linkedin_oidc' || provider === 'linkedin') {
        if (req.body?.email) {
          req.user = { 
            email: req.body.email,
            _id: req.body.user_id || null
          };
          next();
          return;
        }
      }
      
      return res.status(401).json({ 
        success: false,
        message: 'Geçersiz token - kullanıcı bulunamadı'
      });
    }

    console.log('Supabase kullanıcısı bulundu:', {
      id: supabaseUser.id,
      email: supabaseUser.email,
      provider: supabaseUser.app_metadata?.provider || 'unknown'
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
    
    // LinkedIn kullanıcısı için kontrol - bulamamış isek body'deki kullanıcıya güvenelim
    if (!mongoUser && (provider === 'linkedin_oidc' || provider === 'linkedin')) {
      if (req.body?.email) {
        console.log('LinkedIn entegrasyonu için body verisi kullanılıyor:', req.body.email);
        req.user = { 
          email: req.body.email,
          _id: req.body.user_id || null
        };
        next();
        return;
      }
    }

    if (!mongoUser) {
      console.error('MongoDB kullanıcısı bulunamadı:', {
        supabaseId: supabaseUser.id,
        email: supabaseUser.email,
        provider: provider || supabaseUser.app_metadata?.provider
      });
      
      // Kullanıcı bilgilerini req.user'a ekleyelim ki controller bu bilgileri kullanabilsin
      req.user = {
        email: supabaseUser.email,
        _id: null,
        firstName: supabaseUser.user_metadata?.given_name || supabaseUser.user_metadata?.first_name,
        lastName: supabaseUser.user_metadata?.family_name || supabaseUser.user_metadata?.last_name
      };
      
      // Kullanıcı bulunamadıysa 401 yerine devam edelim - controller yeni kullanıcı oluşturacak
      next();
      return;
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