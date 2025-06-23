import supabase from '../config/supabaseClient';
import dotenv from 'dotenv';
import axios from 'axios';
import logger from '../config/logger';

dotenv.config();

class LinkedInAuthService {
  // LinkedIn ile oturum açma URL'sini oluştur
  getLinkedInAuthURL(platform?: string): string {
    let redirectURI;
    
    // Platform'a göre redirect URI'yi belirle
    if (platform === 'mobile') {
      redirectURI = 'com.aikumobile://auth/linkedin-callback';
    } else {
      redirectURI = process.env.LINKEDIN_REDIRECT_URI || 'https://aikuaiplatform.com/auth/social-callback';
    }
    
    const linkedInClientId = process.env.LINKEDIN_CLIENT_ID;
    
    if (!linkedInClientId) {
      throw new Error('LinkedIn Client ID is not defined in environment variables');
    }

    const scopes = ['openid', 'profile', 'email'].join(' ');
    const state = Math.random().toString(36).substring(2, 15); // Rastgele state değeri
    
    // LinkedIn OAuth 2.0 URL'si
    return `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${linkedInClientId}&redirect_uri=${encodeURIComponent(redirectURI)}&state=${state}&scope=${encodeURIComponent(scopes)}`;
  }

  // LinkedIn'den gelen auth code ile token alma
  async getTokenFromCode(code: string): Promise<any> {
    try {
      const redirectURI = process.env.LINKEDIN_REDIRECT_URI || 'https://aikuaiplatform.com/auth/social-callback';
      const linkedInClientId = process.env.LINKEDIN_CLIENT_ID;
      const linkedInClientSecret = process.env.LINKEDIN_CLIENT_SECRET;
      
      if (!linkedInClientId || !linkedInClientSecret) {
        throw new Error('LinkedIn Client ID or Client Secret is not defined in environment variables');
      }

      // LinkedIn token URL'sine istek gönder
      const response = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', null, {
        params: {
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectURI,
          client_id: linkedInClientId,
          client_secret: linkedInClientSecret
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data;
    } catch (error) {
      console.error('LinkedIn token alınamadı:', error);
      logger.error(`LinkedIn token alınamadı linkedinAuth.Service: ${error}`);
      throw error;
    }
  }

  // LinkedIn token ile kullanıcı bilgilerini alma
  async getUserInfo(accessToken: string): Promise<any> {
    try {
      // Kullanıcı profil bilgilerini al
      const profileResponse = await axios.get('https://api.linkedin.com/v2/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'cache-control': 'no-cache',
          'X-Restli-Protocol-Version': '2.0.0'
        }
      });

      // Kullanıcı email bilgisini al
      const emailResponse = await axios.get('https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'cache-control': 'no-cache',
          'X-Restli-Protocol-Version': '2.0.0'
        }
      });

      const profileData = profileResponse.data;
      const emailData = emailResponse.data;
      const email = emailData.elements?.[0]?.['handle~']?.emailAddress || '';

      return {
        id: profileData.id,
        firstName: profileData.localizedFirstName,
        lastName: profileData.localizedLastName,
        email
      };
    } catch (error) {
      console.error('LinkedIn kullanıcı bilgileri alınamadı:', error);
      logger.error(`LinkedIn kullanıcı bilgileri alınamadı linkedinAuth.Service: ${error}`);
      throw error;
    }
  }

  // Kullanıcıyı Supabase'e kaydet veya güncelle
  async signInWithLinkedIn(userInfo: any): Promise<any> {
    try {
      const { id, email, firstName, lastName } = userInfo;
      
      if (!email) {
        throw new Error('Email alınamadı. Kullanıcı kayıt edilemez.');
      }

      // Önce email ile Supabase'de kullanıcı kontrolü yap
      const { data: existingUser, error: searchError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (searchError) {
        console.error('Kullanıcı arama hatası:', searchError);
        throw searchError;
      }

      if (existingUser) {
        // Kullanıcı varsa, LinkedIn bilgilerini güncelle
        const { data: updatedUser, error: updateError } = await supabase
          .from('users')
          .update({
            linkedin_id: id,
            updated_at: new Date().toISOString()
          })
          .eq('email', email)
          .select()
          .single();

        if (updateError) {
          console.error('Kullanıcı güncelleme hatası:', updateError);
          logger.error(`Kullanıcı güncelleme hatası linkedinAuth.Service: ${updateError}`);
          throw updateError;
        }

        return updatedUser;
      } else {
        // Kullanıcı yoksa, yeni kullanıcı oluştur
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert([
            {
              email,
              first_name: firstName,
              last_name: lastName,
              linkedin_id: id,
              auth_provider: 'linkedin',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ])
          .select()
          .single();

        if (insertError) {
          console.error('Kullanıcı oluşturma hatası:', insertError);
          logger.error(`Kullanıcı oluşturma hatası linkedinAuth.Service: ${insertError}`);
          throw insertError;
        }

        return newUser;
      }
    } catch (error) {
      console.error('LinkedIn kullanıcısı Supabase\'e kaydedilemedi:', error);
      logger.error(`LinkedIn kullanıcısı Supabase\'e kaydedilemedi linkedinAuth.Service: ${error}`);
      throw error;
    }
  }
}

export default new LinkedInAuthService(); 