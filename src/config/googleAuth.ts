import { OAuth2Client } from 'google-auth-library';
import dotenv from 'dotenv';

// Çevre değişkenlerini yükle
dotenv.config();

// Google OAuth2 istemcisi oluştur
const googleClient = new OAuth2Client({
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  redirectUri: `${process.env.API_URL}/api/auth/google/callback`
});

/**
 * Google ID token'ı doğrular
 * @param idToken Google tarafından verilen ID token
 * @returns Doğrulanmış token bilgisi
 */
export const verifyGoogleToken = async (idToken: string) => {
  try {
    console.log('[GoogleAuth] ID token doğrulanıyor');
    
    // NOT: Eğer "Token used too early" hatası alıyorsanız, sistem saatinizi kontrol ediniz.
    // Bu hata genellikle sunucu saatinin Google sunucularıyla senkronize olmamasından kaynaklanır.
    // Saati düzeltmek için:
    // - macOS: sudo ntpdate -u time.apple.com
    // - Linux: sudo ntpdate pool.ntp.org
    // - Windows: "Tarih ve Saat" ayarlarında "Internet Saati" sekmesinden güncelleme yapılabilir.
    
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID!
    });
    
    const payload = ticket.getPayload();
    if (!payload) {
      throw new Error('Token payload bulunamadı');
    }
    
    console.log('[GoogleAuth] Token doğrulandı:', { 
      sub: payload.sub,
      email: payload.email
    });
    
    return {
      uid: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      email_verified: payload.email_verified
    };
  } catch (error) {
    console.error('[GoogleAuth] Token doğrulama hatası:', error);
    throw error;
  }
};

export { googleClient }; 