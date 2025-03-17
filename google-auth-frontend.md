# Google Kimlik Doğrulama Frontend Entegrasyonu

## Genel Bakış

Bu rehber, AIKU AI platformuna Google hesapları ile kimlik doğrulama eklemek için frontend tarafındaki entegrasyonu açıklamaktadır. İki farklı yaklaşım desteklenmektedir:

1. **Google Identity Services (önerilen)**: Modern ve daha güvenli yaklaşım
2. **Passport.js OAuth**: Sunucu taraflı OAuth 2.0 akışı

## 1. Google Identity Services (Client-side) Entegrasyonu

### Kurulum

1. React projesi içinde Google Identity SDK'yi ekleyin:

```html
<!-- index.html veya public/index.html dosyasına ekleyin -->
<script src="https://accounts.google.com/gsi/client" async defer></script>
```

### React Componenti

```jsx
import React, { useEffect, useRef } from 'react';
import axios from 'axios';

const GoogleLogin = ({ onSuccess, onError }) => {
  const googleButtonRef = useRef(null);

  useEffect(() => {
    // Google One Tap ve butonu yapılandır
    if (window.google && googleButtonRef.current) {
      window.google.accounts.id.initialize({
        client_id: 'GOOGLE_CLIENT_ID', // .env dosyasından alınabilir
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
        type: 'standard',
        shape: 'rectangular',
        text: 'continue_with',
        logo_alignment: 'left',
      });
    }
  }, []);

  const handleCredentialResponse = async (response) => {
    try {
      // Backend'e Google token'ını gönder
      const apiResponse = await axios.post(`${API_URL}/api/auth/google/login`, {
        idToken: response.credential,
      });

      // Başarılı response
      if (apiResponse.data.success && apiResponse.data.token) {
        // Token'ı local storage'a veya cookie'ye kaydet
        localStorage.setItem('authToken', apiResponse.data.token);
        
        // Kullanıcı bilgilerini state'e kaydet
        if (onSuccess) onSuccess(apiResponse.data);
      } else {
        throw new Error('Token alınamadı');
      }
    } catch (error) {
      console.error('Google giriş hatası:', error);
      if (onError) onError(error);
    }
  };

  return (
    <div>
      <div ref={googleButtonRef}></div>
    </div>
  );
};

export default GoogleLogin;
```

### Kullanım

```jsx
import GoogleLogin from './components/GoogleLogin';

function LoginPage() {
  const handleLoginSuccess = (data) => {
    console.log('Giriş başarılı:', data);
    // Kullanıcıyı dashboard'a yönlendir
    navigate('/dashboard');
  };

  const handleLoginError = (error) => {
    console.error('Giriş hatası:', error);
    // Hata mesajı göster
  };

  return (
    <div className="login-page">
      <h1>Giriş Yap</h1>
      
      {/* Email/Şifre giriş formu */}
      
      <div className="social-login">
        <p>Veya şununla devam et:</p>
        <GoogleLogin 
          onSuccess={handleLoginSuccess} 
          onError={handleLoginError} 
        />
      </div>
    </div>
  );
}
```

## 2. Passport.js OAuth (Server-side) Entegrasyonu

### Kurulum

Server-side OAuth için herhangi bir JavaScript kütüphanesine gerek yoktur.

### Link ile Yönlendirme

```jsx
import React from 'react';

const GoogleOAuthButton = () => {
  return (
    <a 
      href="http://localhost:3004/api/auth/google"
      className="google-oauth-button"
    >
      <img src="/google-icon.svg" alt="Google" />
      <span>Google ile devam et</span>
    </a>
  );
};

export default GoogleOAuthButton;
```

### Callback Sayfası

Kullanıcı Google tarafından yönlendirildikten sonra token ve kullanıcı bilgilerini çıkaran sayfa:

```jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const SocialCallback = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const processCallback = async () => {
      try {
        // URL'den data parametresini al
        const params = new URLSearchParams(location.search);
        const dataParam = params.get('data');
        
        if (!dataParam) {
          throw new Error('Callback verisi bulunamadı');
        }
        
        // URL-encoded JSON'ı çöz
        const decodedData = decodeURIComponent(dataParam);
        const authData = JSON.parse(decodedData);
        
        if (!authData.token) {
          throw new Error('Token bulunamadı');
        }
        
        // Token'ı kaydet
        localStorage.setItem('authToken', authData.token);
        
        // Kullanıcı bilgilerini kaydet veya state'e aktar
        if (authData.user) {
          localStorage.setItem('user', JSON.stringify(authData.user));
        }
        
        // Kullanıcıyı dashboard'a yönlendir
        navigate('/dashboard');
      } catch (err) {
        console.error('Social callback hatası:', err);
        setError(err.message);
        setLoading(false);
      }
    };
    
    processCallback();
  }, [location, navigate]);

  if (loading && !error) {
    return <div className="loading">Kimlik doğrulama yapılıyor...</div>;
  }

  if (error) {
    return (
      <div className="error">
        <p>Kimlik doğrulama hatası: {error}</p>
        <button onClick={() => navigate('/login')}>Giriş sayfasına dön</button>
      </div>
    );
  }

  return null;
};

export default SocialCallback;
```

