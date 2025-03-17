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
    try {
      return await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Google ile giriş yapılırken hata oluştu:', error);
      throw error;
    }
  },

  /**
   * Google token'ı ile giriş yapar
   * @param idToken Google ID token
   * @returns Kullanıcı kimlik bilgileri
   */
  signInWithGoogleToken: async (idToken: string): Promise<UserCredential> => {
    try {
      const credential = GoogleAuthProvider.credential(idToken);
      return await signInWithCredential(auth, credential);
    } catch (error) {
      console.error('Google token ile giriş yapılırken hata oluştu:', error);
      throw error;
    }
  },

  /**
   * Firebase ID token'ını doğrular (sunucu tarafında kullanılır)
   * @param idToken Firebase ID token
   * @returns Doğrulanmış kullanıcı bilgileri
   */
  verifyIdToken: async (idToken: string) => {
    try {
      return await adminAuth.verifyIdToken(idToken);
    } catch (error) {
      console.error('Token doğrulanırken hata oluştu:', error);
      throw error;
    }
  },

  /**
   * Kullanıcı oturumunu kapatır
   */
  signOut: async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error('Oturum kapatılırken hata oluştu:', error);
      throw error;
    }
  }
}; 