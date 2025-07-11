"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = exports.userStatusService = void 0;
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const socket_io_1 = require("socket.io");
const http_1 = __importDefault(require("http"));
const passport_1 = __importDefault(require("./config/passport"));
const cors_1 = __importDefault(require("cors"));
const logger_1 = __importDefault(require("./config/logger"));
const httpLogger_1 = __importDefault(require("./middleware/httpLogger"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const helmet_1 = __importDefault(require("helmet"));
const node_cron_1 = __importDefault(require("node-cron"));
const newsController_1 = require("./controllers/newsController");
const ipBlocker_1 = require("./middleware/ipBlocker");
const userStatusService_1 = __importDefault(require("./services/userStatusService"));
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
const billingInfoRoutes_1 = __importDefault(require("./routes/billingInfoRoutes"));
const complaintRoutes_1 = __importDefault(require("./routes/complaintRoutes"));
const exchangeRateRoutes_1 = __importDefault(require("./routes/exchangeRateRoutes"));
const couponRoutes_1 = __importDefault(require("./routes/couponRoutes"));
const clickTrackRoutes_1 = __importDefault(require("./routes/clickTrackRoutes"));
const newsRoutes_1 = __importDefault(require("./routes/newsRoutes"));
const panelUserRoutes_1 = __importDefault(require("./routes/panelUserRoutes"));
const blogRoutes_1 = __importDefault(require("./routes/blogRoutes"));
const investmentNewsRoutes_1 = __importDefault(require("./routes/investmentNewsRoutes"));
const hubRoutes_1 = __importDefault(require("./routes/hubRoutes"));
const claimRequestRoutes_1 = __importDefault(require("./routes/claimRequestRoutes"));
const userStatusRoutes_1 = __importDefault(require("./routes/userStatusRoutes"));
// Env değişkenlerini yükle
dotenv_1.default.config();
// Express uygulamasını oluştur
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
// IP engelleyici middleware'i ekle (en üstte olmalı)
app.use(ipBlocker_1.ipBlocker);
// Proxy güven ayarları
app.set("trust proxy", 1); // Sadece bir proxy'ye güven
// CORS için izin verilen domainler
const whitelist = [
    "https://aikuaiplatform.com",
    "https://www.aikuaiplatform.com",
    "https://api.aikuaiplatform.com",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3004",
    "http://127.0.0.1:5500",
    "https://bevakpqfycmxnpzrkecv.supabase.co",
    "https://posws.param.com.tr",
];
// Socket.io sunucusunu oluştur
const io = new socket_io_1.Server(server, {
    cors: {
        origin: "*", // Tüm kaynaklara izin ver (geliştirme için)
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        credentials: true,
        allowedHeaders: ["Content-Type", "Authorization"],
    },
    allowEIO3: true, // Engine.IO 3 uyumluluğu
    transports: ["websocket", "polling"], // Önce WebSocket, sonra polling dene
});
exports.io = io;
// Initialize user status service
const userStatusService = new userStatusService_1.default(io);
exports.userStatusService = userStatusService;
userStatusService.startCleanupJob();
// Socket.io bağlantılarını yönet
io.on("connection", (socket) => {
    console.log("👋 Yeni bir kullanıcı bağlandı:", socket.id);
    logger_1.default.debug("Yeni Socket.IO bağlantısı kuruldu", { socketId: socket.id });
    // User authentication and status tracking
    socket.on("authenticate", (data) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { userId, token } = data;
            // TODO: Add token validation if needed
            // For now, we'll trust the userId from the client
            // In production, you should validate the token/session
            if (userId) {
                yield userStatusService.addUserSocket(userId, socket.id);
                yield userStatusService.sendOnlineUsersToSocket(socket.id);
                console.log(`🔐 Kullanıcı kimlik doğrulandı: ${userId} (${socket.id})`);
                logger_1.default.info("User authenticated", { userId, socketId: socket.id });
                socket.emit("authentication-success", {
                    userId,
                    onlineCount: userStatusService.getOnlineUsersCount()
                });
            }
            else {
                socket.emit("authentication-error", { message: "Kullanıcı ID gerekli" });
            }
        }
        catch (error) {
            logger_1.default.error("Authentication error", { error, socketId: socket.id });
            socket.emit("authentication-error", { message: "Kimlik doğrulama hatası" });
        }
    }));
    // Request online users list
    socket.on("get-online-users", () => __awaiter(void 0, void 0, void 0, function* () {
        yield userStatusService.sendOnlineUsersToSocket(socket.id);
    }));
    // Typing indicators
    socket.on("typing-start", (data) => {
        userStatusService.sendTypingIndicator(data.userId, data.chatSessionId, true);
    });
    socket.on("typing-stop", (data) => {
        userStatusService.sendTypingIndicator(data.userId, data.chatSessionId, false);
    });
    // Şirket id'sine göre chat odası katılımı
    socket.on("join-company-chat", (companyId) => {
        socket.join(`company-${companyId}`);
        console.log(`🏢 ${socket.id} kullanıcısı ${companyId} şirket odasına katıldı`);
        logger_1.default.debug("Kullanıcı şirket chat odasına katıldı", {
            socketId: socket.id,
            companyId,
        });
    });
    // Sohbet oturum id'sine göre chat odası katılımı
    socket.on("join-chat-session", (chatSessionId) => {
        socket.join(`chat-${chatSessionId}`);
        console.log(`💬 ${socket.id} kullanıcısı ${chatSessionId} sohbet odasına katıldı`);
        logger_1.default.debug("Kullanıcı sohbet odasına katıldı", {
            socketId: socket.id,
            chatSessionId,
        });
    });
    // Özel chat odalarından ayrılma
    socket.on("leave-company-chat", (companyId) => {
        socket.leave(`company-${companyId}`);
        console.log(`🚪 ${socket.id} kullanıcısı ${companyId} şirket odasından ayrıldı`);
        logger_1.default.debug("Kullanıcı şirket chat odasından ayrıldı", {
            socketId: socket.id,
            companyId,
        });
    });
    socket.on("leave-chat-session", (chatSessionId) => {
        socket.leave(`chat-${chatSessionId}`);
        console.log(`🚪 ${socket.id} kullanıcısı ${chatSessionId} sohbet odasından ayrıldı`);
        logger_1.default.debug("Kullanıcı sohbet odasından ayrıldı", {
            socketId: socket.id,
            chatSessionId,
        });
    });
    // User status ping (heartbeat)
    socket.on("ping", (callback) => {
        if (callback)
            callback("pong");
    });
    // Bağlantı kesildiğinde
    socket.on("disconnect", () => __awaiter(void 0, void 0, void 0, function* () {
        console.log("👋 Bir kullanıcı ayrıldı:", socket.id);
        logger_1.default.debug("Socket.IO bağlantısı kesildi", { socketId: socket.id });
        // Remove user from online status tracking
        yield userStatusService.removeUserSocket(socket.id);
    }));
});
// CORS origin kontrolü için fonksiyon
const corsOriginCheck = (origin, callback) => {
    console.log("🔒 CORS isteği origin:", origin);
    // Development ortamında tüm originlere izin ver
    if (process.env.NODE_ENV === "development") {
        console.log("💻 Development modu: Tüm CORS isteklerine izin veriliyor");
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
        console.log("🧪 Yerel test origin'i kabul edildi:", origin);
        callback(null, true);
        return;
    }
    // Diğer tüm istekleri reddet
    console.log(`⛔ CORS engellendi: ${origin}`);
    logger_1.default.warn("CORS politikası tarafından engellenen istek", { origin });
    callback(new Error("CORS politikası tarafından engellendi"));
};
// CORS ayarları
const corsOptions = {
    origin: corsOriginCheck,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "Origin",
        "Accept",
    ],
    exposedHeaders: ["Content-Range", "X-Content-Range"],
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: 86400, // Preflight sonuçlarını 24 saat önbelleğe al
};
// Body parsing middleware'lerini ekle
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// CORS middleware'ini ekle
app.use((0, cors_1.default)(corsOptions));
// CORS hata yakalama middleware'i
app.use((err, req, res, next) => {
    if (err.name === "CORSError") {
        console.error("❌ CORS Hatası:", err.message);
        logger_1.default.error("CORS Hatası", {
            error: err.message,
            url: req.url,
            origin: req.headers.origin,
        });
        return res.status(403).json({
            success: false,
            message: "CORS hatası: İstek engellendi",
            error: err.message,
        });
    }
    next(err);
});
// OPTIONS istekleri için özel işleyici
app.options("*", (0, cors_1.default)(corsOptions));
// HTTP Logger middleware'ini ekle
app.use(httpLogger_1.default);
// İstek loglaması için middleware
app.use((req, res, next) => {
    const origin = req.headers.origin || "";
    const method = req.method;
    const url = req.url;
    // İstek loglaması
    console.log(`🔄 İstek - Origin: ${origin}, Method: ${method}, URL: ${url}`);
    // CORS başlıklarını kontrol et ve logla
    const corsHeaders = {
        "Access-Control-Allow-Origin": res.getHeader("Access-Control-Allow-Origin"),
        "Access-Control-Allow-Methods": res.getHeader("Access-Control-Allow-Methods"),
        "Access-Control-Allow-Headers": res.getHeader("Access-Control-Allow-Headers"),
        "Access-Control-Allow-Credentials": res.getHeader("Access-Control-Allow-Credentials"),
    };
    console.log("🔑 CORS Başlıkları:", corsHeaders);
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
    // Daha detaylı hata logu
    logger_1.default.error("Sunucu Hatası", {
        error: {
            name: err.name,
            message: err.message,
            stack: err.stack,
            code: err.code,
        },
        request: {
            url: req.url,
            method: req.method,
            path: req.path,
            query: req.query,
            params: req.params,
            headers: {
                "user-agent": req.headers["user-agent"],
                "content-type": req.headers["content-type"],
                host: req.headers.host,
            },
        },
        user: req.user
            ? {
                id: req.user.id,
                email: req.user.email,
            }
            : null,
        timestamp: new Date().toISOString(),
    });
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
// Güvenlik başlıkları
app.use((0, helmet_1.default)());
// XSS koruması için Content Security Policy
app.use(helmet_1.default.contentSecurityPolicy({
    directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "accounts.google.com"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://api.aikuaiplatform.com"],
        fontSrc: ["'self'", "https:", "data:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'self'", "accounts.google.com"],
    },
}));
// Rate limiting ayarları
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 10 * 60 * 1000, // 10 dakika
    max: process.env.NODE_ENV === 'development' ? Infinity : 750, // Development'da sınırsız, production'da 200
    message: "Too many requests, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger_1.default.warn("Rate limit exceeded", {
            ip: req.ip,
            realIP: req.headers["x-real-ip"],
            forwardedFor: req.headers["x-forwarded-for"],
            url: req.url,
            headers: req.headers,
        });
        res.status(429).json({
            error: "Too many requests, please try again later."
        });
    },
    // Rate limit için IP belirleme fonksiyonu
    keyGenerator: (req) => {
        var _a, _b;
        return ((_a = req.headers["x-forwarded-for"]) === null || _a === void 0 ? void 0 : _a.toString()) ||
            ((_b = req.headers["x-real-ip"]) === null || _b === void 0 ? void 0 : _b.toString()) ||
            req.ip ||
            req.connection.remoteAddress ||
            'unknown';
    }
});
// Tüm route'lara rate limiting uygula
app.use(limiter);
// Şüpheli istekleri engelle
app.use((req, res, next) => {
    const suspiciousPatterns = [
        /eval-stdin\.php/i,
        /phpunit/i,
        /think\\app/i,
        /pearcmd/i,
        /\.env/i,
        /wp-content/i,
        /wp-admin/i,
        /wp-login/i,
    ];
    const url = req.url.toLowerCase();
    if (suspiciousPatterns.some((pattern) => pattern.test(url))) {
        logger_1.default.warn("Şüpheli istek engellendi", {
            ip: req.ip,
            url: req.url,
            method: req.method,
            headers: req.headers,
        });
        return res.status(403).json({ error: "İstek engellendi" });
    }
    next();
});
const NEWS_FETCH_SCHEDULE = process.env.NEWS_FETCH_CRON_SCHEDULE || '0 3 * * *';
node_cron_1.default.schedule(NEWS_FETCH_SCHEDULE, () => {
    (0, newsController_1.fetchAndStoreNews)()
        .then(() => console.log('Haberler güncellendi'))
        .catch(err => console.error('Haber çekme hatası:', err));
});
// MongoDB bağlantısı
mongoose_1.default
    .connect(process.env.MONGODB_URI)
    .then(() => {
    console.log("✅ MongoDB bağlantısı başarılı");
    logger_1.default.info("MongoDB bağlantısı başarılı");
})
    .catch((err) => {
    console.log("❌ MongoDB bağlantı hatası:", err);
    logger_1.default.error("MongoDB bağlantı hatası", { error: err.message });
});
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
app.use("/api/billing-info", billingInfoRoutes_1.default);
app.use("/api/complaints", complaintRoutes_1.default);
app.use("/api/exchange-rates", exchangeRateRoutes_1.default);
app.use("/api/coupons", couponRoutes_1.default);
app.use("/api/click", clickTrackRoutes_1.default);
app.use("/api/news", newsRoutes_1.default);
app.use("/api/blog", blogRoutes_1.default);
app.use("/api/panel-users", panelUserRoutes_1.default);
app.use('/api/investment-news', investmentNewsRoutes_1.default);
app.use("/api/hub", hubRoutes_1.default);
app.use("/api/claim-requests", claimRequestRoutes_1.default);
app.use("/api/user-status", userStatusRoutes_1.default);
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
    logger_1.default.info(`Sunucu başlatıldı`, { port: PORT, env: process.env.NODE_ENV });
});
