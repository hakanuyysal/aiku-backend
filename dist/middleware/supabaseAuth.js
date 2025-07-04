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
exports.verifySupabaseToken = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const User_1 = require("../models/User");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Supabase bağlantı bilgileri
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';
console.log('Supabase Konfigürasyonu:', {
    url: supabaseUrl,
    hasServiceKey: !!supabaseServiceKey,
    serviceKeyLength: supabaseServiceKey === null || supabaseServiceKey === void 0 ? void 0 : supabaseServiceKey.length
});
// Service key olduğundan emin ol, yoksa anon key kullan
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true
    }
});
// JWT Token doğrulama middleware'i
const verifySupabaseToken = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    try {
        console.log('Auth Header:', req.headers.authorization);
        // Önce body'den provider bilgisini alalım
        const provider = ((_a = req.body) === null || _a === void 0 ? void 0 : _a.provider) || '';
        console.log('İstek gönderen provider:', provider);
        const token = (_b = req.headers.authorization) === null || _b === void 0 ? void 0 : _b.split(' ')[1];
        if (!token) {
            console.log('Token bulunamadı');
            return res.status(401).json({
                success: false,
                message: 'Yetkilendirme token\'ı bulunamadı'
            });
        }
        console.log('Token alındı, uzunluk:', token.length);
        // Supabase token'ını doğrula
        console.log('Supabase auth.getUser çağrılıyor...');
        const { data, error } = yield supabase.auth.getUser(token);
        console.log('Supabase yanıtı:', { data, error: error === null || error === void 0 ? void 0 : error.message });
        if (error) {
            console.error('Supabase doğrulama hatası:', error);
            // LinkedIn entegrasyonu için özel durum kontrolü
            if (provider === 'linkedin_oidc' || provider === 'linkedin') {
                // LinkedIn entegrasyonu için token hatalarında daha esnek davranabiliriz
                console.log('LinkedIn entegrasyonu için devam ediliyor...');
                // Kullanıcı bilgilerini body'den alalım
                if ((_c = req.body) === null || _c === void 0 ? void 0 : _c.email) {
                    req.user = {
                        email: req.body.email,
                        _id: req.body.user_id || null
                    };
                    next();
                    return;
                }
            }
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token',
                error: error.message,
                details: {
                    name: error.name,
                    status: error.status
                }
            });
        }
        const supabaseUser = data.user;
        if (!supabaseUser) {
            console.error('Supabase kullanıcısı bulunamadı');
            // LinkedIn için esneklik
            if (provider === 'linkedin_oidc' || provider === 'linkedin') {
                if ((_d = req.body) === null || _d === void 0 ? void 0 : _d.email) {
                    req.user = {
                        email: req.body.email,
                        _id: req.body.user_id || null
                    };
                    next();
                    return;
                }
            }
            return res.status(401).json({
                success: false,
                message: 'Geçersiz token - kullanıcı bulunamadı'
            });
        }
        console.log('Supabase kullanıcısı bulundu:', {
            id: supabaseUser.id,
            email: supabaseUser.email,
            provider: ((_e = supabaseUser.app_metadata) === null || _e === void 0 ? void 0 : _e.provider) || 'unknown'
        });
        // MongoDB'den kullanıcıyı bul
        let mongoUser;
        // Önce supabaseId ile ara
        if (supabaseUser.id) {
            console.log('SupabaseId ile kullanıcı aranıyor:', supabaseUser.id);
            mongoUser = yield User_1.User.findOne({ supabaseId: supabaseUser.id });
        }
        // Bulunamadıysa email ile ara
        if (!mongoUser && supabaseUser.email) {
            console.log('Email ile kullanıcı aranıyor:', supabaseUser.email);
            mongoUser = yield User_1.User.findOne({ email: supabaseUser.email });
            // Kullanıcı bulunduysa supabaseId'yi güncelle
            if (mongoUser) {
                console.log('Kullanıcı bulundu, supabaseId güncelleniyor');
                mongoUser.supabaseId = supabaseUser.id;
                yield mongoUser.save();
            }
        }
        // LinkedIn kullanıcısı için kontrol - bulamamış isek body'deki kullanıcıya güvenelim
        if (!mongoUser && (provider === 'linkedin_oidc' || provider === 'linkedin')) {
            if ((_f = req.body) === null || _f === void 0 ? void 0 : _f.email) {
                console.log('LinkedIn entegrasyonu için body verisi kullanılıyor:', req.body.email);
                req.user = {
                    email: req.body.email,
                    _id: req.body.user_id || null
                };
                next();
                return;
            }
        }
        if (!mongoUser) {
            console.error('MongoDB kullanıcısı bulunamadı:', {
                supabaseId: supabaseUser.id,
                email: supabaseUser.email,
                provider: provider || ((_g = supabaseUser.app_metadata) === null || _g === void 0 ? void 0 : _g.provider)
            });
            // Kullanıcı bilgilerini req.user'a ekleyelim ki controller bu bilgileri kullanabilsin
            req.user = {
                email: supabaseUser.email,
                _id: null,
                firstName: ((_h = supabaseUser.user_metadata) === null || _h === void 0 ? void 0 : _h.given_name) || ((_j = supabaseUser.user_metadata) === null || _j === void 0 ? void 0 : _j.first_name),
                lastName: ((_k = supabaseUser.user_metadata) === null || _k === void 0 ? void 0 : _k.family_name) || ((_l = supabaseUser.user_metadata) === null || _l === void 0 ? void 0 : _l.last_name)
            };
            // Kullanıcı bulunamadıysa 401 yerine devam edelim - controller yeni kullanıcı oluşturacak
            next();
            return;
        }
        console.log('MongoDB kullanıcısı bulundu:', {
            id: mongoUser._id,
            email: mongoUser.email
        });
        // MongoDB kullanıcısını request'e ekle
        req.user = mongoUser;
        next();
    }
    catch (error) {
        console.error('Token doğrulama hatası:', {
            error: error.message,
            stack: error.stack
        });
        res.status(500).json({
            success: false,
            message: 'Token doğrulama hatası',
            error: error.message,
            type: error.constructor.name
        });
    }
});
exports.verifySupabaseToken = verifySupabaseToken;
