import express from 'express';
import { GeminiService } from '../services/geminiService';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';

const router = express.Router();
const geminiService = new GeminiService();

// Dosya yükleme için multer konfigürasyonu
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/documents');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Dosya içeriğini okuma fonksiyonu
async function readFileContent(file: Express.Multer.File): Promise<string> {
  const ext = path.extname(file.path).toLowerCase();
  
  try {
    if (ext === '.docx') {
      // DOCX dosyasını text'e çevir
      const result = await mammoth.extractRawText({ path: file.path });
      return result.value;
    } else if (ext === '.pdf') {
      // PDF dosyasını text'e çevir
      const dataBuffer = fs.readFileSync(file.path);
      const data = await pdfParse(dataBuffer);
      return data.text;
    } else {
      // Normal text dosyası olarak oku
      return fs.readFileSync(file.path, 'utf-8');
    }
  } finally {
    // Dosyayı sil
    try {
      fs.unlinkSync(file.path);
    } catch (error) {
      console.error('File deletion error:', error);
    }
  }
}

// Döküman analizi
router.post('/analyze-document', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Dosya içeriğini oku
    const documentText = await readFileContent(req.file);
    console.log('File content:', documentText); // Debug için
    
    // Analiz et
    const formData = await geminiService.analyzeDocument(documentText);
    res.json(formData);
  } catch (error) {
    console.error('Document analysis error:', error);
    res.status(500).json({ error: 'Error during document analysis' });
  }
});

// Website analizi
router.post('/analyze-website', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL gerekli' });
    }

    const formData = await geminiService.analyzeWebsite(url);
    res.json(formData);
  } catch (error) {
    res.status(500).json({ error: 'Website analizi sırasında bir hata oluştu' });
  }
});

// LinkedIn analizi
router.post('/analyze-linkedin', async (req, res) => {
  try {
    const { linkedInData } = req.body;
    if (!linkedInData) {
      return res.status(400).json({ error: 'LinkedIn verisi gerekli' });
    }

    const formData = await geminiService.analyzeLinkedIn(linkedInData);
    res.json(formData);
  } catch (error) {
    res.status(500).json({ error: 'LinkedIn analizi sırasında bir hata oluştu' });
  }
});

export default router; 