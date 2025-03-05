"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFavorites = exports.removeFavorite = exports.addFavorite = exports.getUserById = exports.updateUser = exports.getCurrentUser = exports.login = exports.register = void 0;
const express_validator_1 = require("express-validator");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_1 = require("../models/User");
// JWT Token oluşturma
const createToken = (id) => {
    return jsonwebtoken_1.default.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE
    });
};
// Kayıt işlemi
const register = async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }
        const { firstName, lastName, email, password } = req.body;
        // Email kontrolü
        let user = await User_1.User.findOne({ email });
        if (user) {
            return res.status(400).json({
                success: false,
                message: 'Bu email adresi zaten kayıtlı'
            });
        }
        // Yeni kullanıcı oluşturma
        user = await User_1.User.create({
            firstName,
            lastName,
            email,
            password
        });
        const token = createToken(user._id);
        const userResponse = {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email
        };
        res.status(201).json({
            success: true,
            token,
            user: userResponse
        });
    }
    catch (err) {
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası'
        });
    }
};
exports.register = register;
// Giriş işlemi
const login = async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }
        const { email, password } = req.body;
        // Email ve şifre kontrolü
        const user = await User_1.User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Geçersiz email veya şifre'
            });
        }
        // Şifre kontrolü
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Geçersiz email veya şifre'
            });
        }
        const token = createToken(user._id);
        const userResponse = {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email
        };
        res.status(200).json({
            success: true,
            token,
            user: userResponse
        });
    }
    catch (err) {
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası'
        });
    }
};
exports.login = login;
// Kullanıcı bilgileri getirme
const getCurrentUser = async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ success: false, message: 'Yetkilendirme başarısız, token bulunamadı' });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const user = await User_1.User.findById(decoded.id).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
        }
        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone,
                title: user.title,
                location: user.location,
                profileInfo: user.profileInfo,
                profilePhoto: user.profilePhoto,
                linkedin: user.linkedin,
                instagram: user.instagram,
                facebook: user.facebook,
                twitter: user.twitter,
                createdAt: user.createdAt
            },
        });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
};
exports.getCurrentUser = getCurrentUser;
//Kullanıcı bilgileri güncelleme
const updateUser = async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ success: false, message: 'Yetkilendirme başarısız, token bulunamadı' });
        }
        // Kullanıcıyı doğrula
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        let user = await User_1.User.findById(decoded.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
        }
        // Güncellenmek istenen alanları al
        const { firstName, lastName, email, phone, title, location, profileInfo, profilePhoto, linkedin, instagram, facebook, twitter, password } = req.body;
        if (firstName)
            user.firstName = firstName;
        if (lastName)
            user.lastName = lastName;
        if (email)
            user.email = email;
        if (phone)
            user.phone = phone;
        if (title)
            user.title = title;
        if (location)
            user.location = location;
        if (profileInfo)
            user.profileInfo = profileInfo;
        if (profilePhoto)
            user.profilePhoto = profilePhoto;
        if (linkedin)
            user.linkedin = linkedin;
        if (instagram)
            user.instagram = instagram;
        if (facebook)
            user.facebook = facebook;
        if (twitter)
            user.twitter = twitter;
        // **Şifre güncelleniyorsa hashle**
        if (password) {
            const salt = await bcryptjs_1.default.genSalt(10);
            user.password = await bcryptjs_1.default.hash(password, salt);
        }
        // Güncellenmiş kullanıcıyı kaydet
        await user.save();
        // Kullanıcı bilgilerini döndür
        const updatedUserResponse = {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
            title: user.title,
            location: user.location,
            profileInfo: user.profileInfo,
            profilePhoto: user.profilePhoto,
            linkedin: user.linkedin,
            instagram: user.instagram,
            facebook: user.facebook,
            twitter: user.twitter,
        };
        res.status(200).json({ success: true, user: updatedUserResponse });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
};
exports.updateUser = updateUser;
// Kullanıcı bilgilerini id ile getirme
const getUserById = async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User_1.User.findById(userId).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, message: "Kullanıcı bulunamadı" });
        }
        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone,
                title: user.title,
                location: user.location,
                profileInfo: user.profileInfo,
                profilePhoto: user.profilePhoto,
                linkedin: user.linkedin,
                instagram: user.instagram,
                facebook: user.facebook,
                twitter: user.twitter,
                createdAt: user.createdAt
            }
        });
    }
    catch (err) {
        res.status(500).json({ success: false, message: "Sunucu hatası", error: err.message });
    }
};
exports.getUserById = getUserById;
// Favorilere öğe ekleme fonksiyonu
const addFavorite = async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ success: false, message: 'Yetkilendirme başarısız, token bulunamadı' });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        let user = await User_1.User.findById(decoded.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
        }
        const { type, itemId } = req.body;
        if (!type || !itemId) {
            return res.status(400).json({ success: false, message: 'type ve itemId alanları gereklidir' });
        }
        // Favori ekleme işlemi: type değerine göre ilgili favorites alanı güncelleniyor
        if (type === 'user') {
            // Aynı öğenin tekrar eklenmemesi için kontrol
            if (user.favoriteUsers && user.favoriteUsers.includes(itemId)) {
                return res.status(400).json({ success: false, message: 'Kullanıcı zaten favorilerde' });
            }
            user.favoriteUsers = user.favoriteUsers || [];
            user.favoriteUsers.push(itemId);
        }
        else if (type === 'company') {
            if (user.favoriteCompanies && user.favoriteCompanies.includes(itemId)) {
                return res.status(400).json({ success: false, message: 'Şirket zaten favorilerde' });
            }
            user.favoriteCompanies = user.favoriteCompanies || [];
            user.favoriteCompanies.push(itemId);
        }
        else if (type === 'product') {
            if (user.favoriteProducts && user.favoriteProducts.includes(itemId)) {
                return res.status(400).json({ success: false, message: 'Ürün zaten favorilerde' });
            }
            user.favoriteProducts = user.favoriteProducts || [];
            user.favoriteProducts.push(itemId);
        }
        else {
            return res.status(400).json({ success: false, message: 'Geçersiz favori türü' });
        }
        await user.save();
        res.status(200).json({ success: true, message: 'Favorilere eklendi' });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
};
exports.addFavorite = addFavorite;
// Favoriden öğe kaldırma fonksiyonu
const removeFavorite = async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ success: false, message: 'Yetkilendirme başarısız, token bulunamadı' });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        let user = await User_1.User.findById(decoded.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
        }
        const { type, itemId } = req.body;
        if (!type || !itemId) {
            return res.status(400).json({ success: false, message: 'type ve itemId alanları gereklidir' });
        }
        if (type === 'user') {
            user.favoriteUsers = user.favoriteUsers.filter((fav) => fav.toString() !== itemId);
        }
        else if (type === 'company') {
            user.favoriteCompanies = user.favoriteCompanies.filter((fav) => fav.toString() !== itemId);
        }
        else if (type === 'product') {
            user.favoriteProducts = user.favoriteProducts.filter((fav) => fav.toString() !== itemId);
        }
        else {
            return res.status(400).json({ success: false, message: 'Geçersiz favori türü' });
        }
        await user.save();
        res.status(200).json({ success: true, message: 'Favoriden kaldırıldı' });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
};
exports.removeFavorite = removeFavorite;
// Favorilere eklenmiş öğeleri çekme fonksiyonu
const getFavorites = async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ success: false, message: 'Yetkilendirme başarısız, token bulunamadı' });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const user = await User_1.User.findById(decoded.id)
            .populate('favoriteUsers', 'firstName lastName email')
            .populate('favoriteCompanies', 'name description')
            .populate('favoriteProducts', 'name price')
            .lean();
        if (!user) {
            return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
        }
        user.favoriteUsers = (user.favoriteUsers || []).filter(fav => fav);
        res.status(200).json({
            success: true,
            favorites: {
                favoriteUsers: user.favoriteUsers,
                favoriteCompanies: user.favoriteCompanies,
                favoriteProducts: user.favoriteProducts,
            }
        });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
};
exports.getFavorites = getFavorites;
