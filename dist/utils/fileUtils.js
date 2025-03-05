"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFile = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Dosya silme işlemi
const deleteFile = (fileUrl) => {
    if (!fileUrl)
        return;
    try {
        const filePath = path_1.default.join(__dirname, '../../', fileUrl);
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
        }
    }
    catch (error) {
        console.error('Dosya silme hatası:', error);
    }
};
exports.deleteFile = deleteFile;
