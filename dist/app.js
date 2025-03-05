"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Route'ları import et
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const companyRoutes_1 = __importDefault(require("./routes/companyRoutes"));
const productRoutes_1 = __importDefault(require("./routes/productRoutes")); // Product routes eklendi
const uploadRoutes_1 = __importDefault(require("./routes/uploadRoutes"));
// Env değişkenlerini yükle
dotenv_1.default.config();
// Express uygulamasını oluştur
const app = (0, express_1.default)();
// Middleware'leri ekle
app.use(express_1.default.json());
app.use((0, cors_1.default)({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
}));
// Statik dosya servisi
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
// MongoDB bağlantısı
mongoose_1.default.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ MongoDB bağlantısı başarılı'))
    .catch((err) => console.log('❌ MongoDB bağlantı hatası:', err));
// Route'ları ekle
app.use('/api/auth', authRoutes_1.default);
app.use('/api/company', companyRoutes_1.default);
app.use('/api/product', productRoutes_1.default);
app.use('/api/upload', uploadRoutes_1.default);
// Ana route
app.get('/', (_req, res) => {
    res.json({ message: '🚀 AIKU API çalışıyor' });
});
// Port ayarı
const PORT = process.env.PORT || 3004;
// Sunucuyu başlat
app.listen(PORT, () => {
    console.log(`🚀 Sunucu ${PORT} portunda çalışıyor`);
});
