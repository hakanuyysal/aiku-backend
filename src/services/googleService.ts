import { User } from "../models/User";
import supabase from "../config/supabaseClient";
import jwt, { SignOptions, Secret } from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export class GoogleService {
  async handleAuth(googleData: any) {
    try {
      // Supabase ile Google oturumu aç
      const { data: authData, error: authError } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: googleData.access_token,
        nonce: googleData.nonce
      });

      if (authError) throw new Error(authError.message);

      if (!authData.user?.email) {
        throw new Error("Google hesabından email bilgisi alınamadı");
      }

      // MongoDB'de kullanıcıyı ara veya oluştur
      let user = await User.findOne({ email: authData.user.email });

      const userData = {
        firstName: authData.user.user_metadata?.given_name || authData.user.email?.split('@')[0],
        lastName: authData.user.user_metadata?.family_name || '',
        email: authData.user.email,
        profilePhoto: authData.user.user_metadata?.picture,
        emailVerified: authData.user.email_confirmed_at ? true : false,
        authProvider: "google",
        lastLogin: new Date(),
        supabaseId: authData.user.id
      };

      if (!user) {
        user = new User(userData);
        await user.save();
      } else {
        user.set(userData);
        await user.save();
      }

      const jwtSecret = process.env.JWT_SECRET || "your-super-secret-jwt-key";
      const jwtOptions = { expiresIn: process.env.JWT_EXPIRE || "24h" };
      
      const token = jwt.sign(
        { 
          id: user._id.toString(), 
          supabaseId: authData.user.id 
        },
        jwtSecret,
        jwtOptions
      );

      return {
        user: {
          id: user._id.toString(),
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          profilePhoto: user.profilePhoto,
          emailVerified: user.emailVerified,
          supabaseId: user.supabaseId
        },
        token,
        supabaseSession: authData.session
      };
    } catch (error: any) {
      console.error("Google auth error:", error);
      throw new Error("Google ile giriş işlemi başarısız: " + error.message);
    }
  }
} 