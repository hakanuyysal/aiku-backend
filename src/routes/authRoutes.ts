import { Router } from "express";
import { check } from "express-validator";
import {
  register,
  login,
  getCurrentUser,
  updateUser,
  getUserById,
  addFavorite,
  removeFavorite,
  getFavorites,
  googleCallback,
  fixSubscription,
  createOrUpdateSubscription,
  checkAndRenewTrialSubscriptions,
  googleLogin,
  logout,
} from "../controllers/authController";
import { protect } from "../middleware/auth";
import { verifySupabaseToken } from "../middleware/supabaseAuth";
import passport from "../config/passport";
import { LinkedInService } from "../services/linkedInService";
import { supabase } from "../config/supabase";
import { GoogleService } from "../services/googleService";

const router = Router();

// Kayıt rotası
router.post(
  "/register",
  [
    check("firstName", "İsim alanı zorunludur").not().isEmpty(),
    check("lastName", "Soyisim alanı zorunludur").not().isEmpty(),
    check("email", "Lütfen geçerli bir email adresi giriniz").isEmail(),
    check("password", "Şifre en az 6 karakter olmalıdır").isLength({ min: 6 }),
  ],
  register
);

// Giriş rotası
router.post(
  "/login",
  [
    check("email", "Lütfen geçerli bir email adresi giriniz").trim().isEmail().normalizeEmail(),
    check("password", "Şifre alanı zorunludur").trim().notEmpty(),
  ],
  login
);

// Giriş yapmış kullanıcının bilgilerini alma rotası
router.get("/currentUser", verifySupabaseToken, getCurrentUser);

// Kullanıcı bilgilerini güncelleme rotası
router.put("/updateUser", verifySupabaseToken, updateUser);

// Kullanıcı id'si ile bilgilerini alma rotası
router.get("/user/:id", verifySupabaseToken, getUserById);

// Abonelik durumunu kontrol et ve düzelt
router.get("/fix-subscription", protect, fixSubscription);

// Yeni abonelik oluşturma veya güncelleme
router.post(
  "/subscription",
  protect,
  [
    check("plan", "Abonelik planı zorunludur").not().isEmpty(),
    check("period", "Abonelik dönemi zorunludur").not().isEmpty(),
    check("paymentMethod", "Ödeme yöntemi zorunludur").not().isEmpty(),
  ],
  createOrUpdateSubscription
);

// Trial abonelikleri kontrol etme ve yenileme (sadece admin)
router.post(
  "/admin/check-trial-subscriptions",
  protect,
  checkAndRenewTrialSubscriptions
);

// Favorilere öğe ekleme rotası
router.post(
  "/favorites",
  protect,
  [
    check("type", "Favori türü (user, company, product) gereklidir")
      .not()
      .isEmpty(),
    check("itemId", "Öğe ID gereklidir").not().isEmpty(),
  ],
  addFavorite
);

// Favoriden kaldırma rotası (DELETE isteği ile)
router.delete(
  "/favorites",
  protect,
  [
    check("type", "Favori türü (user, company, product) gereklidir")
      .not()
      .isEmpty(),
    check("itemId", "Öğe ID gereklidir").not().isEmpty(),
  ],
  removeFavorite
);

// Favori öğeleri çekme rotası
router.get("/favorites", protect, getFavorites);

// Google OAuth rotaları
router.get("/auth/google", async (req, res) => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${process.env.CLIENT_URL}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) throw error;
    if (!data.url) throw new Error('Auth URL alınamadı');

    res.redirect(data.url);
  } catch (error) {
    console.error('Google auth error:', error);
    res.redirect(`${process.env.CLIENT_URL}/auth/login?error=auth-failed`);
  }
});

// Google callback endpoint'i
router.get("/auth/callback", async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.redirect(`${process.env.CLIENT_URL}/auth/login?error=no-code`);
  }

  try {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code.toString());
    if (error) throw error;

    // MongoDB ile senkronizasyon
    const googleService = new GoogleService();
    const authResult = await googleService.handleAuth(data);

    res.redirect(
      `${process.env.CLIENT_URL}/auth/callback?session=${encodeURIComponent(JSON.stringify(authResult))}`
    );
  } catch (error) {
    console.error("Google callback error:", error);
    res.redirect(`${process.env.CLIENT_URL}/auth/login?error=callback-failed`);
  }
});

// Google login endpoint'i - Token ile giriş
router.post("/google/login", async (req, res) => {
  try {
    console.log("Google login isteği alındı:", {
      body: req.body,
      headers: req.headers
    });

    const { accessToken } = req.body;
    
    if (!accessToken) {
      console.log("Token bulunamadı:", req.body);
      return res.status(400).json({
        success: false,
        error: "Access token gereklidir",
        details: "Kimlik doğrulama başarısız",
        errorCode: 400
      });
    }

    const googleService = new GoogleService();
    const authResult = await googleService.handleAuth({
      user: {
        access_token: accessToken
      }
    });

    console.log("Google login başarılı:", { userId: authResult.user.id });
    
    res.json({
      token: authResult.token,
      user: authResult.user
    });
  } catch (error: any) {
    console.error("Google login error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: "Sunucu hatası",
      errorCode: 500
    });
  }
});

// Oturum kapatma rotası
router.post("/logout", protect, logout);

// LinkedIn Routes
router.get("/linkedin", (req, res) => {
  const linkedInService = new LinkedInService();
  const authUrl = linkedInService.getAuthUrl();
  res.json({ authUrl });
});

router.post("/linkedin", async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: "Authorization code is required" });
    }

    const linkedInService = new LinkedInService();
    const accessToken = await linkedInService.getAccessToken(code);
    const profile = await linkedInService.getProfile(accessToken);
    const authResult = await linkedInService.handleAuth(profile);

    res.json(authResult);
  } catch (error: any) {
    console.error("LinkedIn auth error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
