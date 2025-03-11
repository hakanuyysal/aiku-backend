import express from "express";
import { GeminiService } from "../services/geminiService";
import multer from "multer";
import path from "path";
import fs from "fs";
import mammoth from "mammoth";
import pdfParse from "pdf-parse";
import textract from "textract";
import { promisify } from "util";
import { Document } from "docx";
import * as XLSX from "xlsx";
import { exec } from "child_process";

const router = express.Router();
const geminiService = new GeminiService();

// Textract konfigürasyonu
const textractConfig = {
  preserveLineBreaks: true,
  preserveOnlyMultipleLineBreaks: true,
  includeAltText: true,
};

// macOS textutil wrapper
function convertPagesWithTextutil(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Geçici txt dosyası oluştur
    const outputPath = filePath + ".txt";

    // textutil komutu ile pages dosyasını txt'ye çevir
    exec(
      `textutil -convert txt -output "${outputPath}" "${filePath}"`,
      (error) => {
        if (error) {
          reject(new Error("Pages dosyası dönüştürülemedi: " + error.message));
          return;
        }

        // Oluşturulan txt dosyasını oku
        try {
          const content = fs.readFileSync(outputPath, "utf-8");
          // Geçici txt dosyasını sil
          fs.unlinkSync(outputPath);
          resolve(content);
        } catch (readError: unknown) {
          reject(
            new Error("Dönüştürülen dosya okunamadı: " + (readError as Error).message)
          );
        }
      }
    );
  });
}

// Textract promise wrapper
function extractTextFromFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    textract.fromFileWithPath(filePath, textractConfig, (error, text) => {
      if (error) {
        reject(error);
      } else {
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

// Error interface'i ekle
interface FileProcessingError extends Error {
  message: string;
}

// Dosya yükleme için multer konfigürasyonu
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // uploads/documents klasörünü oluştur
    const dir = "uploads/documents";
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (SUPPORTED_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Desteklenmeyen dosya formatı. Desteklenen formatlar: " +
          SUPPORTED_EXTENSIONS.join(", ")
      )
    );
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
});

// Excel dosyasını text'e çevirme fonksiyonu
function excelToText(filePath: string): string {
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
async function readFileContent(file: Express.Multer.File): Promise<string> {
  const ext = path.extname(file.path).toLowerCase();

  try {
    switch (ext) {
      case ".docx":
        const result = await mammoth.extractRawText({ path: file.path });
        return result.value;

      case ".pdf":
        const dataBuffer = fs.readFileSync(file.path);
        const pdfData = await pdfParse(dataBuffer);
        return pdfData.text;

      case ".xlsx":
      case ".xls":
      case ".numbers":
        return excelToText(file.path);

      case ".txt":
      case ".csv":
        return fs.readFileSync(file.path, "utf-8");

      case ".pages":
        try {
          // macOS textutil kullan
          return await convertPagesWithTextutil(file.path);
        } catch (error) {
          console.error("Pages conversion error:", error);
          // Eğer textutil başarısız olursa textract'ı dene
          try {
            return await extractTextFromFile(file.path);
          } catch (textractError) {
            console.error("Textract error:", textractError);
            throw new Error(
              `Pages dosyası okunamadı. Lütfen dosyayı PDF veya Word formatına dönüştürüp tekrar deneyin.`
            );
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
          const text = await extractTextFromFile(file.path);
          return text;
        } catch (error) {
          console.error("Textract error:", error);
          throw new Error(`Dosya içeriği okunamadı: ${ext}`);
        }

      default:
        throw new Error(`Desteklenmeyen dosya formatı: ${ext}`);
    }
  } finally {
    // Dosyayı sil
    try {
      fs.unlinkSync(file.path);
    } catch (error) {
      console.error("File deletion error:", error);
    }
  }
}

// Döküman analizi
router.post(
  "/analyze-document",
  upload.single("document"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      try {
        // Dosya içeriğini oku
        const documentText = await readFileContent(req.file);
        console.log("File content:", documentText); // Debug için

        // Analiz et
        const formData = await geminiService.analyzeDocument(documentText);
        res.json(formData);
      } catch (error) {
        const err = error as FileProcessingError;
        console.error("File processing error:", err);
        res.status(400).json({
          error: "File processing error",
          details: err.message,
        });
      }
    } catch (error) {
      console.error("Document analysis error:", error);
      res.status(500).json({ error: "Error during document analysis" });
    }
  }
);

// Website analizi
router.post("/analyze-website", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }
    const formData = await geminiService.analyzeWebsite(url);
    res.json(formData);
  } catch (error) {
    console.error("Website analysis error:", error);
    res.status(500).json({ error: "Error during website analysis" });
  }
});

// LinkedIn analizi
router.post("/analyze-linkedin", async (req, res) => {
  try {
    const { linkedInData } = req.body;
    if (!linkedInData) {
      return res.status(400).json({ error: "LinkedIn data is required" });
    }
    const formData = await geminiService.analyzeLinkedIn(linkedInData);
    res.json(formData);
  } catch (error) {
    console.error("LinkedIn analysis error:", error);
    res.status(500).json({ error: "Error during LinkedIn analysis" });
  }
});

export default router;
