"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Upload klasörlerini oluştur
const createUploadDirs = () => {
    const dirs = ['uploads', 'uploads/images', 'uploads/documents'];
    dirs.forEach(dir => {
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
    });
};
createUploadDirs();
// Storage konfigürasyonu
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const fileType = file.mimetype.startsWith('image/') ? 'images' : 'documents';
        cb(null, `uploads/${fileType}`);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${uniqueSuffix}${path_1.default.extname(file.originalname)}`);
    }
});
// Dosya filtreleme
const fileFilter = (req, file, cb) => {
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const allowedDocTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (file.mimetype.startsWith('image/') && allowedImageTypes.includes(file.mimetype)) {
        cb(null, true);
    }
    else if (allowedDocTypes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error('Desteklenmeyen dosya formatı!'));
    }
};
// Multer konfigürasyonu
exports.upload = (0, multer_1.default)({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB
    }
});
