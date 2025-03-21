import { Request, Response } from "express";
import linkedinAuthService from "../services/linkedinAuth.service";
import jwt, { Secret, SignOptions } from "jsonwebtoken";
import dotenv from "dotenv";
import { User } from "../models/User";

dotenv.config();

class LinkedInAuthController {
  /**
   * LinkedIn giriş URL'sini döndürür
   */
  async getLinkedInAuthURL(req: Request, res: Response): Promise<void> {
    try {
      const authURL = linkedinAuthService.getLinkedInAuthURL();
      res.status(200).json({ url: authURL });
    } catch (error: any) {
      console.error("LinkedIn auth URL oluşturma hatası:", error);
      res.status(500).json({
        error:
          error.message || "LinkedIn auth URL oluşturulurken bir hata oluştu",
      });
    }
  }

  /**
   * LinkedIn kimlik doğrulama geri dönüş işlemini gerçekleştirir
   */
  async handleLinkedInCallback(req: Request, res: Response): Promise<void> {
    try {
      const { code } = req.body;

      if (!code) {
        res.status(400).json({ error: "Authorization code gereklidir" });
        return;
      }

      // LinkedIn code'dan token al
      const tokenData = await linkedinAuthService.getTokenFromCode(code);

      // Token ile kullanıcı bilgilerini al
      const userInfo = await linkedinAuthService.getUserInfo(
        tokenData.access_token
      );

      // Kullanıcıyı Supabase'e kaydet/güncelle
      const userData = await linkedinAuthService.signInWithLinkedIn(userInfo);

      // MongoDB'de kullanıcıyı ara veya oluştur
      let mongoUser = await User.findOne({ email: userInfo.email });

      if (!mongoUser) {
        // Kullanıcı yoksa MongoDB'de oluştur
        console.log("MongoDB'de yeni kullanıcı oluşturuluyor:", userInfo.email);
        mongoUser = new User({
          firstName: userInfo.firstName,
          lastName: userInfo.lastName,
          email: userInfo.email,
          supabaseId: userData.id, // Supabase ID'sini kaydet
          linkedinId: userInfo.id, // LinkedIn ID'sini kaydet
          authProvider: "linkedin",
          emailVerified: true, // LinkedIn kullanıcıları genellikle doğrulanmıştır
          lastLogin: new Date(),
          profilePhoto: userInfo.profilePicture || "",
          linkedin: `https://www.linkedin.com/in/${userInfo.id}/`, // LinkedIn URL'si
        });

        await mongoUser.save();
        console.log("MongoDB'de yeni kullanıcı oluşturuldu:", mongoUser._id);
      } else {
        // Kullanıcı varsa bilgilerini güncelle
        console.log(
          "MongoDB'de mevcut kullanıcı güncelleniyor:",
          mongoUser._id
        );
        mongoUser.supabaseId = userData.id;
        mongoUser.linkedinId = userInfo.id;
        mongoUser.lastLogin = new Date();

        // Eksik bilgileri varsa güncelle
        if (!mongoUser.firstName) mongoUser.firstName = userInfo.firstName;
        if (!mongoUser.lastName) mongoUser.lastName = userInfo.lastName;
        if (!mongoUser.linkedin)
          mongoUser.linkedin = `https://www.linkedin.com/in/${userInfo.id}/`;
        if (userInfo.profilePicture && !mongoUser.profilePhoto)
          mongoUser.profilePhoto = userInfo.profilePicture;

        await mongoUser.save();
        console.log("MongoDB'de kullanıcı güncellendi");
      }

      // JWT token oluştur - MongoDB kullanıcı ID'sini kullan
      const jwtSecret: Secret =
        process.env.JWT_SECRET || "your-super-secret-jwt-key";
      const jwtExpire: string = process.env.JWT_EXPIRE || "24h";
      const jwtOptions: SignOptions = { expiresIn: jwtExpire };

      const token = jwt.sign(
        { id: mongoUser._id.toString() }, // MongoDB ID kullan
        jwtSecret,
        jwtOptions
      );

      // Frontend'e kullanıcı bilgilerini ve token'ı gönder
      res.status(200).json({
        token,
        user: {
          id: mongoUser._id,
          email: mongoUser.email,
          firstName: mongoUser.firstName,
          lastName: mongoUser.lastName,
          provider: "linkedin",
          profilePhoto: mongoUser.profilePhoto,
        },
      });
    } catch (error: any) {
      console.error("LinkedIn callback işleme hatası:", error);
      res.status(500).json({
        error: error.message || "LinkedIn callback işlenirken bir hata oluştu",
      });
    }
  }
}

export default new LinkedInAuthController();
