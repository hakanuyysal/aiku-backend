import express from 'express';
import linkedinAuthController from '../controllers/linkedinAuth.controller';
import { supabase } from '../config/supabase';
import { LinkedInService } from '../services/linkedInService';

const router = express.Router();

// LinkedIn oturum açma URL'si al (Supabase üzerinden)
router.get('/auth/linkedin', async (req, res) => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'linkedin_oidc',
      options: {
        redirectTo: `${process.env.CLIENT_URL}/auth/callback`,
        queryParams: {
          prompt: 'consent',
        },
      },
    });

    if (error) throw error;
    if (!data.url) throw new Error('Auth URL alınamadı');

    res.redirect(data.url);
  } catch (error) {
    console.error('LinkedIn auth error:', error);
    res.redirect(`${process.env.CLIENT_URL}/auth/login?error=linkedin-auth-failed`);
  }
});

// LinkedIn callback endpoint'i (Supabase üzerinden)
router.get('/auth/linkedin/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.redirect(`${process.env.CLIENT_URL}/auth/login?error=no-code`);
  }

  try {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code.toString());
    if (error) throw error;

    // MongoDB ile senkronizasyon
    const linkedInService = new LinkedInService();
    const authResult = await linkedInService.handleAuth(data);

    res.redirect(
      `${process.env.CLIENT_URL}/auth/callback?session=${encodeURIComponent(JSON.stringify(authResult))}`
    );
  } catch (error) {
    console.error("LinkedIn callback error:", error);
    res.redirect(`${process.env.CLIENT_URL}/auth/login?error=linkedin-callback-failed`);
  }
});

// Eski POST endpointi - eski entegrasyonlar için korundu
router.post('/auth/linkedin/callback', linkedinAuthController.handleLinkedInCallback);

export default router; 