import { User } from "../models/User";
import { supabase } from "../config/supabase";
import jwt, { SignOptions } from "jsonwebtoken";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

export class GoogleService {
  async handleAuth(data: any) {
    try {
      console.log("GoogleService.handleAuth başladı:", data);

      // Google'dan kullanıcı bilgilerini al
      const googleUserInfo = await this.getGoogleUserInfo(
        data.user.access_token
      );
      console.log("Google kullanıcı bilgileri alındı:", googleUserInfo);

      // MongoDB'de kullanıcıyı ara veya oluştur
      let user = await User.findOne({ email: googleUserInfo.email });

      const userData = {
        firstName:
          googleUserInfo.given_name || googleUserInfo.email?.split("@")[0],
        lastName: googleUserInfo.family_name || "",
        email: googleUserInfo.email,
        emailVerified: true,
        authProvider: "google",
        lastLogin: new Date(),
        googleId: googleUserInfo.sub,
      };

      if (!user) {
        console.log("Yeni kullanıcı oluşturuluyor:", userData);
        // Yeni kullanıcı için profil fotoğrafını ekle
        user = new User({
          ...userData,
          profilePhoto: googleUserInfo.picture,
        });
        await user.save();
      } else {
        const currentProfilePhoto = user.profilePhoto;
        console.log("Mevcut kullanıcı güncelleniyor:", {
          userId: user._id,
          mevcutProfilFoto: currentProfilePhoto,
        });

        // Bilgileri güncelle
        // Eğer mevcut ad ve soyad bilgileri varsa, onları koru
        user.firstName = user.firstName || userData.firstName;
        user.lastName = user.lastName || userData.lastName;
        user.emailVerified = userData.emailVerified;
        user.authProvider = userData.authProvider;
        user.lastLogin = userData.lastLogin;
        user.googleId = userData.googleId;

        // Eğer mevcut profil fotoğrafı yoksa, Google'dan gelen fotoğrafı kullan
        if (!currentProfilePhoto && googleUserInfo.picture) {
          console.log("Profil fotoğrafı ekleniyor çünkü mevcut fotoğraf yok");
          user.profilePhoto = googleUserInfo.picture;
        } else {
          console.log(
            "Mevcut profil fotoğrafı korunuyor:",
            currentProfilePhoto
          );
        }

        await user.save();
      }
      const jwtOptions: SignOptions = {
        expiresIn: process.env.JWT_EXPIRE
          ? parseInt(process.env.JWT_EXPIRE)
          : "24h",
      };

      const token = jwt.sign(
        {
          id: user._id.toString(),
          googleId: googleUserInfo.sub,
        },
        process.env.JWT_SECRET || "your-super-secret-jwt-key",
        jwtOptions
      );

      console.log("JWT token oluşturuldu", token);

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
      throw new Error("Google ile giriş işlemi başarısız: " + error.message);
    }
  }

  private async getGoogleUserInfo(accessToken: string) {
    try {
      const response = await axios.get(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      return response.data;
    } catch (error: any) {
      console.error(
        "Google userinfo error:",
        error.response?.data || error.message
      );
      throw new Error("Google kullanıcı bilgileri alınamadı");
    }
  }
}
