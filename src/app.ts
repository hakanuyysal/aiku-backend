import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { Server } from 'socket.io';
import http from 'http';
import passport from './config/passport';
import cors from 'cors';

// Route'ları import et
import authRoutes from './routes/authRoutes';
import companyRoutes from './routes/companyRoutes';
import productRoutes from './routes/productRoutes';
import teamMemberRoutes from './routes/teamMemberRoutes';
import uploadRoutes from './routes/uploadRoutes';
import aiRoutes from './routes/aiRoutes';
import cardRoutes from './routes/cardRoutes';
import paymentRoutes from './routes/paymentRoutes';
import linkedInRoutes from './routes/linkedInRoutes';
import subscriptionRoutes from './routes/subscriptionRoutes';
import applicantRoutes from './routes/applicantRoutes';

// Env değişkenlerini yükle
dotenv.config();

// Express uygulamasını oluştur
const app = express();
const server = http.createServer(app);

// Socket.IO kurulumu
const io = new Server(server);

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

// CORS middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Passport middleware
app.use(passport.initialize());

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
app.use('/api/cards', cardRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/applicants', applicantRoutes);

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
