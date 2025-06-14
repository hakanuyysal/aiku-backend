import { User } from "../models/User";
import { supabase } from "../config/supabase";
import jwt, { SignOptions } from "jsonwebtoken";
import dotenv from "dotenv";
import axios from "axios";
import logger from "../config/logger";
import { verifyGoogleToken } from "../config/googleAuth";

dotenv.config();

export class GoogleService {
  async handleAuth(data: any) {
    try {
      console.log("GoogleService.handleAuth başladı:", data);
      logger.info("GoogleService.handleAuth başladı", { data });

      let googleUserInfo;

      // idToken varsa doğrudan doğrula
      if (data.user.id_token) {
        googleUserInfo = await verifyGoogleToken(data.user.id_token);
      } 
      // accessToken varsa Google API'den bilgileri al
      else if (data.user.access_token) {
        googleUserInfo = await this.getGoogleUserInfo(data.user.access_token);
      } else {
        throw new Error("Geçerli bir token bulunamadı");
      }

      console.log("Google kullanıcı bilgileri alındı:", googleUserInfo);
      logger.info("Google kullanıcı bilgileri alındı", { googleUserInfo });

      // MongoDB'de kullanıcıyı ara veya oluştur
      let user = await User.findOne({ email: googleUserInfo.email });

      // İsim ve soyisim bilgilerini ayır
      const nameParts = (googleUserInfo.name || '').split(' ');
      const firstName = nameParts[0] || googleUserInfo.email?.split('@')[0] || '';
      const lastName = nameParts.slice(1).join(' ') || firstName; // Eğer soyisim yoksa ismi kullan

      const userData = {
        firstName,
        lastName,
        email: googleUserInfo.email,
        emailVerified: true,
        authProvider: "google",
        lastLogin: new Date(),
        googleId: googleUserInfo.uid || googleUserInfo.sub,
        profilePhoto: googleUserInfo.picture
      };

      if (!user) {
        user = await User.create(userData);
        console.log("Yeni kullanıcı oluşturuldu:", user._id);
        logger.info("Yeni kullanıcı oluşturuldu", { userId: user._id });
      } else {
        const updatedUser = await User.findByIdAndUpdate(
          user._id,
          { $set: userData },
          { new: true }
        );
        if (!updatedUser) {
          throw new Error("Kullanıcı güncellenemedi");
        }
        user = updatedUser;
        console.log("Kullanıcı güncellendi:", user._id);
        logger.info("Kullanıcı güncellendi", { userId: user._id });
      }

      const jwtOptions: SignOptions = {
        expiresIn: "90d",
      };

      const token = jwt.sign(
        {
          id: user._id.toString(),
          googleId: googleUserInfo.uid || googleUserInfo.sub,
        },
        process.env.JWT_SECRET || "your-super-secret-jwt-key",
        jwtOptions
      );

      console.log("JWT token oluşturuldu", token);
      logger.info("JWT token oluşturuldu", { userId: user._id.toString() });

      return {
        user: {
          id: user._id.toString(),
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          profilePhoto: user.profilePhoto,
          emailVerified: user.emailVerified,
          googleId: user.googleId,
        },
        token,
      };
    } catch (error: any) {
      console.error("Google auth error:", error);
      logger.error("Google auth error", { error: error.message, stack: error.stack });
      throw new Error("Google ile giriş işlemi başarısız: " + error.message);
    }
  }

  private async getGoogleUserInfo(accessToken: string) {
    try {
      const response = await axios.get(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      return response.data;
    } catch (error: any) {
      console.error("Google user info error:", error);
      logger.error("Google user info error", { error: error.message });
      throw new Error("Google kullanıcı bilgileri alınamadı: " + error.message);
    }
  }
}
