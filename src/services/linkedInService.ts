import axios from 'axios';
import { GeminiService } from './geminiService';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { User } from '../models/User'; // User modelini import et

// Env değişkenlerini yükle
dotenv.config();

export class LinkedInService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private geminiService: GeminiService;

  constructor() {
    if (!process.env.LINKEDIN_CLIENT_ID || !process.env.LINKEDIN_CLIENT_SECRET || !process.env.LINKEDIN_REDIRECT_URI) {
      throw new Error('LinkedIn API bilgileri eksik. Lütfen .env dosyasını kontrol edin.');
    }

    this.clientId = process.env.LINKEDIN_CLIENT_ID;
    this.clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
    this.redirectUri = process.env.LINKEDIN_REDIRECT_URI;
    this.geminiService = new GeminiService();

    console.log('LinkedIn Service initialized with:', {
      clientId: this.clientId,
      redirectUri: this.redirectUri
    });
  }

  // LinkedIn OAuth URL oluşturma - Sadece OpenID scope'ları
  getAuthUrl(): string {
    const scopes = [
      'openid',
      'profile',
      'email'
    ];
    
    // Scope'ları virgülle ayır
    const scope = scopes.join(',');
    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${this.clientId}&redirect_uri=${this.redirectUri}&scope=${scope}&state=random123`;
    
    console.log('Generated LinkedIn Auth URL:', authUrl);
    return authUrl;
  }

  // Access token alma
  async getAccessToken(code: string): Promise<string> {
    try {
      console.log('Getting access token with code:', code);
      console.log('Using client ID:', this.clientId);
      console.log('Using redirect URI:', this.redirectUri);

      const response = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', null, {
        params: {
          grant_type: 'authorization_code',
          code,
          client_id: this.clientId,
          client_secret: this.clientSecret,
          redirect_uri: this.redirectUri
        }
      });

      console.log('Access token response:', response.data);
      return response.data.access_token;
    } catch (error: any) {
      console.error('LinkedIn access token error:', error.response?.data || error.message);
      throw new Error(`LinkedIn access token alınamadı: ${error.response?.data?.error_description || error.message}`);
    }
  }

  // Kullanıcı profilini çekme - Sadece OpenID bilgileri
  async getProfile(accessToken: string) {
    try {
      console.log('Getting user profile with access token');

      // OpenID ile kullanıcı bilgilerini al
      const userInfoResponse = await axios.get('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      console.log('User info response:', userInfoResponse.data);

      // OpenID verilerini formatlama
      return this.formatLinkedInData(userInfoResponse.data);
    } catch (error: any) {
      console.error('LinkedIn profile error:', error.response?.data || error.message);
      throw new Error(`LinkedIn profil bilgileri alınamadı: ${error.response?.data?.error_description || error.message}`);
    }
  }

  private formatLinkedInData(userInfo: any) {
    return {
      name: userInfo.name || `${userInfo.given_name} ${userInfo.family_name}`,
      email: userInfo.email,
      picture: userInfo.picture,
      locale: userInfo.locale,
      emailVerified: userInfo.email_verified
    };
  }

  // LinkedIn ile giriş/kayıt işlemi
  async handleAuth(linkedInData: any) {
    try {
      // Email ile kullanıcı ara
      let user = await User.findOne({ email: linkedInData.email });

      if (!user) {
        // Kullanıcı yoksa yeni kullanıcı oluştur
        user = new User({
          name: linkedInData.name,
          email: linkedInData.email,
          profilePicture: linkedInData.picture,
          locale: linkedInData.locale,
          emailVerified: linkedInData.emailVerified,
          authProvider: 'linkedin'
        });

        await user.save();
      } else {
        // Kullanıcı varsa bilgilerini güncelle
        user.set({
          name: linkedInData.name,
          profilePicture: linkedInData.picture,
          locale: linkedInData.locale,
          emailVerified: linkedInData.emailVerified,
          lastLogin: new Date()
        });

        await user.save();
      }

      // JWT token oluştur
      const token = jwt.sign(
        { userId: user._id.toString() },
        process.env.JWT_SECRET || 'your-super-secret-jwt-key',
        { expiresIn: process.env.JWT_EXPIRE || '24h' }
      );

      return {
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          profilePicture: user.profilePicture,
          locale: user.locale,
          emailVerified: user.emailVerified
        },
        token
      };
    } catch (error: any) {
      console.error('LinkedIn auth error:', error);
      throw new Error('LinkedIn ile giriş işlemi başarısız: ' + error.message);
    }
  }
} 