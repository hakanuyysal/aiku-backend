# Ödeme Durumu Kullanım Kılavuzu

## Giriş

Bu dokümanda, ParamPosService ile yapılan ödeme işlemlerinin frontend'de nasıl yönetileceği açıklanmaktadır. Ödeme işlemi iki aşamadan oluşur:

1. **Ödeme Başlatma**: 3D doğrulama sayfasına yönlendirme
2. **Ödeme Tamamlama**: 3D doğrulama sonrası ödeme sonucunu alma

## Ödeme Durumu Alanları

Her iki aşamada da API'den aşağıdaki alanlar döner:

- `status`: Ödemenin durumunu belirten metin ("pending_3d", "success", "failure")
- `success`: İşlemin başarılı olup olmadığını belirten boolean değer (true/false)
- `message`: Kullanıcıya gösterilebilecek mesaj
- `isRedirect`: Yönlendirme yapılıp yapılmayacağını belirten boolean değer
- `html` veya `UCD_URL`: 3D doğrulama için yönlendirme bilgileri

## 1. Ödeme Başlatma

### API İsteği

```javascript
const initiatePayment = async (paymentData) => {
  try {
    const response = await api.post('/payment/process', paymentData);
    return response.data;
  } catch (error) {
    throw error;
  }
};
```

### Yanıt İşleme

```javascript
const handlePaymentInitiation = async () => {
  try {
    const paymentData = {
      amount: 100.50,
      cardNumber: "4111111111111111",
      cardHolderName: "Test User",
      expireMonth: "12",
      expireYear: "2030",
      cvc: "123"
    };
    
    const response = await initiatePayment(paymentData);
    
    // Başarılı başlatma ve 3D yönlendirme gerekiyorsa
    if (response.success && response.status === "pending_3d" && response.isRedirect) {
      // HTML içeriği varsa
      if (response.html) {
        // 1. Seçenek: Yeni bir div içinde göster
        const container = document.createElement('div');
        container.innerHTML = response.html;
        document.body.appendChild(container);
        
        // 2. Seçenek: Modal içinde göster
        setPaymentModalContent(response.html);
        setPaymentModalVisible(true);
        
        // 3. Seçenek: iframe içinde göster
        setIframeContent(response.html);
      } 
      // URL varsa
      else if (response.UCD_URL) {
        // Direkt yönlendir
        window.location.href = response.UCD_URL;
        
        // Veya yeni sekmede aç
        // window.open(response.UCD_URL, '_blank');
      }
    } 
    // Başarısız başlatma
    else {
      // Hata mesajını göster
      showErrorNotification(response.message || "Ödeme başlatılamadı");
    }
  } catch (error) {
    showErrorNotification("Ödeme işlemi sırasında bir hata oluştu");
  }
};
```

## 2. Ödeme Tamamlama (Callback)

3D doğrulama sonrası banka, kullanıcıyı uygulamanızın callback URL'ine yönlendirecektir. Bu URL'de ödeme tamamlama işlemi yapılır.

### Callback Sayfasında

```javascript
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const PaymentCallback = () => {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  
  useEffect(() => {
    const completePayment = async () => {
      try {
        // URL'den parametreleri al
        const params = new URLSearchParams(location.search);
        const paymentData = {
          ucdMD: params.get('md') || '',
          siparisId: params.get('oid') || '',
          islemGuid: params.get('gid') || ''
        };
        
        // Eksik parametre kontrolü
        if (!paymentData.ucdMD || !paymentData.siparisId) {
          throw new Error('Geçersiz ödeme yanıtı');
        }
        
        // Ödeme tamamlama isteği
        const response = await api.post('/payment/complete', paymentData);
        setResult(response.data);
        
        // Başarılı ödeme
        if (response.data.success) {
          // Başarılı sayfasına yönlendir
          setTimeout(() => {
            navigate('/payment/success', { 
              state: { 
                paymentResult: response.data 
              } 
            });
          }, 2000);
        } 
        // Başarısız ödeme
        else {
          // Hata sayfasına yönlendir
          setTimeout(() => {
            navigate('/payment/error', { 
              state: { 
                paymentResult: response.data 
              } 
            });
          }, 2000);
        }
      } catch (error) {
        setResult({
          success: false,
          message: error.message || 'Ödeme tamamlama sırasında bir hata oluştu'
        });
        
        // Hata sayfasına yönlendir
        setTimeout(() => {
          navigate('/payment/error');
        }, 2000);
      } finally {
        setLoading(false);
      }
    };
    
    completePayment();
  }, [location, navigate]);
  
  return (
    <div className="payment-callback">
      {loading ? (
        <div className="loading">
          <p>Ödeme işlemi tamamlanıyor...</p>
          <div className="spinner"></div>
        </div>
      ) : result && (
        <div className={`result ${result.success ? 'success' : 'error'}`}>
          <h2>{result.success ? 'Ödeme Başarılı!' : 'Ödeme Başarısız!'}</h2>
          <p>{result.message}</p>
        </div>
      )}
    </div>
  );
};

export default PaymentCallback;
```

