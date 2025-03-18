import express, { Request, Response } from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { Server } from "socket.io";
import http from "http";
import passport from "./config/passport";
import cors from "cors";

// Route'ları import et
import authRoutes from "./routes/authRoutes";
import companyRoutes from "./routes/companyRoutes";
import productRoutes from "./routes/productRoutes";
import teamMemberRoutes from "./routes/teamMemberRoutes";
import uploadRoutes from "./routes/uploadRoutes";
import aiRoutes from "./routes/aiRoutes";
import cardRoutes from "./routes/cardRoutes";
import paymentRoutes from "./routes/paymentRoutes";
import linkedInRoutes from "./routes/linkedInRoutes";
import subscriptionRoutes from "./routes/subscriptionRoutes";
import applicantRoutes from "./routes/applicantRoutes";
import linkedinAuthRoutes from "./routes/linkedinAuth.routes";
import supabaseAuthRoutes from "./routes/supabaseAuth.routes";

// Env değişkenlerini yükle
dotenv.config();

// Express uygulamasını oluştur
const app = express();
const server = http.createServer(app);

// CORS için izin verilen domainler
const whitelist = [
  'https://aikuaiplatform.com',
  'https://www.aikuaiplatform.com',
  'https://api.aikuaiplatform.com',
  'http://localhost:3000',
  'http://localhost:3004',
  'https://bevakpqfycmxnpzrkecv.supabase.co'
];

// CORS origin kontrolü için fonksiyon
const corsOriginCheck = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
  console.log('🔒 CORS isteği origin:', origin);
  
  // Development ortamında tüm originlere izin ver
  if (process.env.NODE_ENV === 'development') {
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
  
  // Localhost için port kontrolünü gevşet (development için)
  const localhostRegex = /^http:\/\/localhost:\d+$/;
  if (localhostRegex.test(origin)) {
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

// CORS middleware'ini en başta ekle
app.use(cors(corsOptions));

// CORS hata yakalama middleware'i
app.use((err: any, req: Request, res: Response, next: any) => {
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
app.options('*', cors(corsOptions));

// İstek loglaması için middleware
app.use((req, res, next) => {
  const origin = req.headers.origin || '';
  const method = req.method;
  const url = req.url;
  
  // İstek loglaması
  console.log(
    `🔄 İstek - Origin: ${origin}, Method: ${method}, URL: ${url}`
  );

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

// Test için Google OAuth sayfası
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
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error("❌ Sunucu Hatası:", err);
  res.status(err.status || 500).json({
    message: err.message || "Sunucu hatası",
    error: process.env.NODE_ENV === "development" ? err : {},
  });
});

// Passport middleware
app.use(passport.initialize());

// Statik dosya servisi
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// MongoDB bağlantısı
mongoose
  .connect(process.env.MONGODB_URI!)
  .then(() => console.log("✅ MongoDB bağlantısı başarılı"))
  .catch((err) => console.log("❌ MongoDB bağlantı hatası:", err));

// Route'ları ekle
app.use("/api/auth", authRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/product", productRoutes);
app.use("/api/team-members", teamMemberRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api", linkedInRoutes);
app.use("/api/cards", cardRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/applicants", applicantRoutes);
app.use("/api", linkedinAuthRoutes);
app.use("/api", supabaseAuthRoutes);

// Ana route
app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "🚀 AIKU API çalışıyor" });
});

// Port ayarı
const PORT = process.env.PORT || 3004;

// Sunucuyu başlat
server.listen(PORT, () => {
  console.log(`🚀 Sunucu ${PORT} portunda çalışıyor`);
  console.log("✅ Socket.IO sistemi aktif");
});
