import { Request, Response } from "express";
import linkedinAuthService from "../services/linkedinAuth.service";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

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
      res
        .status(500)
        .json({
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

      // JWT token oluştur
      const jwtSecret = process.env.JWT_SECRET || "your-super-secret-jwt-key";
      const jwtExpire = process.env.JWT_EXPIRE || "24h";

      const token = jwt.sign(
        { id: userData.id, email: userData.email },
        jwtSecret as jwt.Secret,
        { expiresIn: jwtExpire }
      );

      res.status(200).json({
        token,
        user: {
          id: userData.id,
          email: userData.email,
          firstName: userData.first_name,
          lastName: userData.last_name,
          provider: "linkedin",
        },
      });
    } catch (error: any) {
      console.error("LinkedIn callback işleme hatası:", error);
      res
        .status(500)
        .json({
          error:
            error.message || "LinkedIn callback işlenirken bir hata oluştu",
        });
    }
  }
}

export default new LinkedInAuthController();