## 3. Başarılı ve Başarısız Durumları Gösterme

### Başarılı Ödeme Sayfası

```javascript
import { useLocation } from 'react-router-dom';

const PaymentSuccess = () => {
  const location = useLocation();
  const paymentResult = location.state?.paymentResult || {};
  
  return (
    <div className="payment-success">
      <div className="success-icon">✓</div>
      <h1>Ödeme Başarılı</h1>
      <p>{paymentResult.message || 'Ödemeniz başarıyla tamamlandı.'}</p>
      
      <div className="payment-details">
        <h2>Ödeme Detayları</h2>
        <div className="detail-row">
          <span>Sipariş Numarası:</span>
          <span>{paymentResult.TURKPOS_RETVAL_Siparis_ID || '-'}</span>
        </div>
        <div className="detail-row">
          <span>Ödeme Tutarı:</span>
          <span>{paymentResult.TURKPOS_RETVAL_Odeme_Tutari || '0'} TL</span>
        </div>
        <div className="detail-row">
          <span>İşlem Tarihi:</span>
          <span>{paymentResult.TURKPOS_RETVAL_Islem_Tarih || '-'}</span>
        </div>
        <div className="detail-row">
          <span>Dekont No:</span>
          <span>{paymentResult.TURKPOS_RETVAL_Dekont_ID || '-'}</span>
        </div>
      </div>
      
      <div className="actions">
        <button onClick={() => window.location.href = '/orders'}>
          Siparişlerim
        </button>
        <button onClick={() => window.location.href = '/'}>
          Anasayfaya Dön
        </button>
      </div>
    </div>
  );
};
```

### Başarısız Ödeme Sayfası

```javascript
import { useLocation } from 'react-router-dom';

const PaymentError = () => {
  const location = useLocation();
  const paymentResult = location.state?.paymentResult || {};
  
  return (
    <div className="payment-error">
      <div className="error-icon">✗</div>
      <h1>Ödeme Başarısız</h1>
      <p>{paymentResult.message || 'Ödeme işlemi sırasında bir hata oluştu.'}</p>
      
      <div className="actions">
        <button onClick={() => window.location.href = '/checkout'}>
          Tekrar Dene
        </button>
        <button onClick={() => window.location.href = '/'}>
          Anasayfaya Dön
        </button>
      </div>
    </div>
  );
};
```

## 4. Durum Kodları Özeti

| Durum Kodu | Açıklama | Ne Yapılmalı |
|------------|----------|--------------|
| pending_3d | 3D doğrulama bekliyor | Kullanıcıyı 3D sayfasına yönlendir |
| success | Ödeme başarılı | Başarılı sayfasını göster, sipariş tamamlandı |
| failure | Ödeme başarısız | Hata mesajını göster, tekrar deneme seçeneği sun |

## 5. Önemli Notlar

1. 3D doğrulama sayfasından dönen yanıtı mutlaka `/payment/complete` endpoint'i ile doğrulayın.
2. Yönlendirme sırasında ödeme bilgilerini URL'de açık olarak göndermekten kaçının.
3. Ödeme sonucunu hem frontend'de gösterin hem de backend'de kaydedin.
4. Müşteriye ödeme sonucu hakkında e-posta bildirimi göndermeyi düşünün.
5. Tüm ödeme işlemlerini loglayın ve takip edin. 