import { User } from "../models/User";
import { supabase } from "../config/supabase";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export class GoogleService {
  async handleAuth(authData: any) {
    try {
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

      const token = jwt.sign(
        { 
          id: user._id.toString(), 
          supabaseId: authData.user.id 
        },
        process.env.JWT_SECRET || "your-super-secret-jwt-key",
        { 
          expiresIn: parseInt(process.env.JWT_EXPIRE || "86400") // 24 saat
        }
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