const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Route'ları import et
const authRoutes = require('./routes/authRoutes');

// Env değişkenlerini yükle
dotenv.config();

// Express uygulamasını oluştur
const app = express();

// Middleware'leri ekle
app.use(express.json());
app.use(cors());

// MongoDB bağlantısı
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB bağlantısı başarılı'))
  .catch((err) => console.log('MongoDB bağlantı hatası:', err));

// Route'ları ekle
app.use('/api/auth', authRoutes);

// Ana route
app.get('/', (req, res) => {
  res.json({ message: 'AIKU API çalışıyor' });
});

// Port ayarı
const PORT = process.env.PORT || 3000;

// Sunucuyu başlat
app.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda çalışıyor`);
}); 