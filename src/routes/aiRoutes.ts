import express from 'express';
import { GeminiService } from '../services/geminiService';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import mammoth from 'mammoth';

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
    } else {
      // Normal text dosyası olarak oku
      return fs.readFileSync(file.path, 'utf-8');
    }
  } finally {
    // Dosyayı sil
    try {
      fs.unlinkSync(file.path);
    } catch (error) {
      console.error('Dosya silinirken hata:', error);
    }
  }
}

// Döküman analizi
router.post('/analyze-document', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Dosya yüklenmedi' });
    }

    // Dosya içeriğini oku
    const documentText = await readFileContent(req.file);
    console.log('Dosya içeriği:', documentText); // Debug için
    
    // Analiz et
    const formData = await geminiService.analyzeDocument(documentText);
    res.json(formData);
  } catch (error) {
    console.error('Döküman analizi hatası:', error);
    res.status(500).json({ error: 'Döküman analizi sırasında bir hata oluştu' });
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