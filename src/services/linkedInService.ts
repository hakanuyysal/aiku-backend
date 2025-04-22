// @ts-nocheck - Typescript hatalarını görmezden gel
import axios from "axios";
import { GeminiService } from "./geminiService";
import dotenv from "dotenv";
import jwt, { SignOptions, Secret } from "jsonwebtoken";
import { User } from "../models/User";
import { supabase } from "../config/supabase";
import logger from "../config/logger";

dotenv.config();

export class LinkedInService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private geminiService: GeminiService;

  constructor() {
    if (
      !process.env.LINKEDIN_CLIENT_ID ||
      !process.env.LINKEDIN_CLIENT_SECRET ||
      !process.env.LINKEDIN_REDIRECT_URI
    ) {
      throw new Error(
        "LinkedIn API bilgileri eksik. Lütfen .env dosyasını kontrol edin."
      );
    }

    this.clientId = process.env.LINKEDIN_CLIENT_ID;
    this.clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
    this.redirectUri = process.env.LINKEDIN_REDIRECT_URI;
    this.geminiService = new GeminiService();

    console.log("LinkedIn Service initialized with:", {
      clientId: this.clientId,
      redirectUri: this.redirectUri,
    });
  }

  getAuthUrl(): string {
    const scopes = ["openid", "profile", "email"];

    const scope = scopes.join(",");
    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${this.clientId}&redirect_uri=${this.redirectUri}&scope=${scope}&state=random123`;

    console.log("Generated LinkedIn Auth URL:", authUrl);
    return authUrl;
  }

  async getAccessToken(code: string): Promise<string> {
    try {
      console.log("Getting access token with code:", code);
      console.log("Using client ID:", this.clientId);
      console.log("Using redirect URI:", this.redirectUri);

      const response = await axios.post(
        "https://www.linkedin.com/oauth/v2/accessToken",
        null,
        {
          params: {
            grant_type: "authorization_code",
            code,
            client_id: this.clientId,
            client_secret: this.clientSecret,
            redirect_uri: this.redirectUri,
          },
        }
      );

      console.log("Access token response:", response.data);
      return response.data.access_token;
    } catch (error: any) {
      console.error(
        "LinkedIn access token error:",
        error.response?.data || error.message
      );
      logger.error(
        `LinkedIn access token alınamadı: ${
          error.response?.data?.error_description || error.message
        }`
      );
      throw new Error(
        `LinkedIn access token alınamadı: ${
          error.response?.data?.error_description || error.message
        }`
      );
    }
  }

  async getProfile(accessToken: string) {
    try {
      console.log("Getting user profile with access token");

      const userInfoResponse = await axios.get(
        "https://api.linkedin.com/v2/userinfo",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      console.log("User info response:", userInfoResponse.data);

      return this.formatLinkedInData(userInfoResponse.data);
    } catch (error: any) {
      console.error(
        "LinkedIn profile error:",
        error.response?.data || error.message
      );
      logger.error(
        `LinkedIn profil bilgileri alınamadı: ${
          error.response?.data?.error_description || error.message
        }`
      );
      throw new Error(
        `LinkedIn profil bilgileri alınamadı: ${
          error.response?.data?.error_description || error.message
        }`
      );
    }
  }

  private formatLinkedInData(userInfo: any) {
    return {
      name: userInfo.name || `${userInfo.given_name} ${userInfo.family_name}`,
      email: userInfo.email,
      picture: userInfo.picture,
      locale: userInfo.locale,
      emailVerified: true,
      linkedinUrl: `https://www.linkedin.com/in/${userInfo.sub}/`,
    };
  }

  async handleAuth(data: any) {
    try {
      console.log("LinkedInService.handleAuth başladı:", data);

      // Supabase'den kullanıcı bilgilerini al
      const user = data.user;
      
      if (!user || !user.email) {
        throw new Error("Kullanıcı bilgileri alınamadı");
      }
      
      console.log("LinkedIn kullanıcı bilgileri:", user);

      // Metadata'dan bilgileri çıkart
      const firstName = user.user_metadata?.given_name || user.user_metadata?.name?.split(' ')[0] || '';
      const lastName = user.user_metadata?.family_name || 
                      (user.user_metadata?.name?.split(' ').length > 1 ? 
                       user.user_metadata?.name?.split(' ').slice(1).join(' ') : '');
      const profilePhoto = user.user_metadata?.picture || user.user_metadata?.avatar_url || '';
      const linkedinId = user.user_metadata?.sub || user.user_metadata?.id || '';
      
      console.log("Ayıklanmış kullanıcı bilgileri:", {
        firstName, lastName, profilePhoto, linkedinId
      });

      // MongoDB'de kullanıcıyı ara veya oluştur
      let mongoUser = await User.findOne({ email: user.email });
      
      if (!mongoUser) {
        console.log("LinkedIn: Yeni kullanıcı oluşturuluyor:", user.email);
        
        // Yeni kullanıcı oluştur
        mongoUser = new User({
          firstName: firstName,
          lastName: lastName,
          email: user.email,
          profilePhoto: profilePhoto,
          supabaseId: user.id,
          linkedinId: linkedinId,
          emailVerified: true,
          authProvider: "linkedin_oidc",
          lastLogin: new Date(),
          linkedin: linkedinId ? `https://www.linkedin.com/in/${linkedinId}/` : undefined
        });
        
        await mongoUser.save();
        console.log("LinkedIn: Yeni kullanıcı kaydedildi, ID:", mongoUser._id);
      } else {
        console.log("LinkedIn: Mevcut kullanıcı güncelleniyor, ID:", mongoUser._id);
        
        // Kullanıcıyı güncelle
        mongoUser.lastLogin = new Date();
        mongoUser.supabaseId = user.id;
        
        // LinkedIn ID güncellemesi
        if (linkedinId && !mongoUser.linkedinId) {
          mongoUser.linkedinId = linkedinId;
        }
        
        // Diğer eksik bilgileri güncelle
        if (!mongoUser.firstName && firstName) {
          mongoUser.firstName = firstName;
        }
        if (!mongoUser.lastName && lastName) {
          mongoUser.lastName = lastName;
        }
        if (!mongoUser.profilePhoto && profilePhoto) {
          mongoUser.profilePhoto = profilePhoto;
        }
        if (!mongoUser.linkedin && linkedinId) {
          mongoUser.linkedin = `https://www.linkedin.com/in/${linkedinId}/`;
        }
        
        await mongoUser.save();
        console.log("LinkedIn: Kullanıcı güncellendi:", mongoUser.email);
      }

      // JWT token oluştur
      // @ts-expect-error - JWT sign işleminde expiresIn tipindeki uyumsuzluğu görmezden geliyoruz
      const token = jwt.sign(
        { 
          id: mongoUser._id.toString(),
          linkedinId: linkedinId
        },
        process.env.JWT_SECRET || "your-super-secret-jwt-key",
        { 
          expiresIn: process.env.JWT_EXPIRE || "24h"
        }
      );

      console.log("LinkedIn: JWT token oluşturuldu");

      return {
        user: {
          id: mongoUser._id.toString(),
          firstName: mongoUser.firstName,
          lastName: mongoUser.lastName,
          email: mongoUser.email,
          profilePhoto: mongoUser.profilePhoto,
          emailVerified: mongoUser.emailVerified,
          linkedinId: mongoUser.linkedinId,
          authProvider: "linkedin_oidc"
        },
        token
      };
    } catch (error: any) {
      console.error("LinkedIn auth error:", error);
      logger.error(
        `LinkedIn ile giriş işlemi başarısız: ${error.message}`
      );
      throw new Error("LinkedIn ile giriş işlemi başarısız: " + error.message);
    }
  }

  // LinkedIn profil bilgilerini gerekirse doğrudan alma
  private async getLinkedInUserInfo(accessToken: string) {
    try {
      const response = await axios.get('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      return response.data;
    } catch (error: any) {
      console.error("LinkedIn userinfo error:", error.response?.data || error.message);
      logger.error(
        `LinkedIn kullanıcı bilgileri alınamadı: ${error.response?.data?.error_description || error.message}`
      );
      throw new Error("LinkedIn kullanıcı bilgileri alınamadı");
    }
  }
}
