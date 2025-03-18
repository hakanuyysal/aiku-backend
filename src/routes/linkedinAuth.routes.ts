import express from 'express';
import linkedinAuthController from '../controllers/linkedinAuth.controller';

const router = express.Router();

// LinkedIn oturum açma URL'si al
router.get('/auth/linkedin', linkedinAuthController.getLinkedInAuthURL);

// LinkedIn geri arama
router.post('/auth/linkedin/callback', linkedinAuthController.handleLinkedInCallback);

export default router; 