### Bağlantı Kurulması

Router içinde callback sayfası için route ekleyin:

```jsx
<Routes>
  <Route path="/auth/social-callback" element={<SocialCallback />} />
  {/* ... diğer route'lar ... */}
</Routes>
```

## 3. Kullanıcı Oturumu Yönetimi

### Token İle Axios İsteklerini Yapılandırma

```jsx
import axios from 'axios';

// Axios instance oluştur
const api = axios.create({
  baseURL: 'http://localhost:3004/api',
});

// İstek interceptor'ı
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Yanıt interceptor'ı (opsiyonel)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Token süresi dolduysa otomatik çıkış yap
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### Auth Context

```jsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../utils/api';

// Context oluştur
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sayfa yüklendiğinde kullanıcıyı kontrol et
  useEffect(() => {
    const checkUser = async () => {
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        setLoading(false);
        return;
      }
      
      try {
        const response = await api.get('/auth/currentUser');
        setUser(response.data.user);
      } catch (err) {
        console.error('Kullanıcı bilgileri alınamadı:', err);
        setError(err);
        // Token hatalıysa temizle
        localStorage.removeItem('authToken');
      } finally {
        setLoading(false);
      }
    };
    
    checkUser();
  }, []);

  // Çıkış yapma işlevi
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Çıkış yaparken hata:', err);
    } finally {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      setUser(null);
      window.location.href = '/login';
    }
  };

  const value = {
    user,
    setUser,
    loading,
    error,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook oluştur
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth hook'u AuthProvider içinde kullanılmalıdır');
  }
  return context;
};
```

### Ana App Dosyasında Kullanımı

```jsx
import { AuthProvider } from './contexts/AuthContext';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
```

## 4. Korumalı Rotalar

```jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    // Yükleme göster
    return <div>Yükleniyor...</div>; 
  }
  
  if (!isAuthenticated) {
    // Login sayfasına yönlendir
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

export default ProtectedRoute;
```

### Router Ayarları

```jsx
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import SocialCallback from './pages/SocialCallback';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/auth/social-callback" element={<SocialCallback />} />
      
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } 
      />
      
      {/* Diğer korumalı rotalar */}
      
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
};

export default AppRoutes;
```

## 5. Önemli Notlar

1. **Google Client ID**: Projenizin `.env` dosyasında saklanmalıdır:
   ```
   REACT_APP_GOOGLE_CLIENT_ID=974504980015-2n6mis0omh2mot251nok4fq41ptgbqn0.apps.googleusercontent.com
   ```

2. **API URL**: API URL'si de `.env` dosyasında saklanmalıdır:
   ```
   REACT_APP_API_URL=http://localhost:3004
   ```

3. **Google OAuth Yönlendirme URL'leri**: Google Cloud Console'da aşağıdaki URL'leri yetkilendirmeniz gerekir:
   - `http://localhost:3000`  (Frontend)
   - `http://localhost:3004/api/auth/google/callback` (Backend callback)

4. **CORS Ayarları**: Frontend ve backend arasındaki CORS sorunlarını önlemek için backend'deki CORS yapılandırmasının doğru olduğundan emin olun.

5. **Kimlik Doğrulama Token'ı**: JWT tokenları kullanıldığından, uygulamanızın güvenliği için tokenların güvenli bir şekilde saklanması ve işlenmesi önemlidir.

## 6. Sorun Giderme

1. **"Popup Closed By User" Hatası**:
   - Kullanıcı popup'ı kapattığında oluşur, kullanıcıya tekrar denemesini isteyin.

2. **"idpiframe_initialization_failed" Hatası**:
   - Genellikle Google Client ID'si yanlış veya eksikse görülür.
   - Cookie ayarlarıyla ilgili sorunlardan da kaynaklanabilir.

3. **401 Unauthorized Hatası**:
   - Backend tarafında token doğrulama hatası olabilir.
   - Google hesabı kısıtlamaları veya izin sorunları kontrol edilmelidir.

4. **CORS Hataları**:
   - Backend'in frontend kaynaklı isteklere izin verdiğinden emin olun.
   - Tarayıcının CORS politikalarını kontrol edin. 