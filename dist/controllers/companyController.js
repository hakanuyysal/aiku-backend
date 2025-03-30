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
exports.uploadCompanyVideo = exports.deleteCompany = exports.updateCompany = exports.getCompaniesForUser = exports.getCompany = exports.createCompany = exports.getAllCompanies = void 0;
const express_validator_1 = require("express-validator");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const Company_1 = require("../models/Company");
const mongoose_1 = __importDefault(require("mongoose"));
// Tüm şirketleri getirme
const getAllCompanies = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Eğer token ile erişim zorunlu ise aşağıdaki satırları aktif edebilirsiniz:
        // const token = req.header('Authorization')?.replace('Bearer ', '');
        // if (!token) {
        //   return res.status(401).json({ success: false, message: 'Yetkilendirme başarısız, token bulunamadı' });
        // }
        // const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
        const companies = yield Company_1.Company.find();
        const companiesResponse = companies.map((company) => ({
            id: company._id,
            companyName: company.companyName,
            companyLogo: company.companyLogo,
            companyType: company.companyType,
            openForInvestments: company.openForInvestments,
            businessModel: company.businessModel,
            companySector: company.companySector,
            companySize: company.companySize,
            businessScale: company.businessScale,
            companyEmail: company.companyEmail,
            companyPhone: company.companyPhone,
            companyInfo: company.companyInfo,
            detailedDescription: company.detailedDescription,
            companyWebsite: company.companyWebsite,
            companyAddress: company.companyAddress,
            companyLinkedIn: company.companyLinkedIn,
            companyTwitter: company.companyTwitter,
            companyInstagram: company.companyInstagram,
            interestedSectors: company.interestedSectors,
            isIncorporated: company.isIncorporated,
            user: company.user.toString(),
            createdAt: company.createdAt,
        }));
        res.status(200).json({ success: true, companies: companiesResponse });
    }
    catch (err) {
        res
            .status(500)
            .json({ success: false, message: "Sunucu hatası", error: err.message });
    }
});
exports.getAllCompanies = getAllCompanies;
// Şirket oluşturma
const createCompany = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array(),
            });
        }
        // Token doğrulama
        const token = (_a = req.header("Authorization")) === null || _a === void 0 ? void 0 : _a.replace("Bearer ", "");
        if (!token) {
            return res
                .status(401)
                .json({
                success: false,
                message: "Yetkilendirme başarısız, token bulunamadı",
            });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
        const { companyName, companyLogo, companyType, openForInvestments, businessModel, companySector, companySize, businessScale, companyEmail, companyPhone, companyInfo, detailedDescription, companyWebsite, companyAddress, companyLinkedIn, companyTwitter, companyInstagram, interestedSectors, isIncorporated, } = req.body;
        const company = yield Company_1.Company.create({
            companyName,
            companyLogo,
            companyType,
            openForInvestments,
            businessModel,
            companySector,
            companySize,
            businessScale,
            companyEmail,
            companyPhone,
            companyInfo,
            detailedDescription,
            companyWebsite,
            companyAddress,
            companyLinkedIn,
            companyTwitter,
            companyInstagram,
            interestedSectors,
            isIncorporated,
            user: userId,
        });
        const companyResponse = {
            id: company._id,
            companyName: company.companyName,
            companyLogo: company.companyLogo,
            companyType: company.companyType,
            openForInvestments: company.openForInvestments,
            businessModel: company.businessModel,
            companySector: company.companySector,
            companySize: company.companySize,
            businessScale: company.businessScale,
            companyEmail: company.companyEmail,
            companyPhone: company.companyPhone,
            companyInfo: company.companyInfo,
            detailedDescription: company.detailedDescription,
            companyWebsite: company.companyWebsite,
            companyAddress: company.companyAddress,
            companyLinkedIn: company.companyLinkedIn,
            companyTwitter: company.companyTwitter,
            companyInstagram: company.companyInstagram,
            interestedSectors: company.interestedSectors,
            isIncorporated: company.isIncorporated,
            user: company.user.toString(),
            createdAt: company.createdAt,
        };
        res.status(201).json({ success: true, company: companyResponse });
    }
    catch (err) {
        res
            .status(500)
            .json({ success: false, message: "Sunucu hatası", error: err.message });
    }
});
exports.createCompany = createCompany;
// Belirtilen ID'ye sahip şirketi getirme
const getCompany = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const company = yield Company_1.Company.findById(id);
        if (!company) {
            return res
                .status(404)
                .json({ success: false, message: "Şirket bulunamadı" });
        }
        const companyResponse = {
            id: company._id,
            companyName: company.companyName,
            companyLogo: company.companyLogo,
            companyType: company.companyType,
            openForInvestments: company.openForInvestments,
            businessModel: company.businessModel,
            companySector: company.companySector,
            companySize: company.companySize,
            businessScale: company.businessScale,
            companyEmail: company.companyEmail,
            companyPhone: company.companyPhone,
            companyInfo: company.companyInfo,
            detailedDescription: company.detailedDescription,
            companyWebsite: company.companyWebsite,
            companyAddress: company.companyAddress,
            companyLinkedIn: company.companyLinkedIn,
            companyTwitter: company.companyTwitter,
            companyInstagram: company.companyInstagram,
            interestedSectors: company.interestedSectors,
            isIncorporated: company.isIncorporated,
            user: company.user.toString(),
            createdAt: company.createdAt,
        };
        res.status(200).json({ success: true, company: companyResponse });
    }
    catch (err) {
        res
            .status(500)
            .json({ success: false, message: "Sunucu hatası", error: err.message });
    }
});
exports.getCompany = getCompany;
// Kullanıcıya ait tüm şirketleri getirme
const getCompaniesForUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.query;
        if (!userId ||
            typeof userId !== "string" ||
            !mongoose_1.default.Types.ObjectId.isValid(userId)) {
            return res
                .status(400)
                .json({ success: false, message: "Geçersiz Kullanıcı ID'si" });
        }
        // Belirtilen kullanıcı ID'sine sahip şirketleri bulma
        const companies = yield Company_1.Company.find({
            user: new mongoose_1.default.Types.ObjectId(userId),
        });
        const companiesResponse = companies.map((company) => ({
            id: company._id,
            companyName: company.companyName,
            companyLogo: company.companyLogo,
            companyType: company.companyType,
            openForInvestments: company.openForInvestments,
            businessModel: company.businessModel,
            companySector: company.companySector,
            companySize: company.companySize,
            businessScale: company.businessScale,
            companyEmail: company.companyEmail,
            companyPhone: company.companyPhone,
            companyInfo: company.companyInfo,
            detailedDescription: company.detailedDescription,
            companyWebsite: company.companyWebsite,
            companyAddress: company.companyAddress,
            companyLinkedIn: company.companyLinkedIn,
            companyTwitter: company.companyTwitter,
            companyInstagram: company.companyInstagram,
            interestedSectors: company.interestedSectors,
            isIncorporated: company.isIncorporated,
            user: company.user.toString(),
            createdAt: company.createdAt,
        }));
        res.status(200).json({ success: true, companies: companiesResponse });
    }
    catch (err) {
        res
            .status(500)
            .json({ success: false, message: "Sunucu hatası", error: err.message });
    }
});
exports.getCompaniesForUser = getCompaniesForUser;
// Şirket bilgilerini güncelleme
const updateCompany = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Token doğrulama
        const token = (_a = req.header("Authorization")) === null || _a === void 0 ? void 0 : _a.replace("Bearer ", "");
        if (!token) {
            return res
                .status(401)
                .json({
                success: false,
                message: "Yetkilendirme başarısız, token bulunamadı",
            });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
        const { id } = req.params;
        let company = yield Company_1.Company.findById(id);
        if (!company) {
            return res
                .status(404)
                .json({ success: false, message: "Şirket bulunamadı" });
        }
        if (company.user.toString() !== userId) {
            return res
                .status(403)
                .json({ success: false, message: "Bu şirket üzerinde yetkiniz yok" });
        }
        const { companyName, companyLogo, companyType, openForInvestments, businessModel, companySector, companySize, businessScale, companyEmail, companyPhone, companyInfo, detailedDescription, companyWebsite, companyAddress, companyLinkedIn, companyTwitter, companyInstagram, interestedSectors, isIncorporated, } = req.body;
        if (companyName)
            company.companyName = companyName;
        if (companyLogo)
            company.companyLogo = companyLogo;
        if (companyType)
            company.companyType = companyType;
        if (openForInvestments !== undefined)
            company.openForInvestments = openForInvestments;
        if (businessModel)
            company.businessModel = businessModel;
        if (companySector)
            company.companySector = companySector;
        if (companySize)
            company.companySize = companySize;
        if (businessScale)
            company.businessScale = businessScale;
        if (companyEmail)
            company.companyEmail = companyEmail;
        if (companyPhone)
            company.companyPhone = companyPhone;
        if (companyInfo)
            company.companyInfo = companyInfo;
        if (detailedDescription)
            company.detailedDescription = detailedDescription;
        if (companyWebsite)
            company.companyWebsite = companyWebsite;
        if (companyAddress)
            company.companyAddress = companyAddress;
        if (companyLinkedIn)
            company.companyLinkedIn = companyLinkedIn;
        if (companyTwitter)
            company.companyTwitter = companyTwitter;
        if (companyInstagram)
            company.companyInstagram = companyInstagram;
        if (interestedSectors)
            company.interestedSectors = interestedSectors;
        if (isIncorporated !== undefined)
            company.isIncorporated = isIncorporated;
        yield company.save();
        const companyResponse = {
            id: company._id,
            companyName: company.companyName,
            companyLogo: company.companyLogo,
            companyType: company.companyType,
            openForInvestments: company.openForInvestments,
            businessModel: company.businessModel,
            companySector: company.companySector,
            companySize: company.companySize,
            businessScale: company.businessScale,
            companyEmail: company.companyEmail,
            companyPhone: company.companyPhone,
            companyInfo: company.companyInfo,
            detailedDescription: company.detailedDescription,
            companyWebsite: company.companyWebsite,
            companyAddress: company.companyAddress,
            companyLinkedIn: company.companyLinkedIn,
            companyTwitter: company.companyTwitter,
            companyInstagram: company.companyInstagram,
            interestedSectors: company.interestedSectors,
            isIncorporated: company.isIncorporated,
            user: company.user.toString(),
            createdAt: company.createdAt,
        };
        res.status(200).json({ success: true, company: companyResponse });
    }
    catch (err) {
        res
            .status(500)
            .json({ success: false, message: "Sunucu hatası", error: err.message });
    }
});
exports.updateCompany = updateCompany;
// Şirket silme
const deleteCompany = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Token doğrulaması
        const token = (_a = req.header("Authorization")) === null || _a === void 0 ? void 0 : _a.replace("Bearer ", "");
        if (!token) {
            return res
                .status(401)
                .json({
                success: false,
                message: "Yetkilendirme başarısız, token bulunamadı",
            });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
        const { id } = req.params;
        const company = yield Company_1.Company.findById(id);
        if (!company) {
            return res
                .status(404)
                .json({ success: false, message: "Şirket bulunamadı" });
        }
        if (company.user.toString() !== userId) {
            return res
                .status(403)
                .json({ success: false, message: "Bu şirket üzerinde yetkiniz yok" });
        }
        // @ts-expect-error - Mongoose'un yeni sürümlerinde remove metodu yerine deleteOne kullanılmalı
        yield company.remove();
        res
            .status(200)
            .json({ success: true, message: "Şirket başarıyla silindi" });
    }
    catch (err) {
        res
            .status(500)
            .json({ success: false, message: "Sunucu hatası", error: err.message });
    }
});
exports.deleteCompany = deleteCompany;
// Video yükleme endpoint'i
const uploadCompanyVideo = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const companyId = req.params.id;
        const company = yield Company_1.Company.findById(companyId);
        if (!company) {
            return res.status(404).json({
                success: false,
                message: "Şirket bulunamadı",
            });
        }
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Lütfen bir video dosyası yükleyin",
            });
        }
        // Video dosya yolunu güncelle
        company.companyVideo = `/uploads/videos/${req.file.filename}`;
        yield company.save();
        res.status(200).json({
            success: true,
            data: company,
            message: "Video başarıyla yüklendi",
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Video yükleme başarısız",
            error: error.message,
        });
    }
});
exports.uploadCompanyVideo = uploadCompanyVideo;
