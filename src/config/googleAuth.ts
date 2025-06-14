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

// Desteklenen client ID'ler
const SUPPORTED_CLIENT_IDS = [
  process.env.GOOGLE_CLIENT_ID!, // Web client ID
  '974504980015-2e15l52tr86h8o42v8puf36lrtaamjqc.apps.googleusercontent.com', // iOS client ID
  '974504980015-p5e88nccp7v1i40o41t1tkl5rudrqdvf.apps.googleusercontent.com'  // Android client ID
];

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
      audience: SUPPORTED_CLIENT_IDS
    });
    
    const payload = ticket.getPayload();
    if (!payload) {
      throw new Error('Token payload bulunamadı');
    }
    
    console.log('[GoogleAuth] Token doğrulandı:', { 
      sub: payload.sub,
      email: payload.email,
      aud: payload.aud // Hangi client ID ile giriş yapıldığını logla
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