import { User } from "../models/User";
import { supabase } from "../config/supabase";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

export class GoogleService {
  async handleAuth(data: any) {
    try {
      console.log("GoogleService.handleAuth başladı:", data);

      // Google'dan kullanıcı bilgilerini al
      const googleUserInfo = await this.getGoogleUserInfo(data.user.access_token);
      console.log("Google kullanıcı bilgileri alındı:", googleUserInfo);

      // MongoDB'de kullanıcıyı ara veya oluştur
      let user = await User.findOne({ email: googleUserInfo.email });

      const userData = {
        firstName: googleUserInfo.given_name || googleUserInfo.email?.split('@')[0],
        lastName: googleUserInfo.family_name || '',
        email: googleUserInfo.email,
        emailVerified: googleUserInfo.email_verified,
        authProvider: "google",
        lastLogin: new Date(),
        googleId: googleUserInfo.sub
      };

      if (!user) {
        console.log("Yeni kullanıcı oluşturuluyor:", userData);
        // Yeni kullanıcı için profil fotoğrafını ekle
        user = new User({
          ...userData,
          profilePhoto: googleUserInfo.picture
        });
        await user.save();
      } else {
        console.log("Mevcut kullanıcı güncelleniyor:", { 
          userId: user._id,
          mevcutProfilFoto: user.profilePhoto
        });

        // Mevcut kullanıcıyı güncelle
        Object.assign(user, userData);
        
        // Sadece profil fotoğrafı yoksa ekle
        if (!user.profilePhoto && googleUserInfo.picture) {
          console.log("Profil fotoğrafı ekleniyor çünkü mevcut fotoğraf yok");
          user.profilePhoto = googleUserInfo.picture;
        }
        
        await user.save();
      }

      const token = jwt.sign(
        { 
          id: user._id.toString(),
          googleId: googleUserInfo.sub
        },
        process.env.JWT_SECRET || "your-super-secret-jwt-key",
        { 
          expiresIn: parseInt(process.env.JWT_EXPIRE || "86400") // 24 saat
        }
      );

      console.log("JWT token oluşturuldu");

      return {
        user: {
          id: user._id.toString(),
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          profilePhoto: user.profilePhoto,
          emailVerified: user.emailVerified,
          googleId: user.googleId
        },
        token
      };
    } catch (error: any) {
      console.error("Google auth error:", error);
      throw new Error("Google ile giriş işlemi başarısız: " + error.message);
    }
  }

  private async getGoogleUserInfo(accessToken: string) {
    try {
      const response = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      return response.data;
    } catch (error: any) {
      console.error("Google userinfo error:", error.response?.data || error.message);
      throw new Error("Google kullanıcı bilgileri alınamadı");
    }
  }
} 