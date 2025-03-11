import { Request, Response } from 'express';
import { LinkedInService } from '../services/linkedInService';

export class LinkedInController {
  private linkedInService: LinkedInService;

  constructor() {
    this.linkedInService = new LinkedInService();
  }

  // LinkedIn giriş URL'ini döndür
  async getAuthUrl(req: Request, res: Response) {
    try {
      const authUrl = this.linkedInService.getAuthUrl();
      console.log('Generated auth URL:', authUrl);
      res.json({ authUrl });
    } catch (error: any) {
      console.error('Auth URL error:', error);
      res.status(500).json({ error: 'LinkedIn auth URL oluşturulamadı', details: error.message });
    }
  }

  // LinkedIn callback işlemi
  async handleCallback(req: Request, res: Response) {
    try {
      console.log('Received callback with query:', req.query);
      const { code, state } = req.query;
      
      if (!code || typeof code !== 'string') {
        throw new Error('Geçersiz auth code');
      }

      console.log('Getting access token for code:', code);
      const accessToken = await this.linkedInService.getAccessToken(code);
      
      console.log('Access token received, getting profile data');
      const profileData = await this.linkedInService.getProfile(accessToken);

      console.log('Profile data received:', profileData);
      
      // LinkedIn ile giriş/kayıt işlemini gerçekleştir
      const authResult = await this.linkedInService.handleAuth(profileData);
      
      // Geliştirme aşamasında JSON yanıt döndür
      res.json({
        success: true,
        data: authResult,
        redirectUrl: `${process.env.CLIENT_URL}/auth/callback?token=${authResult.token}`
      });
    } catch (error: any) {
      console.error('Callback error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }
} 