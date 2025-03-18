import express from 'express';
import supabaseAuthController from '../controllers/supabaseAuth.controller';
import { verifySupabaseToken } from '../middleware/supabaseAuth';

const router = express.Router();

// Supabase kullanıcısını senkronize et - token doğrulama ile
router.post('/auth/supabase/sync', verifySupabaseToken, supabaseAuthController.syncSupabaseUser);

export default router; 