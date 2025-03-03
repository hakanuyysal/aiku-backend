import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Route'ları import et
import authRoutes from './routes/authRoutes';
import companyRoutes from './routes/companyRoutes';
import productRoutes from './routes/productRoutes'; // Product routes eklendi
import uploadRoutes from './routes/uploadRoutes';

// Env değişkenlerini yükle
dotenv.config();

// Express uygulamasını oluştur
const app = express();

// Middleware'leri ekle
app.use(express.json());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);

// Statik dosya servisi
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// MongoDB bağlantısı
mongoose.connect(process.env.MONGODB_URI!)
  .then(() => console.log('✅ MongoDB bağlantısı başarılı'))
  .catch((err) => console.log('❌ MongoDB bağlantı hatası:', err));

// Route'ları ekle
app.use('/api/auth', authRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/product', productRoutes); 
app.use('/api/upload', uploadRoutes);

// Ana route
app.get('/', (_req: Request, res: Response) => {
  res.json({ message: '🚀 AIKU API çalışıyor' });
});

// Port ayarı
const PORT = process.env.PORT || 3004;

// Sunucuyu başlat
app.listen(PORT, () => {
  console.log(`🚀 Sunucu ${PORT} portunda çalışıyor`);
});
