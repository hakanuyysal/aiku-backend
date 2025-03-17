import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import * as admin from "firebase-admin";

// Firebase web yapılandırması
const firebaseConfig = {
  apiKey: "AIzaSyBJkQMiW4Xa2Vtoego90HKmr0mCfT-MoCc",
  authDomain: "aiku-ai-platform.firebaseapp.com",
  projectId: "aiku-ai-platform",
  storageBucket: "aiku-ai-platform.firebasestorage.app",
  messagingSenderId: "823402099731",
  appId: "1:823402099731:web:db35366b99b70ec41b7be6",
  measurementId: "G-GDTB3V20LL"
};

// Firebase web uygulamasını başlat
const firebaseApp = initializeApp(firebaseConfig);

// Auth ve Google provider'ı oluştur
const auth = getAuth(firebaseApp);
const googleProvider = new GoogleAuthProvider();

// Admin SDK yapılandırması (sunucu tarafı)
// Not: Bu genellikle bir servis hesabı anahtarı gerektirir
// Eğer servis hesabı anahtarınız varsa, bu kısmı kullanabilirsiniz
let adminApp;
try {
  // Eğer zaten başlatılmışsa hata verir, bu yüzden try-catch içinde
  adminApp = admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    // Veya servis hesabı anahtarı ile:
    // credential: admin.credential.cert(require('path/to/serviceAccountKey.json')),
    databaseURL: `https://${firebaseConfig.projectId}.firebaseio.com`
  });
} catch (error) {
  adminApp = admin.app();
}

const adminAuth = admin.auth();

export {
  firebaseApp,
  auth,
  googleProvider,
  adminApp,
  adminAuth
}; 