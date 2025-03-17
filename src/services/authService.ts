import { verifyGoogleToken } from '../config/googleAuth';

/**
 * Kimlik doğrulama işlemleri için kullanılan servis
 */
export const authService = {
  /**
   * Google token'ını doğrular
   * @param idToken Google ID token
   * @returns Doğrulanmış kullanıcı bilgileri
   */
  verifyIdToken: async (idToken: string) => {
    console.log('[AuthService] Google token doğrulama başlatılıyor');
    try {
      const decodedToken = await verifyGoogleToken(idToken);
      console.log('[AuthService] Google token doğrulandı:', { 
        uid: decodedToken.uid,
        email: decodedToken.email
      });
      return decodedToken;
    } catch (error: any) {
      console.error('[AuthService] Google token doğrulama hatası:', error);
      console.error('[AuthService] Hata detayları:', {
        code: error.code,
        message: error.message,
        name: error.name
      });
      throw error;
    }
  }
}; 