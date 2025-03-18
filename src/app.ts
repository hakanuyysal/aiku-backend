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

// Env değişkenlerini yükle
dotenv.config();

// Express uygulamasını oluştur
const app = express();
const server = http.createServer(app);

// CORS için izin verilen domainler
const whitelist = [
  'https://aikuaiplatform.com',
  'https://www.aikuaiplatform.com',
  'http://localhost:3000'
];

// Socket.IO kurulumu
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || whitelist.some(domain => origin.includes(domain))) {
        callback(null, true);
      } else {
        console.log(`⛔ Socket.IO CORS engellendi: ${origin}`);
        callback(new Error("CORS engellendi"), false);
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Origin", "Accept"]
  },
});

// Socket.IO olaylarını dinle
io.on("connection", (socket) => {
  console.log("👤 Yeni kullanıcı bağlandı");

  socket.on("send_message", (message) => {
    console.log("📨 Mesaj alındı:", message);
    io.emit("receive_message", message);
  });

  socket.on("disconnect", () => {
    console.log("👋 Kullanıcı ayrıldı");
  });
});

// Middleware'leri ekle
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS ayarları
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    if (!origin || whitelist.some(domain => origin.includes(domain))) {
      callback(null, true);
    } else {
      console.log(`⛔ CORS engellendi: ${origin}`);
      callback(null, false);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Origin", "Accept"],
  preflightContinue: false,
  optionsSuccessStatus: 200
};

// Tek bir CORS middleware'i kullanılıyor
app.use(cors(corsOptions));

// İstek loglaması için middleware
app.use((req, res, next) => {
  const origin = req.headers.origin || "";
  
  // İstek loglaması
  console.log(
    `🔄 İstek - Origin: ${origin}, Method: ${req.method}, URL: ${req.url}`
  );

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
