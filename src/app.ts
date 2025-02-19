import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

// Route'ları import et
import authRoutes from './routes/authRoutes';

// Env değişkenlerini yükle
dotenv.config();

// Express uygulamasını oluştur
const app = express();

// Middleware'leri ekle
app.use(express.json());
app.use(cors());

// MongoDB bağlantısı
mongoose.connect(process.env.MONGODB_URI!)
  .then(() => console.log('MongoDB bağlantısı başarılı'))
  .catch((err) => console.log('MongoDB bağlantı hatası:', err));

// Route'ları ekle
app.use('/api/auth', authRoutes);

// Ana route
app.get('/', (_req: Request, res: Response) => {
  res.json({ message: 'AIKU API çalışıyor' });
});

// Port ayarı
const PORT = process.env.PORT || 3000;

// Sunucuyu başlat
app.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda çalışıyor`);
}); 