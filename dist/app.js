"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const socket_io_1 = require("socket.io");
const http_1 = __importDefault(require("http"));
const passport_1 = __importDefault(require("./config/passport"));
const cors_1 = __importDefault(require("cors"));
// Route'ları import et
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const companyRoutes_1 = __importDefault(require("./routes/companyRoutes"));
const productRoutes_1 = __importDefault(require("./routes/productRoutes"));
const teamMemberRoutes_1 = __importDefault(require("./routes/teamMemberRoutes"));
const uploadRoutes_1 = __importDefault(require("./routes/uploadRoutes"));
const aiRoutes_1 = __importDefault(require("./routes/aiRoutes"));
const cardRoutes_1 = __importDefault(require("./routes/cardRoutes"));
const paymentRoutes_1 = __importDefault(require("./routes/paymentRoutes"));
const linkedInRoutes_1 = __importDefault(require("./routes/linkedInRoutes"));
const subscriptionRoutes_1 = __importDefault(require("./routes/subscriptionRoutes"));
const applicantRoutes_1 = __importDefault(require("./routes/applicantRoutes"));
const investmentRoutes_1 = __importDefault(require("./routes/investmentRoutes"));
const linkedinAuth_routes_1 = __importDefault(require("./routes/linkedinAuth.routes"));
const supabaseAuth_routes_1 = __importDefault(require("./routes/supabaseAuth.routes"));
const chatRoutes_1 = __importDefault(require("./routes/chatRoutes"));
// Env değişkenlerini yükle
dotenv_1.default.config();
// Express uygulamasını oluştur
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
// CORS için izin verilen domainler
const whitelist = [
    'https://aikuaiplatform.com',
    'https://www.aikuaiplatform.com',
    'https://api.aikuaiplatform.com',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3004',
    'http://127.0.0.1:5500',
    'https://bevakpqfycmxnpzrkecv.supabase.co'
];
// Socket.io sunucusunu oluştur
const io = new socket_io_1.Server(server, {
    cors: {
        origin: "*", // Tüm kaynaklara izin ver (geliştirme için)
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        credentials: true,
        allowedHeaders: ["Content-Type", "Authorization"]
    },
    allowEIO3: true, // Engine.IO 3 uyumluluğu
    transports: ['websocket', 'polling'] // Önce WebSocket, sonra polling dene
});
exports.io = io;
// Socket.io bağlantılarını yönet
io.on('connection', (socket) => {
    console.log('👋 Yeni bir kullanıcı bağlandı:', socket.id);
    // Şirket id'sine göre chat odası katılımı
    socket.on('join-company-chat', (companyId) => {
        socket.join(`company-${companyId}`);
        console.log(`🏢 ${socket.id} kullanıcısı ${companyId} şirket odasına katıldı`);
    });
    // Sohbet oturum id'sine göre chat odası katılımı
    socket.on('join-chat-session', (chatSessionId) => {
        socket.join(`chat-${chatSessionId}`);
        console.log(`💬 ${socket.id} kullanıcısı ${chatSessionId} sohbet odasına katıldı`);
    });
    // Özel chat odalarından ayrılma
    socket.on('leave-company-chat', (companyId) => {
        socket.leave(`company-${companyId}`);
        console.log(`🚪 ${socket.id} kullanıcısı ${companyId} şirket odasından ayrıldı`);
    });
    socket.on('leave-chat-session', (chatSessionId) => {
        socket.leave(`chat-${chatSessionId}`);
        console.log(`🚪 ${socket.id} kullanıcısı ${chatSessionId} sohbet odasından ayrıldı`);
    });
    // Bağlantı kesildiğinde
    socket.on('disconnect', () => {
        console.log('👋 Bir kullanıcı ayrıldı:', socket.id);
    });
});
// CORS origin kontrolü için fonksiyon
const corsOriginCheck = (origin, callback) => {
    console.log('🔒 CORS isteği origin:', origin);
    // Development ortamında tüm originlere izin ver
    if (process.env.NODE_ENV === 'development') {
        console.log('💻 Development modu: Tüm CORS isteklerine izin veriliyor');
        callback(null, true);
        return;
    }
    // Origin yoksa (örn. aynı origin'den istek veya Postman gibi araçlar)
    if (!origin) {
        callback(null, true);
        return;
    }
    // Tam eşleşme kontrolü
    if (whitelist.includes(origin)) {
        callback(null, true);
        return;
    }
    // Wildcard subdomain kontrolü
    const isAikuDomain = origin.match(/^https:\/\/([a-zA-Z0-9-]+\.)?aikuaiplatform\.com$/);
    if (isAikuDomain) {
        callback(null, true);
        return;
    }
    // Localhost ve 127.0.0.1 için port kontrolünü gevşet (development için)
    const localDevRegex = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/;
    if (localDevRegex.test(origin)) {
        console.log('🧪 Yerel test origin\'i kabul edildi:', origin);
        callback(null, true);
        return;
    }
    // Diğer tüm istekleri reddet
    console.log(`⛔ CORS engellendi: ${origin}`);
    callback(new Error('CORS politikası tarafından engellendi'));
};
// CORS ayarları
const corsOptions = {
    origin: corsOriginCheck,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Origin', 'Accept'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: 86400 // Preflight sonuçlarını 24 saat önbelleğe al
};
// Body parsing middleware'lerini ekle
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// CORS middleware'ini ekle
app.use((0, cors_1.default)(corsOptions));
// CORS hata yakalama middleware'i
app.use((err, req, res, next) => {
    if (err.name === 'CORSError') {
        console.error('❌ CORS Hatası:', err.message);
        return res.status(403).json({
            success: false,
            message: 'CORS hatası: İstek engellendi',
            error: err.message
        });
    }
    next(err);
});
// OPTIONS istekleri için özel işleyici
app.options('*', (0, cors_1.default)(corsOptions));
// İstek loglaması için middleware
app.use((req, res, next) => {
    const origin = req.headers.origin || '';
    const method = req.method;
    const url = req.url;
    // İstek loglaması
    console.log(`🔄 İstek - Origin: ${origin}, Method: ${method}, URL: ${url}`);
    // CORS başlıklarını kontrol et ve logla
    const corsHeaders = {
        'Access-Control-Allow-Origin': res.getHeader('Access-Control-Allow-Origin'),
        'Access-Control-Allow-Methods': res.getHeader('Access-Control-Allow-Methods'),
        'Access-Control-Allow-Headers': res.getHeader('Access-Control-Allow-Headers'),
        'Access-Control-Allow-Credentials': res.getHeader('Access-Control-Allow-Credentials')
    };
    console.log('🔑 CORS Başlıkları:', corsHeaders);
    next();
});
// Test için Google OAuth sayfasıa
app.get("/test-google-auth", (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Google OAuth Test</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        .btn {
          display: inline-block;
          background: #4285F4;
          color: white;
          padding: 10px 20px;
          border-radius: 4px;
          text-decoration: none;
          margin: 10px 0;
        }
        .card {
          border: 1px solid #ddd;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        pre {
          background: #f5f5f5;
          padding: 10px;
          border-radius: 4px;
          overflow-x: auto;
        }
      </style>
      <script src="https://accounts.google.com/gsi/client" async defer></script>
    </head>
    <body>
      <h1>Google OAuth Test</h1>
      
      <div class="card">
        <h2>Passport.js OAuth Akışı</h2>
        <p>Bu test, sunucu tarafı Google OAuth akışını başlatır.</p>
        <a href="/api/auth/google" class="btn">Google ile Giriş Yap (Passport.js)</a>
      </div>

      <div class="card">
        <h2>Google Identity API Akışı</h2>
        <p>Bu test, Google Identity API kullanarak client-side kimlik doğrulama yapar.</p>
        <div id="g_id_onload"
             data-client_id="${process.env.GOOGLE_CLIENT_ID}"
             data-callback="handleCredentialResponse"
             data-auto_prompt="false">
        </div>
        <div class="g_id_signin"
             data-type="standard"
             data-size="large"
             data-theme="outline"
             data-text="sign_in_with"
             data-shape="rectangular"
             data-logo_alignment="left">
        </div>
      </div>

      <div class="card">
        <h2>Google Identity API Manuel</h2>
        <button id="googleLoginBtn" class="btn">Google ile Giriş (Manuel)</button>
      </div>

      <div class="card">
        <h2>Sonuç</h2>
        <pre id="result">Henüz işlem yapılmadı.</pre>
      </div>

      <div class="card">
        <h2>API Bilgileri</h2>
        <p>Client ID: ${process.env.GOOGLE_CLIENT_ID}</p>
        <p>Callback URL: ${process.env.API_URL}/api/auth/google/callback</p>
      </div>

      <div class="card">
        <h2>Yardım</h2>
        <p>Eğer test başarısız olursa:</p>
        <ol>
          <li>Google Cloud Console'da OAuth onaylı yönlendirme URI'larınızı kontrol edin</li>
          <li>Server loglarını kontrol edin</li>
          <li>.env dosyasında doğru API URL'leri olduğundan emin olun</li>
        </ol>
      </div>

      <script>
        // Google Identity API için callback
        function handleCredentialResponse(response) {
          console.log("Google Token:", response.credential);
          document.getElementById('result').textContent = 'ID Token alındı. Sunucuya gönderiliyor...';
          
          // Sunucuya token'ı gönder
          fetch('/api/auth/google/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ idToken: response.credential }),
          })
          .then(response => response.json())
          .then(data => {
            console.log("Sunucu yanıtı:", data);
            document.getElementById('result').textContent = 
              'Giriş başarılı!\n\n' + JSON.stringify(data, null, 2);
          })
          .catch(error => {
            console.error('Hata:', error);
            document.getElementById('result').textContent = 
              'Hata oluştu: ' + error.message;
          });
        }

        // Manuel Google Login butonu
        document.getElementById('googleLoginBtn').addEventListener('click', () => {
          // Google OAuth popup açma
          const width = 500;
          const height = 600;
          const left = window.screenX + (window.outerWidth - width) / 2;
          const top = window.screenY + (window.outerHeight - height) / 2.5;
          
          const popup = window.open(
            '/api/auth/google',
            'GooglePopup',
            \`width=\${width},height=\${height},left=\${left},top=\${top}\`
          );
          
          // Popup kapandığında işlem yapmak için
          const checkPopup = setInterval(() => {
            if (!popup || popup.closed) {
              clearInterval(checkPopup);
              document.getElementById('result').textContent = 
                'Popup kapatıldı. Sonuç bekleniyor...';
            }
          }, 1000);
        });
      </script>
    </body>
    </html>
  `);
});
// Hata yakalama middleware'i
app.use((err, req, res, next) => {
    console.error("❌ Sunucu Hatası:", err);
    res.status(err.status || 500).json({
        message: err.message || "Sunucu hatası",
        error: process.env.NODE_ENV === "development" ? err : {},
    });
});
// Passport middleware
app.use(passport_1.default.initialize());
// Statik dosya servisi
app.use("/uploads", express_1.default.static(path_1.default.join(__dirname, "../uploads")));
// Socket.io test için statik sayfa servisi
app.use("/test", express_1.default.static(path_1.default.join(__dirname, "../test")));
// Socket.io test sayfası
app.get("/socket-test", (_req, res) => {
    res.sendFile(path_1.default.join(__dirname, "../test/socket-test.html"));
});
// MongoDB bağlantısı
mongoose_1.default
    .connect(process.env.MONGODB_URI)
    .then(() => console.log("✅ MongoDB bağlantısı başarılı"))
    .catch((err) => console.log("❌ MongoDB bağlantı hatası:", err));
// Route'ları ekle
app.use("/api/auth", authRoutes_1.default);
app.use("/api/company", companyRoutes_1.default);
app.use("/api/product", productRoutes_1.default);
app.use("/api/team-members", teamMemberRoutes_1.default);
app.use("/api/upload", uploadRoutes_1.default);
app.use("/api/ai", aiRoutes_1.default);
app.use("/api", linkedInRoutes_1.default);
app.use("/api/cards", cardRoutes_1.default);
app.use("/api/payments", paymentRoutes_1.default);
app.use("/api/subscriptions", subscriptionRoutes_1.default);
app.use("/api/applicants", applicantRoutes_1.default);
app.use("/api/investments", investmentRoutes_1.default);
app.use("/api", linkedinAuth_routes_1.default);
app.use("/api", supabaseAuth_routes_1.default);
app.use("/api/chat", chatRoutes_1.default);
// Ana route
app.get("/", (_req, res) => {
    res.json({ message: "🚀 AIKU API çalışıyor" });
});
// Port ayarı
const PORT = process.env.PORT || 3004;
// Sunucuyu başlat
server.listen(PORT, () => {
    console.log(`🚀 Sunucu ${PORT} portunda çalışıyor`);
    console.log("✅ Socket.IO sistemi aktif");
});
