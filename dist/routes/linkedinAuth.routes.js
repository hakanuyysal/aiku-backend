"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const linkedinAuth_controller_1 = __importDefault(require("../controllers/linkedinAuth.controller"));
const supabase_1 = require("../config/supabase");
const linkedInService_1 = require("../services/linkedInService");
const router = express_1.default.Router();
// LinkedIn oturum açma URL'si al (Supabase üzerinden)
router.get('/auth/linkedin', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { data, error } = yield supabase_1.supabase.auth.signInWithOAuth({
            provider: 'linkedin_oidc',
            options: {
                redirectTo: `${process.env.CLIENT_URL}/auth/callback`,
                queryParams: {
                    prompt: 'consent',
                },
            },
        });
        if (error)
            throw error;
        if (!data.url)
            throw new Error('Auth URL alınamadı');
        res.redirect(data.url);
    }
    catch (error) {
        console.error('LinkedIn auth error:', error);
        res.redirect(`${process.env.CLIENT_URL}/auth/login?error=linkedin-auth-failed`);
    }
}));
// LinkedIn callback endpoint'i (Supabase üzerinden)
router.get('/auth/linkedin/callback', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { code } = req.query;
    if (!code) {
        return res.redirect(`${process.env.CLIENT_URL}/auth/login?error=no-code`);
    }
    try {
        const { data, error } = yield supabase_1.supabase.auth.exchangeCodeForSession(code.toString());
        if (error)
            throw error;
        // MongoDB ile senkronizasyon
        const linkedInService = new linkedInService_1.LinkedInService();
        const authResult = yield linkedInService.handleAuth(data);
        res.redirect(`${process.env.CLIENT_URL}/auth/callback?session=${encodeURIComponent(JSON.stringify(authResult))}`);
    }
    catch (error) {
        console.error("LinkedIn callback error:", error);
        res.redirect(`${process.env.CLIENT_URL}/auth/login?error=linkedin-callback-failed`);
    }
}));
// Eski POST endpointi - eski entegrasyonlar için korundu
router.post('/auth/linkedin/callback', linkedinAuth_controller_1.default.handleLinkedInCallback);
exports.default = router;
