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
const supabaseClient_1 = __importDefault(require("../config/supabaseClient"));
const dotenv_1 = __importDefault(require("dotenv"));
const axios_1 = __importDefault(require("axios"));
dotenv_1.default.config();
class LinkedInAuthService {
    // LinkedIn ile oturum açma URL'sini oluştur
    getLinkedInAuthURL() {
        const redirectURI = process.env.LINKEDIN_REDIRECT_URI || 'https://aikuaiplatform.com/auth/social-callback';
        const linkedInClientId = process.env.LINKEDIN_CLIENT_ID;
        if (!linkedInClientId) {
            throw new Error('LinkedIn Client ID is not defined in environment variables');
        }
        const scopes = ['openid', 'profile', 'email'].join(' ');
        const state = Math.random().toString(36).substring(2, 15); // Rastgele state değeri
        // LinkedIn OAuth 2.0 URL'si
        return `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${linkedInClientId}&redirect_uri=${encodeURIComponent(redirectURI)}&state=${state}&scope=${encodeURIComponent(scopes)}`;
    }
    // LinkedIn'den gelen auth code ile token alma
    getTokenFromCode(code) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const redirectURI = process.env.LINKEDIN_REDIRECT_URI || 'https://aikuaiplatform.com/auth/social-callback';
                const linkedInClientId = process.env.LINKEDIN_CLIENT_ID;
                const linkedInClientSecret = process.env.LINKEDIN_CLIENT_SECRET;
                if (!linkedInClientId || !linkedInClientSecret) {
                    throw new Error('LinkedIn Client ID or Client Secret is not defined in environment variables');
                }
                // LinkedIn token URL'sine istek gönder
                const response = yield axios_1.default.post('https://www.linkedin.com/oauth/v2/accessToken', null, {
                    params: {
                        grant_type: 'authorization_code',
                        code,
                        redirect_uri: redirectURI,
                        client_id: linkedInClientId,
                        client_secret: linkedInClientSecret
                    },
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                });
                return response.data;
            }
            catch (error) {
                console.error('LinkedIn token alınamadı:', error);
                throw error;
            }
        });
    }
    // LinkedIn token ile kullanıcı bilgilerini alma
    getUserInfo(accessToken) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                // Kullanıcı profil bilgilerini al
                const profileResponse = yield axios_1.default.get('https://api.linkedin.com/v2/me', {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'cache-control': 'no-cache',
                        'X-Restli-Protocol-Version': '2.0.0'
                    }
                });
                // Kullanıcı email bilgisini al
                const emailResponse = yield axios_1.default.get('https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))', {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'cache-control': 'no-cache',
                        'X-Restli-Protocol-Version': '2.0.0'
                    }
                });
                const profileData = profileResponse.data;
                const emailData = emailResponse.data;
                const email = ((_c = (_b = (_a = emailData.elements) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b['handle~']) === null || _c === void 0 ? void 0 : _c.emailAddress) || '';
                return {
                    id: profileData.id,
                    firstName: profileData.localizedFirstName,
                    lastName: profileData.localizedLastName,
                    email
                };
            }
            catch (error) {
                console.error('LinkedIn kullanıcı bilgileri alınamadı:', error);
                throw error;
            }
        });
    }
    // Kullanıcıyı Supabase'e kaydet veya güncelle
    signInWithLinkedIn(userInfo) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id, email, firstName, lastName } = userInfo;
                if (!email) {
                    throw new Error('Email alınamadı. Kullanıcı kayıt edilemez.');
                }
                // Önce email ile Supabase'de kullanıcı kontrolü yap
                const { data: existingUser, error: searchError } = yield supabaseClient_1.default
                    .from('users')
                    .select('*')
                    .eq('email', email)
                    .maybeSingle();
                if (searchError) {
                    console.error('Kullanıcı arama hatası:', searchError);
                    throw searchError;
                }
                if (existingUser) {
                    // Kullanıcı varsa, LinkedIn bilgilerini güncelle
                    const { data: updatedUser, error: updateError } = yield supabaseClient_1.default
                        .from('users')
                        .update({
                        linkedin_id: id,
                        updated_at: new Date().toISOString()
                    })
                        .eq('email', email)
                        .select()
                        .single();
                    if (updateError) {
                        console.error('Kullanıcı güncelleme hatası:', updateError);
                        throw updateError;
                    }
                    return updatedUser;
                }
                else {
                    // Kullanıcı yoksa, yeni kullanıcı oluştur
                    const { data: newUser, error: insertError } = yield supabaseClient_1.default
                        .from('users')
                        .insert([
                        {
                            email,
                            first_name: firstName,
                            last_name: lastName,
                            linkedin_id: id,
                            auth_provider: 'linkedin',
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        }
                    ])
                        .select()
                        .single();
                    if (insertError) {
                        console.error('Kullanıcı oluşturma hatası:', insertError);
                        throw insertError;
                    }
                    return newUser;
                }
            }
            catch (error) {
                console.error('LinkedIn kullanıcısı Supabase\'e kaydedilemedi:', error);
                throw error;
            }
        });
    }
}
exports.default = new LinkedInAuthService();
