# LinkedIn ve Supabase Entegrasyonu

Bu proje, LinkedIn OAuth 2.0 kimlik doğrulama sistemi ile Supabase veritabanı entegrasyonunu içermektedir. Kullanıcılar, LinkedIn hesapları ile giriş yapabilir ve bilgileri Supabase veritabanında saklanabilir.

## Kurulum

1. Gerekli paketleri yükleyin:
```bash
yarn add @supabase/supabase-js
```

2. `.env` dosyasına Supabase ve LinkedIn bilgilerinizi ekleyin:
```
# LinkedIn API Credentials
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret
LINKEDIN_REDIRECT_URI=http://localhost:3000/auth/social-callback

# Supabase Credentials
SUPABASE_URL=https://bevakpqfycmxnpzrkecv.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Supabase Veri Modeli

Supabase'de aşağıdaki tabloyu oluşturun:

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR NOT NULL UNIQUE,
  first_name VARCHAR,
  last_name VARCHAR,
  linkedin_id VARCHAR UNIQUE,
  auth_provider VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Kullanım

### Backend Entegrasyonu

1. Supabase istemcisini yapılandırın:
```typescript
// src/config/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'your-supabase-url';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-supabase-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
```

2. LinkedIn Auth servisini kullanın:
```typescript
import linkedinAuthService from '../services/linkedinAuth.service';

// LinkedIn oturum açma URL'si al
const authURL = linkedinAuthService.getLinkedInAuthURL();

// LinkedIn code ile token al
const tokenData = await linkedinAuthService.getTokenFromCode(code);

// Token ile kullanıcı bilgilerini al
const userInfo = await linkedinAuthService.getUserInfo(tokenData.access_token);

// Kullanıcıyı Supabase'e kaydet
const userData = await linkedinAuthService.signInWithLinkedIn(userInfo);
```

### Frontend Entegrasyonu

React uygulamanızda LinkedIn giriş butonunu kullanın:

```typescript
import LinkedInLogin from '../components/LinkedInLogin';

function LoginPage() {
  const handleSuccess = (data) => {
    console.log('Başarılı giriş:', data);
    // Token'ı sakla, kullanıcıyı yönlendir, vb.
  };

  const handleError = (error) => {
    console.error('Giriş hatası:', error);
    // Hata mesajı göster
  };

  return (
    <div>
      <h1>Giriş Yap</h1>
      
      <LinkedInLogin 
        onSuccess={handleSuccess}
        onError={handleError}
        buttonText="LinkedIn ile Giriş Yap"
      />
    </div>
  );
}
```

## API Rotaları

- **GET /api/auth/linkedin**: LinkedIn oturum açma URL'sini döndürür
- **POST /api/auth/linkedin/callback**: LinkedIn callback işlevini gerçekleştirir

## LinkedIn Uygulama Yapılandırması

1. [LinkedIn Developer Portal](https://www.linkedin.com/developers/)'da yeni bir uygulama oluşturun
2. OAuth 2.0 izinlerini yapılandırın:
   - **Yönlendirme URL'si**: `http://localhost:3000/auth/social-callback` (veya kendi URL'niz)
   - **İzinler**: `r_liteprofile`, `r_emailaddress`

## Güvenlik Notları

1. `.env` dosyasını asla kaynak kontrol sistemlerine eklemeyin.
2. Supabase anahtarınızı her zaman güvende tutun.
3. LinkedIn client secret'ınızı yalnızca sunucu tarafında kullanın, asla istemci tarafında kullanmayın.

## Sorun Giderme

Yaygın sorunlar ve çözümleri:

1. **LinkedIn callback çalışmıyor**: LinkedIn uygulamanızda doğru callback URL'sinin yapılandırıldığından emin olun.
2. **Supabase bağlantı hatası**: Supabase URL ve anahtar bilgilerinizin doğru olduğunu kontrol edin.
3. **Email bilgisi alınamıyor**: LinkedIn uygulamanızda `r_emailaddress` izninin eklendiğinden emin olun. 