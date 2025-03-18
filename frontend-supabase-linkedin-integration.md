# Frontend Supabase LinkedIn OIDC Entegrasyonu Kılavuzu

Bu kılavuz, frontend uygulamanızda Supabase kullanarak LinkedIn OIDC entegrasyonunu nasıl yapacağınızı ve backend ile nasıl senkronize edeceğinizi açıklar.

## İçindekiler

1. [Gereksinimler](#gereksinimler)
2. [Supabase Kurulumu](#supabase-kurulumu)
3. [Frontend Kurulumu](#frontend-kurulumu)
4. [LinkedIn ile Giriş](#linkedin-ile-giriş)
5. [Backend Senkronizasyonu](#backend-senkronizasyonu)
6. [OAuthCallback Bileşeni](#oauthcallback-bileşeni)
7. [Kullanıcı Oturumu Yönetimi](#kullanıcı-oturumu-yönetimi)
8. [Yaygın Sorunlar ve Çözümleri](#yaygın-sorunlar-ve-çözümleri)

## Gereksinimler

- Node.js ve NPM/Yarn
- React.js uygulaması
- Supabase hesabı
- LinkedIn Developer hesabı
- Backend API (aiku-backend)

## Supabase Kurulumu

1. Supabase hesabınızda yeni bir proje oluşturun.

2. **Authentication > Providers > LinkedIn** sekmesine gidin ve LinkedIn OIDC sağlayıcısını etkinleştirin:
   
   - Client ID: LinkedIn Developer Portal'dan aldığınız client ID
   - Client Secret: LinkedIn Developer Portal'dan aldığınız client secret
   - Redirect URL: `https://[YOUR_PROJECT_REF].supabase.co/auth/v1/callback`

3. LinkedIn Developer Portal'da yeni bir uygulama oluşturun:
   - Products > Sign In with LinkedIn using OpenID Connect ürününü ekleyin
   - OAuth 2.0 ayarlarında Supabase callback URL'sini ekleyin:
     `https://[YOUR_PROJECT_REF].supabase.co/auth/v1/callback`
   - Yetkiler: `openid`, `profile`, `email`

## Frontend Kurulumu

1. Supabase JavaScript client'ı yükleyin:

```bash
npm install @supabase/supabase-js
# veya
yarn add @supabase/supabase-js
```

2. Supabase istemcisini oluşturun (`supabaseClient.js`):

```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bevakpqfycmxnpzrkecv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Anon key'iniz

// Gizlilik için process.env kullanımını tercih edin
// const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
// const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Anon Key (ilk 10 karakter):', supabaseAnonKey.substring(0, 10) + '...');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
```

3. Backend API için axios instance oluşturun (`axiosInstance.js`):

```javascript
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3004/api';

console.log('🔧 API_URL:', API_URL);
console.log('🔧 NODE_ENV:', process.env.NODE_ENV);

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true // CORS istekleri için önemli
});

// İstek interceptor'ı
axiosInstance.interceptors.request.use(
  (config) => {
    // İstek detaylarını logla (debug için)
    console.log('İstek yapılıyor:', config.url);
    console.log('İstek method:', config.method);
    
    // Yetkilendirme token'ı varsa ekle
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Yanıt interceptor'ı
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // CORS veya ağ hatalarını logla
    if (!error.response) {
      console.error('❌ CORS veya Ağ Hatası: ', error);
      console.log('İstek URL:', error.config?.url);
      console.log('İstek Method:', error.config?.method);
      
      return Promise.reject({
        status: 500,
        message: 'Sunucu ile bağlantı kurulamadı. Lütfen daha sonra tekrar deneyin.',
        error: error.message
      });
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;
```

## LinkedIn ile Giriş

1. LinkedIn ile giriş fonksiyonunu oluşturun (`authService.js`):

```javascript
import supabase from './supabaseClient';

// LinkedIn ile giriş
export const signInWithLinkedIn = async () => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'linkedin_oidc',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'openid profile email',
        queryParams: {
          prompt: 'consent'
        }
      }
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('LinkedIn ile giriş hatası:', error.message);
    throw error;
  }
};

// Çıkış yap
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    // Backend token'ı da temizle
    localStorage.removeItem('token');
    
    return { success: true };
  } catch (error) {
    console.error('Çıkış hatası:', error.message);
    throw error;
  }
};

// Mevcut kullanıcıyı al
export const getCurrentUser = async () => {
  try {
    // Önce Supabase oturumunu kontrol et
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      console.log('Supabase oturumu bulundu');
      
      // Backend'den kullanıcı bilgilerini al
      try {
        const response = await axiosInstance.get('/auth/currentUser');
        return response.data;
      } catch (error) {
        console.error('Backend kullanıcı bilgileri alınamadı:', error);
        
        // Backend hatası varsa Supabase kullanıcısını döndür
        return {
          id: session.user.id,
          email: session.user.email,
          firstName: session.user.user_metadata?.given_name || '',
          lastName: session.user.user_metadata?.family_name || '',
          profilePhoto: session.user.user_metadata?.picture || '',
          authProvider: 'supabase'
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Oturum kontrolü hatası:', error);
    return null;
  }
};
```

2. Giriş butonunu oluşturun:

```jsx
import React from 'react';
import { signInWithLinkedIn } from '../services/authService';

const LoginButton = () => {
  const handleLinkedInLogin = async () => {
    try {
      await signInWithLinkedIn();
      // Yönlendirme otomatik olarak gerçekleşecek
    } catch (error) {
      console.error('LinkedIn ile giriş hatası:', error);
      alert('Giriş yapılırken bir hata oluştu');
    }
  };

  return (
    <button 
      onClick={handleLinkedInLogin}
      className="linkedin-login-button"
    >
      LinkedIn ile Giriş Yap
    </button>
  );
};

export default LoginButton;
```

## Backend Senkronizasyonu

Backend ile senkronizasyon için bir servis oluşturun (`userService.js`):

```javascript
import axiosInstance from './axiosInstance';
import supabase from './supabaseClient';

// Supabase kullanıcısını backend ile senkronize et
export const syncSupabaseUser = async (provider = 'linkedin_oidc') => {
  try {
    console.log('Backend senkronizasyonu başlatılıyor...');
    
    // Supabase oturumunu al
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('Aktif Supabase oturumu bulunamadı');
    }
    
    // Backend API'ye istek gönder
    const response = await axiosInstance.post('/auth/supabase/sync', 
      { provider },
      { 
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      }
    );
    
    console.log('Backend senkronizasyonu başarılı:', response.data);
    
    // Backend token'ını localStorage'e kaydet
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    
    return response.data;
  } catch (error) {
    console.error('Backend senkronizasyon hatası:', error);
    throw error;
  }
};
```

## OAuthCallback Bileşeni

Supabase yönlendirme işlemi için bir callback bileşeni oluşturun (`OAuthCallback.jsx`):

```jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../services/supabaseClient';
import { syncSupabaseUser } from '../services/userService';

const OAuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('OAuthCallback bileşeni başlatıldı');
    
    async function handleCallback() {
      try {
        // Supabase oturumunu kontrol et
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw sessionError;
        }
        
        if (session) {
          console.log('Supabase oturumu bulundu: ', session);
          
          // Backend ile senkronize et (LinkedIn veya diğer sağlayıcılar için)
          const provider = session.user.app_metadata?.provider || 'supabase';
          await syncSupabaseUser(provider);
          
          // Kullanıcıyı yönlendir
          navigate('/profile');
        } else {
          // Oturum yoksa giriş sayfasına yönlendir
          navigate('/login');
        }
      } catch (error) {
        console.error('Callback işleme hatası:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }
    
    handleCallback();
  }, [navigate]);

  if (loading) {
    return <div className="loading-container">Giriş işlemi tamamlanıyor...</div>;
  }

  if (error) {
    return <div className="error-container">Hata: {error}</div>;
  }

  return null; // Yönlendirme zaten yapıldı
};

export default OAuthCallback;
```

## Kullanıcı Oturumu Yönetimi

Uygulamanızda kullanıcı oturumunu yönetmek için bir context oluşturun (`AuthContext.jsx`):

```jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser } from '../services/authService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await getCurrentUser();
        setUser(userData);
      } catch (error) {
        console.error('Kullanıcı yükleme hatası:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
    
    // Supabase auth değişikliklerini dinle
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth değişikliği:', event);
        
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          const userData = await getCurrentUser();
          setUser(userData);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      }
    );

    return () => {
      if (authListener) authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
```

## Yaygın Sorunlar ve Çözümleri

### 1. CORS Hataları

**Sorun**: Backend'e istek yaparken CORS hataları alıyorsunuz:
```
Cross-Origin Request Blocked: The Same Origin Policy disallows reading the remote resource at http://localhost:3004/api/auth/currentUser.
```

**Çözüm**:
- Frontend'de `withCredentials: true` ayarını kullanın
- Backend'in CORS ayarlarının doğru olduğundan emin olun
- Geliştirme sırasında CORS proxy eklentisi kullanabilirsiniz

### 2. Yönlendirme Sorunları

**Sorun**: LinkedIn'den giriş sonrası doğru sayfaya yönlendirilmiyorsunuz.

**Çözüm**:
- `redirectTo` parametresinin doğru ayarlandığından emin olun
- OAuthCallback bileşeninin doğru rotada tanımlandığından emin olun
- `/auth/callback` rotasının React Router'da tanımlı olduğundan emin olun

### 3. Token Sorunları

**Sorun**: Backend token'ı alınamıyor veya geçersiz.

**Çözüm**:
- Backend'e gönderilen Supabase token'ın doğru formatta olduğundan emin olun
- Konsol loglarını kontrol ederek token akışını izleyin
- Backend'in SUPABASE_SERVICE_KEY değerinin doğru olduğundan emin olun

### 4. Kullanıcı Bilgileri Eksik

**Sorun**: Kullanıcı profil bilgileri eksik veya boş geliyor.

**Çözüm**:
- LinkedIn'de istenen yetkilerin (`scopes`) doğru ayarlandığından emin olun
- LinkedIn Developer Portal'da gereken izinlerin tanımlandığından emin olun
- Supabase Dashboard'dan Authentication > Users'da kullanıcı metadata'sını kontrol edin

### 5. Fontawesome Hatası

**Sorun**: 
```
Loading failed for the <script> with source "https://kit.fontawesome.com/37ef2a3cc5.js"
```

**Çözüm**:
- FontAwesome kit anahtarınızı güncelleyin veya alternatif bir CDN kullanın
- Local olarak FontAwesome yüklemesi yapın:
  ```bash
  npm install @fortawesome/fontawesome-free
  # veya
  yarn add @fortawesome/fontawesome-free
  ```

### 6. Backend Çalışmıyor

**Sorun**: Backend API'ye bağlanılamıyor.

**Çözüm**:
- Backend sunucunuzun çalıştığından emin olun
- Doğru port ve URL kullandığınızdan emin olun
- `.env` dosyasında API_URL değerinin doğru olduğundan emin olun

## Örnek Uygulama İş Akışı

1. Kullanıcı "LinkedIn ile Giriş Yap" butonuna tıklar
2. Supabase, kullanıcıyı LinkedIn oturum açma sayfasına yönlendirir
3. Kullanıcı LinkedIn bilgileriyle giriş yapar
4. LinkedIn kullanıcıyı Supabase callback URL'sine yönlendirir
5. Supabase bir oturum oluşturur ve kullanıcıyı `/auth/callback` URL'sine yönlendirir
6. OAuthCallback bileşeni Supabase oturumunu alır ve backend ile senkronize eder
7. Kullanıcı profil sayfasına yönlendirilir 