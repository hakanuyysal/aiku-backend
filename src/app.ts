import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

// Route'ları import et
import authRoutes from './routes/authRoutes';
import companyRoutes from './routes/companyRoutes'; 

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

// MongoDB bağlantısı
mongoose.connect(process.env.MONGODB_URI!)
  .then(() => console.log('MongoDB bağlantısı başarılı'))
  .catch((err) => console.log('MongoDB bağlantı hatası:', err));

// Route'ları ekle
app.use('/api/auth', authRoutes);
app.use('/api/company', companyRoutes);

// Ana route
app.get('/', (_req: Request, res: Response) => {
  res.json({ message: 'AIKU API çalışıyor' });
});

// Port ayarı
const PORT = process.env.PORT || 5000;

// Sunucuyu başlat
app.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda çalışıyor`);
}); 