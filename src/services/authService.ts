import { auth, googleProvider, adminAuth } from '../config/firebase';
import { signInWithPopup, signInWithCredential, GoogleAuthProvider, UserCredential } from 'firebase/auth';

/**
 * Google ile giriş yapmak için kullanılan servis
 */
export const authService = {
  /**
   * Google ile popup kullanarak giriş yapar (istemci tarafında kullanılır)
   * @returns Kullanıcı kimlik bilgileri
   */
  signInWithGoogle: async (): Promise<UserCredential> => {
    console.log('[AuthService] Google popup ile giriş başlatılıyor');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      console.log('[AuthService] Google popup ile giriş başarılı:', {
        uid: result.user.uid,
        email: result.user.email
      });
      return result;
    } catch (error: any) {
      console.error('[AuthService] Google popup ile giriş başarısız:', error);
      console.error('[AuthService] Hata detayları:', {
        code: error.code,
        message: error.message,
        name: error.name
      });
      throw error;
    }
  },

  /**
   * Google token'ı ile giriş yapar
   * @param idToken Google ID token
   * @returns Kullanıcı kimlik bilgileri
   */
  signInWithGoogleToken: async (idToken: string): Promise<UserCredential> => {
    console.log('[AuthService] Google token ile giriş başlatılıyor');
    try {
      const credential = GoogleAuthProvider.credential(idToken);
      console.log('[AuthService] Google kredensiyali oluşturuldu');
      
      const result = await signInWithCredential(auth, credential);
      console.log('[AuthService] Google token ile giriş başarılı:', {
        uid: result.user.uid,
        email: result.user.email
      });
      return result;
    } catch (error: any) {
      console.error('[AuthService] Google token ile giriş başarısız:', error);
      console.error('[AuthService] Hata detayları:', {
        code: error.code,
        message: error.message,
        name: error.name
      });
      throw error;
    }
  },

  /**
   * Firebase ID token'ını doğrular (sunucu tarafında kullanılır)
   * @param idToken Firebase ID token
   * @returns Doğrulanmış kullanıcı bilgileri
   */
  verifyIdToken: async (idToken: string) => {
    console.log('[AuthService] Firebase token doğrulama başlatılıyor');
    try {
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      console.log('[AuthService] Firebase token doğrulandı:', { 
        uid: decodedToken.uid,
        email: decodedToken.email
      });
      return decodedToken;
    } catch (error: any) {
      console.error('[AuthService] Firebase token doğrulama hatası:', error);
      console.error('[AuthService] Hata detayları:', {
        code: error.code,
        message: error.message,
        name: error.name
      });
      throw error;
    }
  },

  /**
   * Kullanıcı oturumunu kapatır
   */
  signOut: async () => {
    console.log('[AuthService] Oturum kapatma işlemi başlatılıyor');
    try {
      await auth.signOut();
      console.log('[AuthService] Oturum başarıyla kapatıldı');
    } catch (error: any) {
      console.error('[AuthService] Oturum kapatılırken hata oluştu:', error);
      console.error('[AuthService] Hata detayları:', {
        code: error.code,
        message: error.message,
        name: error.name
      });
      throw error;
    }
  }
}; 