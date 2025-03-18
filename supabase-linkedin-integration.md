# Supabase LinkedIn OIDC Entegrasyonu

Bu dosya, frontend'de Supabase kullanılarak yapılan LinkedIn OAuth (OIDC) entegrasyonunun backend tarafında nasıl işlendiğini açıklar.

## Başlangıç

Entegrasyonu kullanmaya başlamak için aşağıdaki adımları izleyin:

1. `.env` dosyasına Supabase Service Key'inizi ekleyin:
   ```
   SUPABASE_SERVICE_KEY=your-service-key-here
   ```
   
   Bu anahtarı Supabase Dashboard > Settings > API bölümünden alabilirsiniz. "service_role key" ya da "service key" olarak geçer.

2. Frontend tarafında, LinkedIn ile giriş yaptıktan sonra, kullanıcı bilgilerini senkronize etmek için backend API'yi çağırın:
   ```javascript
   // Frontend'de kullanıcı giriş yaptıktan sonra
   const { data: { session } } = await supabase.auth.getSession();
   
   // Backend'e kullanıcı bilgilerini senkronize etmek için istek yap
   const response = await fetch('http://yourapi.com/api/auth/supabase/sync', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'Authorization': `Bearer ${session.access_token}`
     },
     body: JSON.stringify({
       provider: 'linkedin_oidc'  // LinkedIn OIDC sağlayıcısını belirt
     })
   });
   
   const userData = await response.json();
   ```

## API Endpointleri

### POST /api/auth/supabase/sync

Supabase ile giriş yapan kullanıcının bilgilerini senkronize eder.

**Headers:**
- `Authorization`: Bearer token (Supabase access token)

**Body:**
```json
{
  "provider": "linkedin_oidc"  // İsteğe bağlı, varsayılan "supabase"
}
```

**Yanıt:**
```json
{
  "success": true,
  "message": "Kullanıcı başarıyla senkronize edildi",
  "token": "jwt-token",  // Backend JWT token'ı
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "firstName": "Ad",
    "lastName": "Soyad",
    "profilePhoto": "https://example.com/photo.jpg",
    "authProvider": "linkedin"
  }
}
```

## Nasıl Çalışır?

1. Kullanıcı frontend'de Supabase üzerinden LinkedIn ile giriş yapar
2. Frontend, backend'e Supabase token'ı ile istek gönderir
3. Backend, Supabase token'ı doğrular ve kullanıcı bilgilerini alır
4. Kullanıcı veritabanında aranır:
   - Email ile
   - Supabase ID ile
   - LinkedIn ID ile
5. Kullanıcı bulunursa güncellenir, bulunamazsa yeni kullanıcı oluşturulur
6. Backend, kendi JWT token'ını oluşturarak yanıt verir

## Önemli Notlar

1. Aynı email adresi ile farklı giriş yöntemlerini kullanarak giriş yapan kullanıcılar tek bir hesap olarak birleştirilir
2. Kullanıcının LinkedIn bilgileri (profil URL'si, LinkedIn ID vb.) kaydedilir ve güncellenir
3. Supabase Service Key, frontend'den hiçbir zaman erişilememelidir - sadece backend'de kullanılmalıdır
4. Kullanıcı her giriş yaptığında, son giriş tarihi (lastLogin) güncellenir

## Sorun Giderme

1. JWT token hatası alıyorsanız, Supabase token'ının geçerli olduğundan emin olun
2. Kullanıcı bilgileri alınamıyorsa, Supabase Service Key'in doğru olduğunu kontrol edin
3. Log'ları kontrol edin, işlem adımları detaylı şekilde loglanmaktadır

## Güvenlik

1. Supabase Service Key'i hiçbir zaman frontend kodunda kullanmayın veya tarayıcıda göstermeyin
2. JWT Secret anahtarınızın güvenli ve karmaşık olduğundan emin olun
3. Giriş işlemi sonrasında oluşturulan token'ın geçerlilik süresini (JWT_EXPIRE) ihtiyacınıza göre ayarlayın 