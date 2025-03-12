import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { Server } from 'socket.io';
import http from 'http';

// Route'ları import et
import authRoutes from './routes/authRoutes';
import companyRoutes from './routes/companyRoutes';
import productRoutes from './routes/productRoutes';
import teamMemberRoutes from './routes/teamMemberRoutes';
import uploadRoutes from './routes/uploadRoutes';
import aiRoutes from './routes/aiRoutes';
import linkedInRoutes from './routes/linkedInRoutes';

// Env değişkenlerini yükle
dotenv.config();

// Express uygulamasını oluştur
const app = express();
const server = http.createServer(app);

// Socket.IO kurulumu
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  },
});

// Socket.IO olaylarını dinle
io.on('connection', (socket) => {
  console.log('👤 Yeni kullanıcı bağlandı');

  socket.on('send_message', (message) => {
    console.log('📨 Mesaj alındı:', message);
    io.emit('receive_message', message);
  });

  socket.on('disconnect', () => {
    console.log('👋 Kullanıcı ayrıldı');
  });
});

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
app.use('/api/team-members', teamMemberRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api', linkedInRoutes);

// Ana route
app.get('/', (_req: Request, res: Response) => {
  res.json({ message: '🚀 AIKU API çalışıyor' });
});

// Port ayarı
const PORT = process.env.PORT || 3004;

// Sunucuyu başlat
server.listen(PORT, () => {
  console.log(`🚀 Sunucu ${PORT} portunda çalışıyor`);
  console.log('✅ Socket.IO sistemi aktif');
});
