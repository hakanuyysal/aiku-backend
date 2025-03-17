import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { Server } from 'socket.io';
import http from 'http';
import passport from './config/passport';
import cors from 'cors';

// Firebase yapılandırmasını import et
import './config/firebase';

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
const io = new Server(server, {
  cors: {
    origin: [
      'https://aikuaiplatform.com',
      'https://www.aikuaiplatform.com',
      'http://localhost:3000'
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
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

// CORS için tüm isteklere header ekle
app.use((req, res, next) => {
  const origin = req.headers.origin;
  console.log('İstek origin:', origin);
  console.log('İstek method:', req.method);
  console.log('İstek path:', req.path);
  console.log('İstek headers:', req.headers);
  
  // İzin verilen originler
  const allowedOrigins = [
    'https://aikuaiplatform.com',
    'https://www.aikuaiplatform.com',
    'http://localhost:3000'
  ];
  
  // Origin kontrolü/
  if (origin && allowedOrigins.includes(origin)) {
    console.log('İzin verilen origin listesinde:', origin);
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (origin && origin.endsWith('.aikuaiplatform.com')) {
    console.log('aikuaiplatform.com alt domaini:', origin);
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (origin && (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'))) {
    console.log('Yerel geliştirme ortamı:', origin);
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    console.log('İzin verilmeyen origin:', origin);
    // Varsayılan olarak localhost'a izin ver (geliştirme için)
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
  }
  
  // Diğer CORS başlıkları
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Ayarlanan başlıkları logla
  console.log('Ayarlanan CORS başlıkları:', {
    'Access-Control-Allow-Origin': res.getHeader('Access-Control-Allow-Origin'),
    'Access-Control-Allow-Methods': res.getHeader('Access-Control-Allow-Methods'),
    'Access-Control-Allow-Headers': res.getHeader('Access-Control-Allow-Headers'),
    'Access-Control-Allow-Credentials': res.getHeader('Access-Control-Allow-Credentials')
  });
  
  // OPTIONS istekleri için hemen yanıt ver
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS isteği alındı:', req.headers.origin);
    return res.status(200).json({});
  }
  
  next();
});

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
