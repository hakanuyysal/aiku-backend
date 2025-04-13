import express from "express";
import { GeminiService, RobotsDisallowedError } from "../services/geminiService";
import { PowerPointService } from "../services/powerPointService";
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
const powerPointService = new PowerPointService();

// Konuşma geçmişini saklamak için hafıza içi depolama
// Not: Ölçeklenebilirlik için gerçek bir projedeki uygulamada veritabanı kullanılmalıdır
interface ChatSession {
  id: string;
  history: Array<{ role: string; content: string }>;
  lastActivity: Date;
}

const chatSessions = new Map<string, ChatSession>();

// Sohbet oturumları için temizleme (24 saattir aktif olmayan oturumları temizle)
const cleanupChatSessions = () => {
  const now = new Date();
  const MAX_IDLE_TIME = 24 * 60 * 60 * 1000; // 24 saat

  chatSessions.forEach((session, id) => {
    if (now.getTime() - session.lastActivity.getTime() > MAX_IDLE_TIME) {
      chatSessions.delete(id);
    }
  });
};

// Her saat temizlik yap
setInterval(cleanupChatSessions, 60 * 60 * 1000);

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
      return res.status(400).json({ error: "URL gerekli" });
    }

    const formData = await geminiService.analyzeWebsite(url);
    res.json(formData);
  } catch (error) {
    if (error instanceof RobotsDisallowedError) {
      res.status(403).json({
        error: "Bu site robots.txt tarafından engellenmiş",
        type: "robots_disallowed",
      });
    } else {
      console.error("Website analysis error:", error);
      res.status(500).json({ error: (error as Error).message });
    }
  }
});

// Web sitesinden slayt oluşturma endpoint'i
router.post("/create-presentation", async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ 
        success: false, 
        error: "URL gerekli" 
      });
    }

    const presentationData = await geminiService.createPresentationFromWebsite(url);
    res.json(presentationData);
  } catch (error) {
    if (error instanceof RobotsDisallowedError) {
      res.status(403).json({
        success: false,
        error: "Bu site robots.txt tarafından engellenmiş",
        type: "robots_disallowed",
      });
    } else {
      console.error("Presentation creation error:", error);
      res.status(500).json({ 
        success: false, 
        error: (error as Error).message 
      });
    }
  }
});

// Web sitesinden PowerPoint oluşturma ve indirme endpoint'i
router.post("/create-powerpoint", async (req, res) => {
  try {
    console.log("PowerPoint oluşturma isteği alındı");
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ 
        success: false, 
        error: "URL gerekli" 
      });
    }

    // URL formatını kontrol et
    try {
      new URL(url); // Geçerli bir URL değilse hata fırlatır
    } catch (urlError) {
      return res.status(400).json({
        success: false,
        error: "Geçersiz URL formatı"
      });
    }

    console.log(`URL alındı: ${url}`);

    try {
      // Önce web sitesinden sunum verileri oluştur
      console.log("Web sitesi taranıyor ve slayt verileri oluşturuluyor...");
      const presentationData = await geminiService.createPresentationFromWebsite(url);
      
      if (!presentationData || !presentationData.slides || presentationData.slides.length === 0) {
        return res.status(500).json({
          success: false,
          error: "Web sitesinden slayt verileri oluşturulamadı"
        });
      }
      
      console.log(`${presentationData.slides.length} slayt oluşturuldu, PowerPoint dosyası oluşturuluyor...`);
      
      // Logo ile ilgili sorunları önlemek için logoUrl'i temizle
      presentationData.logoUrl = null;
      
      // Her slayttan logo özelliğini kaldır
      presentationData.slides = presentationData.slides.map((slide: any) => {
        const { logo, ...rest } = slide;
        return rest;
      });
      
      // Sonra bu verilerden PowerPoint dosyası oluştur
      const pptxFilePath = await powerPointService.createPowerPoint(presentationData);
      
      if (!pptxFilePath || !fs.existsSync(pptxFilePath)) {
        return res.status(500).json({
          success: false,
          error: "PowerPoint dosyası oluşturulamadı veya bulunamadı"
        });
      }
      
      console.log(`PowerPoint oluşturuldu: ${pptxFilePath}`);
      
      // Dosya adını URL'den türet
      const domain = new URL(url).hostname;
      const fileName = `${domain.replace(/[^a-zA-Z0-9]/g, '_')}_presentation.pptx`;
      
      // PowerPoint dosyasını indir
      console.log(`Dosya indiriliyor: ${fileName}`);
      console.log(`Dosya konumu: ${pptxFilePath} (Dosya silinmeyecek, test amaçlı olarak korunuyor)`);
      
      res.download(pptxFilePath, fileName, (err) => {
        if (err) {
          console.error("Dosya indirme hatası:", err);
        }
        
        // İndirme tamamlandıktan sonra yapılacak işlemler
        console.log(`Dosya indirme tamamlandı. Dosya konumunuz: ${pptxFilePath}`);
        
        // Dosyayı silmiyoruz artık
        /* 
        try {
          if (fs.existsSync(pptxFilePath)) {
            fs.unlinkSync(pptxFilePath);
            console.log("Geçici dosya temizlendi");
          }
        } catch (unlinkErr) {
          console.error("Geçici dosyayı silme hatası:", unlinkErr);
        }
        */
      });
    } catch (processingError: unknown) {
      console.error("İşlem hatası:", processingError);
      return res.status(500).json({
        success: false,
        error: processingError instanceof Error ? processingError.message : "PowerPoint oluşturma sırasında beklenmeyen bir hata oluştu"
      });
    }
  } catch (error) {
    if (error instanceof RobotsDisallowedError) {
      console.error("Robots.txt engeli:", error);
      res.status(403).json({
        success: false,
        error: "Bu site robots.txt tarafından engellenmiş",
        type: "robots_disallowed",
      });
    } else {
      console.error("PowerPoint oluşturma hatası:", error);
      res.status(500).json({ 
        success: false, 
        error: (error as Error).message || "Bilinmeyen bir hata oluştu"
      });
    }
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

// Gemini AI ile sohbet
router.post("/chat", async (req, res) => {
  try {
    const { message, sessionId = null } = req.body;
    
    if (!message) {
      return res.status(400).json({ 
        success: false, 
        error: "Mesaj girişi gereklidir" 
      });
    }

    let session: ChatSession;
    
    // Mevcut oturumu kontrol et veya yeni oturum oluştur
    if (sessionId && chatSessions.has(sessionId)) {
      session = chatSessions.get(sessionId)!;
      session.lastActivity = new Date();
    } else {
      // Yeni oturum oluştur
      const newSessionId = Date.now().toString(36) + Math.random().toString(36).substring(2);
      session = {
        id: newSessionId,
        history: [],
        lastActivity: new Date()
      };
      chatSessions.set(newSessionId, session);
    }

    console.log(`Sohbet mesajı alındı, Oturum ID: ${session.id}`);
    
    // Gemini ile sohbet et
    const chatResponse = await geminiService.chat(message, session.history);
    
    // Oturum geçmişini güncelle
    session.history = chatResponse.conversationHistory;
    
    // Yanıtı döndür
    res.json({
      success: true,
      sessionId: session.id,
      response: chatResponse.response,
      // İsteğe bağlı olarak UI için kullanılabilecek tam geçmiş
      conversation: session.history
    });
    
  } catch (error) {
    console.error("Sohbet hatası:", error);
    res.status(500).json({ 
      success: false, 
      error: (error as Error).message || "Bilinmeyen bir sohbet hatası oluştu" 
    });
  }
});

export default router;
