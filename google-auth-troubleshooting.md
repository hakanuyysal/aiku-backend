# Google Kimlik Doğrulama Sorun Giderme Rehberi

## "Token used too early" Hatası

Bu hata, sunucunuzun sistem saati ile Google sunucularının saati arasında bir uyumsuzluk olduğunda ortaya çıkar. Google, JWT token'larında `nbf` (not before) alanını kullanarak token'ın hangi zamandan itibaren geçerli olduğunu belirtir. Sunucunuzun saati Google sunucularının saatinden daha geri ise, bu hatayı alırsınız.

### Hata Mesajı Örneği:
```
Error: Token used too early, 1742227336.097 < 1742241434: 
```

Bu hatada:
- `1742227336.097`: Sunucunuzun Unix timestamp değeri
- `1742241434`: Google'ın belirlediği "not before" zaman değeri

### Çözüm:

1. **Sistem Saatini Senkronize Edin:**

   - **macOS:**
     ```bash
     sudo ntpdate -u time.apple.com
     ```

   - **Linux:**
     ```bash
     sudo ntpdate pool.ntp.org
     ```

   - **Windows:**
     - Sağ alt köşedeki saat > "Tarih ve Saat ayarlarını değiştir" > "Internet Saati" sekmesi > "Şimdi güncelle"

2. **Otomatik Saat Senkronizasyonunu Etkinleştirin:**

   - **macOS & Linux:**
     ```bash
     sudo timedatectl set-ntp true
     ```

   - **Windows:**
     - Saat ayarlarında "Internet saati ile otomatik olarak senkronize et" seçeneğini etkinleştirin.

## Diğer Yaygın Google OAuth Hataları

### 1. "Invalid client" veya "Client ID not found"

**Sebep:** Google Cloud Console'da yapılandırılan Client ID ile uygulamanızda kullanılan Client ID eşleşmiyor.

**Çözüm:**
- `.env` dosyasındaki `GOOGLE_CLIENT_ID` değerini kontrol edin
- Google Cloud Console'dan doğru Client ID'yi kopyalayın

### 2. "redirect_uri_mismatch"

**Sebep:** Google Cloud Console'da yapılandırılan Redirect URI ile uygulamanızın kullandığı Redirect URI eşleşmiyor.

**Çözüm:**
- `.env` dosyasındaki `GOOGLE_CALLBACK_URL` değerini kontrol edin
- Google Cloud Console'da OAuth onaylı yönlendirme URL'leri listesine aşağıdakileri ekleyin:
  - `http://localhost:3004/api/auth/google/callback` (geliştirme)
  - `https://your-production-domain.com/api/auth/google/callback` (production)

### 3. "Invalid Credentials"

**Sebep:** Client Secret yanlış veya eksik.

**Çözüm:**
- `.env` dosyasındaki `GOOGLE_CLIENT_SECRET` değerini kontrol edin
- Google Cloud Console'dan yeni bir client secret oluşturmanız gerekebilir

### 4. "Access Not Configured" veya "API not enabled"

**Sebep:** Google Cloud Console'da Google Identity API veya People API etkinleştirilmemiş.

**Çözüm:**
- Google Cloud Console'da "APIs & Services" > "Library" bölümüne gidin
- "Google Identity" ve "People API" servislerini etkinleştirin

### 5. CORS Hataları

**Sebep:** Backend, frontend'in origin'ine izin vermiyor.

**Çözüm:**
- Backend'deki CORS yapılandırmasını güncelleme:
  ```javascript
  app.use(cors({
    origin: ['http://localhost:3000', 'https://your-production-domain.com'],
    credentials: true
  }));
  ```

## Google OAuth Yapılandırmasını Kontrol Etme

1. **Google Cloud Console Ayarları:**
   - Proje seçin > "APIs & Services" > "Credentials"
   - "OAuth 2.0 Client IDs" bölümünde, web uygulamanızı seçin
   - Aşağıdakileri kontrol edin:
     - Authorized JavaScript origins
     - Authorized redirect URIs

2. **Onaylı JavaScript Kaynakları:**
   - `http://localhost:3000` (geliştirme)
   - `https://your-production-domain.com` (production)

3. **Onaylı Yönlendirme URL'leri:**
   - `http://localhost:3004/api/auth/google/callback` (geliştirme)
   - `https://your-production-domain.com/api/auth/google/callback` (production)

## JWT Token'ı Manuel İnceleme

Bir JWT token'ının içeriğini görmek için [jwt.io](https://jwt.io/) adresini kullanabilirsiniz. Token'daki şu alanları kontrol edin:

- `iss` (Issuer): `https://accounts.google.com` olmalı
- `aud` (Audience): Client ID'niz olmalı
- `exp` (Expiration Time): Geçerlilik süresi dolmamış olmalı
- `nbf` (Not Before): Token'ın geçerli olmaya başlayacağı zaman
- `iat` (Issued At): Token'ın oluşturulduğu zaman

## Sistem Saatini Kontrol Etme

```bash
# Unix/Linux/macOS
date

# Windows Command Prompt
echo %date% %time%

# Windows PowerShell
Get-Date
```

Google'ın [şimdiki zaman](https://time.is/Google) ile karşılaştırabilirsiniz. 