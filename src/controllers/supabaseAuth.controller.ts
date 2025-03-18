import { Request, Response } from 'express';
import { User } from '../models/User';
import jwt from 'jsonwebtoken';
import { Secret, SignOptions } from 'jsonwebtoken';

class SupabaseAuthController {
  /**
   * Supabase kullanıcı bilgilerini senkronize eder
   * Bu endpoint, frontend'den Supabase ile giriş yapan kullanıcıları backend'e senkronize etmek için kullanılır
   */
  async syncSupabaseUser(req: Request, res: Response) {
    try {
      const supabaseUser = req.user;
      const { provider, supabase_user_id, email, user_metadata } = req.body;
      
      if (!supabaseUser) {
        return res.status(400).json({
          success: false,
          message: 'Kullanıcı bilgileri bulunamadı'
        });
      }

      console.log('Gelen Supabase verileri:', {
        supabaseUser,
        requestBody: req.body
      });

      // İsim bilgilerini çıkart
      const firstName = user_metadata?.given_name || '';
      const lastName = user_metadata?.family_name || '';
      const profilePhoto = user_metadata?.picture || '';

      // Önce email ile kullanıcıyı ara
      let user = await User.findOne({ email });
      
      // Email ile bulunamadıysa, Supabase ID ile ara
      if (!user) {
        user = await User.findOne({ supabaseId: supabase_user_id });
      }
      
      if (!user) {
        // Yeni kullanıcı oluştur
        user = new User({
          email,
          firstName,
          lastName,
          supabaseId: supabase_user_id,
          profilePhoto,
          authProvider: provider,
          supabaseMetadata: user_metadata,
          emailVerified: user_metadata?.email_verified || false,
          lastLogin: new Date()
        });
        
        await user.save();
        console.log('✅ Yeni kullanıcı kaydedildi:', { email, provider });
      } else {
        // Mevcut kullanıcıyı güncelle
        user.lastLogin = new Date();
        user.supabaseId = supabase_user_id;
        
        if (!user.firstName && firstName) {
          user.firstName = firstName;
        }
        if (!user.lastName && lastName) {
          user.lastName = lastName;
        }
        if (!user.profilePhoto && profilePhoto) {
          user.profilePhoto = profilePhoto;
        }
        
        user.supabaseMetadata = user_metadata;
        user.emailVerified = user_metadata?.email_verified || user.emailVerified;
        
        await user.save();
        console.log('✅ Mevcut kullanıcı güncellendi:', { email, provider });
      }

      // JWT token oluştur
      const jwtSecret: Secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
      const jwtOptions: SignOptions = { expiresIn: process.env.JWT_EXPIRE || '24h' };
      
      const token = jwt.sign(
        { id: user._id.toString() },
        jwtSecret,
        jwtOptions
      );
      
      res.status(200).json({ 
        success: true, 
        message: 'Kullanıcı başarıyla senkronize edildi',
        token,
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profilePhoto: user.profilePhoto,
          authProvider: user.authProvider
        }
      });
    } catch (error: any) {
      console.error('❌ Supabase kullanıcı senkronizasyon hatası:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Kullanıcı verileri senkronize edilirken bir hata oluştu.',
        error: error.message
      });
    }
  }
}

export default new SupabaseAuthController(); 