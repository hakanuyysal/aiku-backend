"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
// Video yükleme için depolama konfigürasyonu
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/videos');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
// Sadece video dosyalarını kabul et
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo'];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error('Desteklenmeyen dosya formatı. Lütfen geçerli bir video dosyası yükleyin.'));
    }
};
// Video yükleme için multer konfigürasyonu
const videoUpload = (0, multer_1.default)({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 100 * 1024 * 1024, // maksimum 100MB
    }
});
exports.default = videoUpload;
