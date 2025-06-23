import express from 'express';
import linkedinAuthController from '../controllers/linkedinAuth.controller';
import { supabase } from '../config/supabase';
import { LinkedInService } from '../services/linkedInService';
import { log } from 'console';
import logger from '../config/logger';

const router = express.Router();

// Debug için tüm istekleri logla
router.use((req, res, next) => {
  console.log('\x1b[35m%s\x1b[0m', '🔍 [LinkedIn Debug] Gelen İstek:', {
    method: req.method,
    url: req.url,
    headers: req.headers,
    query: req.query,
    body: req.body,
    path: req.path
  });
  next();
});

// LinkedIn URL endpoint'i (mobil uygulama için)
router.get('/auth/linkedin/url', async (req, res) => {
  const { platform } = req.query;
  console.log('\x1b[36m%s\x1b[0m', '🔵 [LinkedIn Route] Auth URL isteği alındı:', { 
    platform, 
    query: req.query,
    headers: {
      'user-agent': req.headers['user-agent'],
      'content-type': req.headers['content-type'],
      'origin': req.headers['origin']
    }
  });
  
  try {
    const authURL = linkedinAuthController.getLinkedInAuthURL(req, res);
    console.log('\x1b[32m%s\x1b[0m', '🟢 [LinkedIn Route] Auth URL başarıyla oluşturuldu:', authURL);
  } catch (error) {
    console.log('\x1b[31m%s\x1b[0m', '🔴 [LinkedIn Route] Auth URL oluşturma hatası:', error);
    res.status(500).json({ error: 'Auth URL oluşturulamadı' });
  }
});

// LinkedIn oturum açma URL'si al (Supabase üzerinden - web için)
router.get('/auth/linkedin', async (req, res) => {
  console.log('\x1b[36m%s\x1b[0m', '🔵 [LinkedIn Route] Web için Supabase auth başlatılıyor');
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

    if (error) {
      console.log('\x1b[31m%s\x1b[0m', '🔴 [LinkedIn Route] Supabase auth hatası:', error);
      throw error;
    }
    if (!data.url) {
      console.log('\x1b[31m%s\x1b[0m', '🔴 [LinkedIn Route] Supabase URL alınamadı');
      throw new Error('Auth URL alınamadı');
    }

    console.log('\x1b[32m%s\x1b[0m', '🟢 [LinkedIn Route] Supabase auth URL alındı:', data.url);
    res.redirect(data.url);
  } catch (error) {
    console.error('LinkedIn auth error:', error);
    logger.error('LinkedIn auth error:', error);
    res.redirect(`${process.env.CLIENT_URL}/auth/login?error=linkedin-auth-failed`);
  }
});

// LinkedIn callback endpoint'i (Supabase üzerinden - web için)
router.get('/auth/linkedin/callback', async (req, res) => {
  console.log('\x1b[36m%s\x1b[0m', '🔵 [LinkedIn Route] Web callback alındı:', { 
    query: req.query,
    headers: {
      'user-agent': req.headers['user-agent'],
      'referer': req.headers['referer'],
      'origin': req.headers['origin']
    }
  });
  
  const { code } = req.query;
  if (!code) {
    console.log('\x1b[31m%s\x1b[0m', '🔴 [LinkedIn Route] Callback\'de code parametresi yok');
    return res.redirect(`${process.env.CLIENT_URL}/auth/login?error=no-code`);
  }

  try {
    console.log('\x1b[36m%s\x1b[0m', '🔵 [LinkedIn Route] Supabase token değişimi başlatılıyor');
    const { data, error } = await supabase.auth.exchangeCodeForSession(code.toString());
    if (error) {
      console.log('\x1b[31m%s\x1b[0m', '🔴 [LinkedIn Route] Token değişimi hatası:', error);
      throw error;
    }

    console.log('\x1b[32m%s\x1b[0m', '🟢 [LinkedIn Route] Token başarıyla alındı');

    // MongoDB ile senkronizasyon
    console.log('\x1b[36m%s\x1b[0m', '🔵 [LinkedIn Route] MongoDB senkronizasyonu başlatılıyor');
    const linkedInService = new LinkedInService();
    const authResult = await linkedInService.handleAuth(data);
    console.log('\x1b[32m%s\x1b[0m', '🟢 [LinkedIn Route] MongoDB senkronizasyonu tamamlandı');

    res.redirect(
      `${process.env.CLIENT_URL}/auth/callback?session=${encodeURIComponent(JSON.stringify(authResult))}`
    );
  } catch (error) {
    console.error("LinkedIn callback error:", error);
    logger.error("LinkedIn callback error:", error);
    res.redirect(`${process.env.CLIENT_URL}/auth/login?error=linkedin-callback-failed`);
  }
});

// Mobil uygulama için callback endpoint'i
router.post('/auth/linkedin/callback', async (req, res) => {
  console.log('\x1b[36m%s\x1b[0m', '🔵 [LinkedIn Route] Mobil callback isteği alındı:', { 
    body: req.body,
    headers: {
      'user-agent': req.headers['user-agent'],
      'content-type': req.headers['content-type'],
      'origin': req.headers['origin']
    }
  });
  
  try {
    await linkedinAuthController.handleLinkedInCallback(req, res);
    console.log('\x1b[32m%s\x1b[0m', '🟢 [LinkedIn Route] Mobil callback başarıyla tamamlandı');
  } catch (error) {
    console.log('\x1b[31m%s\x1b[0m', '🔴 [LinkedIn Route] Mobil callback hatası:', error);
    res.status(500).json({ error: 'Callback işlemi başarısız' });
  }
});

export default router; 