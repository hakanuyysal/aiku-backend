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
exports.getAllTeamMembers = exports.getTeamMembersByCompany = exports.getTeamMembersByUser = exports.getTeamMemberById = exports.deleteTeamMember = exports.updateTeamMember = exports.createTeamMember = void 0;
const express_validator_1 = require("express-validator");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const mongoose_1 = __importDefault(require("mongoose"));
const TeamMember_1 = require("../models/TeamMember");
// **Yeni Takım Üyesi Oluşturma**
const createTeamMember = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Validasyon hatalarını kontrol et
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }
        // Token doğrulama
        const token = (_a = req.header('Authorization')) === null || _a === void 0 ? void 0 : _a.replace('Bearer ', '');
        if (!token) {
            return res
                .status(401)
                .json({ success: false, message: 'Yetkilendirme başarısız, token bulunamadı' });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
        const { firstName, lastName, title, profilePhoto, company, companyName } = req.body;
        // Yeni takım üyesi oluştur
        const teamMember = yield TeamMember_1.TeamMember.create({
            firstName,
            lastName,
            title,
            profilePhoto,
            company,
            companyName,
            user: userId,
        });
        res.status(201).json({ success: true, teamMember });
    }
    catch (err) {
        res
            .status(500)
            .json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
});
exports.createTeamMember = createTeamMember;
// **Takım Üyesini Güncelleme**
const updateTeamMember = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Token doğrulama
        const token = (_a = req.header('Authorization')) === null || _a === void 0 ? void 0 : _a.replace('Bearer ', '');
        if (!token) {
            return res
                .status(401)
                .json({ success: false, message: 'Yetkilendirme başarısız, token bulunamadı' });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
        const { id } = req.params;
        const teamMember = yield TeamMember_1.TeamMember.findById(id);
        if (!teamMember) {
            return res.status(404).json({ success: false, message: 'Takım üyesi bulunamadı' });
        }
        // @ts-expect-error - ITeamMember tipinde user alanı tanımlı değil fakat kod içinde kullanılıyor
        if (teamMember.user.toString() !== userId) {
            return res
                .status(403)
                .json({ success: false, message: 'Bu takım üyesini güncelleme yetkiniz yok' });
        }
        // Güncellenecek alanları belirle
        Object.assign(teamMember, req.body);
        yield teamMember.save();
        res.status(200).json({ success: true, teamMember });
    }
    catch (err) {
        res
            .status(500)
            .json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
});
exports.updateTeamMember = updateTeamMember;
// **Takım Üyesini Silme**
const deleteTeamMember = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Token doğrulama
        const token = (_a = req.header('Authorization')) === null || _a === void 0 ? void 0 : _a.replace('Bearer ', '');
        if (!token) {
            return res
                .status(401)
                .json({ success: false, message: 'Yetkilendirme başarısız, token bulunamadı' });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
        const { id } = req.params;
        const teamMember = yield TeamMember_1.TeamMember.findById(id);
        if (!teamMember) {
            return res.status(404).json({ success: false, message: 'Takım üyesi bulunamadı' });
        }
        // @ts-expect-error - ITeamMember tipinde user alanı tanımlı değil fakat kod içinde kullanılıyor
        if (teamMember.user.toString() !== userId) {
            return res
                .status(403)
                .json({ success: false, message: 'Bu takım üyesini silme yetkiniz yok' });
        }
        yield teamMember.deleteOne();
        res
            .status(200)
            .json({ success: true, message: 'Takım üyesi başarıyla silindi' });
    }
    catch (err) {
        res
            .status(500)
            .json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
});
exports.deleteTeamMember = deleteTeamMember;
// **Belirli Bir Takım Üyesini Getirme**
const getTeamMemberById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const teamMember = yield TeamMember_1.TeamMember.findById(id).populate('company', 'companyName');
        if (!teamMember) {
            return res.status(404).json({ success: false, message: 'Takım üyesi bulunamadı' });
        }
        res.status(200).json({ success: true, teamMember });
    }
    catch (err) {
        res
            .status(500)
            .json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
});
exports.getTeamMemberById = getTeamMemberById;
// **Kullanıcının Tüm Takım Üyelerini Getirme**
const getTeamMembersByUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Token doğrulama
        const token = (_a = req.header('Authorization')) === null || _a === void 0 ? void 0 : _a.replace('Bearer ', '');
        if (!token) {
            return res
                .status(401)
                .json({ success: false, message: 'Yetkilendirme başarısız, token bulunamadı' });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
        const teamMembers = yield TeamMember_1.TeamMember.find({ user: userId }).populate('company', 'companyName');
        res.status(200).json({ success: true, teamMembers });
    }
    catch (err) {
        res
            .status(500)
            .json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
});
exports.getTeamMembersByUser = getTeamMembersByUser;
// **Belirli Bir Şirkete Ait Takım Üyelerini Getirme**
const getTeamMembersByCompany = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { companyId } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(companyId)) {
            return res
                .status(400)
                .json({ success: false, message: "Geçersiz Şirket ID'si" });
        }
        const teamMembers = yield TeamMember_1.TeamMember.find({ company: companyId }).populate('company', 'companyName');
        res.status(200).json({ success: true, teamMembers });
    }
    catch (err) {
        res
            .status(500)
            .json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
});
exports.getTeamMembersByCompany = getTeamMembersByCompany;
// **Tüm Takım Üyelerini Getirme**
const getAllTeamMembers = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const teamMembers = yield TeamMember_1.TeamMember.find().populate('company', 'companyName');
        res.status(200).json({ success: true, teamMembers });
    }
    catch (err) {
        res
            .status(500)
            .json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
});
exports.getAllTeamMembers = getAllTeamMembers;
