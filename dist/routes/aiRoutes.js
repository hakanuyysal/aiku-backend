"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const geminiService_1 = require("../services/geminiService");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const mammoth_1 = __importDefault(require("mammoth"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const textract_1 = __importDefault(require("textract"));
const XLSX = __importStar(require("xlsx"));
const child_process_1 = require("child_process");
const router = express_1.default.Router();
const geminiService = new geminiService_1.GeminiService();
// Textract konfigürasyonu
const textractConfig = {
    preserveLineBreaks: true,
    preserveOnlyMultipleLineBreaks: true,
    includeAltText: true,
};
// macOS textutil wrapper
function convertPagesWithTextutil(filePath) {
    return new Promise((resolve, reject) => {
        // Geçici txt dosyası oluştur
        const outputPath = filePath + ".txt";
        // textutil komutu ile pages dosyasını txt'ye çevir
        (0, child_process_1.exec)(`textutil -convert txt -output "${outputPath}" "${filePath}"`, (error) => {
            if (error) {
                reject(new Error("Pages dosyası dönüştürülemedi: " + error.message));
                return;
            }
            // Oluşturulan txt dosyasını oku
            try {
                const content = fs_1.default.readFileSync(outputPath, "utf-8");
                // Geçici txt dosyasını sil
                fs_1.default.unlinkSync(outputPath);
                resolve(content);
            }
            catch (readError) {
                reject(new Error("Dönüştürülen dosya okunamadı: " + readError.message));
            }
        });
    });
}
// Textract promise wrapper
function extractTextFromFile(filePath) {
    return new Promise((resolve, reject) => {
        textract_1.default.fromFileWithPath(filePath, textractConfig, (error, text) => {
            if (error) {
                reject(error);
            }
            else {
                resolve(text);
            }
        });
    });
}
// Desteklenen dosya uzantıları
const SUPPORTED_EXTENSIONS = [
    ".txt",
    ".doc",
    ".docx",
    ".pdf",
    ".pages",
    ".rtf",
    ".odt",
    ".xlsx",
    ".xls",
    ".csv",
    ".pptx",
    ".ppt",
    ".numbers",
    ".key",
];
// Dosya yükleme için multer konfigürasyonu
const storage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        // uploads/documents klasörünü oluştur
        const dir = "uploads/documents";
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path_1.default.extname(file.originalname));
    },
});
const fileFilter = (req, file, cb) => {
    const ext = path_1.default.extname(file.originalname).toLowerCase();
    if (SUPPORTED_EXTENSIONS.includes(ext)) {
        cb(null, true);
    }
    else {
        cb(new Error("Desteklenmeyen dosya formatı. Desteklenen formatlar: " +
            SUPPORTED_EXTENSIONS.join(", ")));
    }
};
const upload = (0, multer_1.default)({
    storage: storage,
    fileFilter: fileFilter,
});
// Excel dosyasını text'e çevirme fonksiyonu
function excelToText(filePath) {
    const workbook = XLSX.readFile(filePath);
    let text = "";
    // Tüm sayfaları işle
    workbook.SheetNames.forEach((sheetName) => {
        const worksheet = workbook.Sheets[sheetName];
        const sheetText = XLSX.utils.sheet_to_txt(worksheet);
        text += `Sheet: ${sheetName}\n${sheetText}\n\n`;
    });
    return text;
}
// Dosya içeriğini okuma fonksiyonu
function readFileContent(file) {
    return __awaiter(this, void 0, void 0, function* () {
        const ext = path_1.default.extname(file.path).toLowerCase();
        try {
            switch (ext) {
                case ".docx":
                    const result = yield mammoth_1.default.extractRawText({ path: file.path });
                    return result.value;
                case ".pdf":
                    const dataBuffer = fs_1.default.readFileSync(file.path);
                    const pdfData = yield (0, pdf_parse_1.default)(dataBuffer);
                    return pdfData.text;
                case ".xlsx":
                case ".xls":
                case ".numbers":
                    return excelToText(file.path);
                case ".txt":
                case ".csv":
                    return fs_1.default.readFileSync(file.path, "utf-8");
                case ".pages":
                    try {
                        // macOS textutil kullan
                        return yield convertPagesWithTextutil(file.path);
                    }
                    catch (error) {
                        console.error("Pages conversion error:", error);
                        // Eğer textutil başarısız olursa textract'ı dene
                        try {
                            return yield extractTextFromFile(file.path);
                        }
                        catch (textractError) {
                            console.error("Textract error:", textractError);
                            throw new Error(`Pages dosyası okunamadı. Lütfen dosyayı PDF veya Word formatına dönüştürüp tekrar deneyin.`);
                        }
                    }
                // Diğer formatlar için textract kullan
                case ".key":
                case ".rtf":
                case ".odt":
                case ".doc":
                case ".pptx":
                case ".ppt":
                    try {
                        const text = yield extractTextFromFile(file.path);
                        return text;
                    }
                    catch (error) {
                        console.error("Textract error:", error);
                        throw new Error(`Dosya içeriği okunamadı: ${ext}`);
                    }
                default:
                    throw new Error(`Desteklenmeyen dosya formatı: ${ext}`);
            }
        }
        finally {
            // Dosyayı sil
            try {
                fs_1.default.unlinkSync(file.path);
            }
            catch (error) {
                console.error("File deletion error:", error);
            }
        }
    });
}
// Döküman analizi
router.post("/analyze-document", upload.single("document"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }
        try {
            // Dosya içeriğini oku
            const documentText = yield readFileContent(req.file);
            console.log("File content:", documentText); // Debug için
            // Analiz et
            const formData = yield geminiService.analyzeDocument(documentText);
            res.json(formData);
        }
        catch (error) {
            const err = error;
            console.error("File processing error:", err);
            res.status(400).json({
                error: "File processing error",
                details: err.message,
            });
        }
    }
    catch (error) {
        console.error("Document analysis error:", error);
        res.status(500).json({ error: "Error during document analysis" });
    }
}));
// Website analizi
router.post("/analyze-website", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ error: "URL is required" });
        }
        const formData = yield geminiService.analyzeWebsite(url);
        res.json(formData);
    }
    catch (error) {
        console.error("Website analysis error:", error);
        res.status(500).json({ error: "Error during website analysis" });
    }
}));
// LinkedIn analizi
router.post("/analyze-linkedin", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { linkedInData } = req.body;
        if (!linkedInData) {
            return res.status(400).json({ error: "LinkedIn data is required" });
        }
        const formData = yield geminiService.analyzeLinkedIn(linkedInData);
        res.json(formData);
    }
    catch (error) {
        console.error("LinkedIn analysis error:", error);
        res.status(500).json({ error: "Error during LinkedIn analysis" });
    }
}));
exports.default = router;
