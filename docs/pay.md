# 3D Secure Ödeme Sürecinde Param POS Para Çekimi Sorunu Çözümü

## Sorun

3D Secure doğrulaması başarıyla tamamlanıyor, ancak kullanıcı kartından ödeme tahsil edilmiyor.

## Sorunun Nedeni

Param POS entegrasyonunda, 3D Secure ödeme süreci **iki adımlı** bir işlemdir:

1. **İlk Adım (TP_WMD_UCD)**: Kart bilgileri gönderilerek 3D Secure doğrulama sayfası alınır.
2. **İkinci Adım (TP_WMD_Pay)**: Kullanıcı 3D doğrulamayı tamamladıktan sonra, bankadan para çekmek için ikinci bir istek yapılması gerekir.

Mevcut implementasyonda, 3D doğrulama işlemi başarılı olsa bile, ikinci adım olan `TP_WMD_Pay` isteği (complete-payment endpoint'i) çağrılmıyor. Bu nedenle bankadan para çekilmiyor.

## Çözüm

Frontend kodunda aşağıdaki düzenlemeleri yapmalısınız:

### 1. Callback Sayfasını Düzenleyin 

`/payment/callback` sayfasını bulun ve aşağıdaki kodu ekleyin veya var olanı bu şekilde düzenleyin:

```jsx
import React, { useEffect, useState } from 'react';
import paymentService from '../services/PaymentService';
import { useNavigate } from 'react-router-dom';

function PaymentCallback() {
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    async function completePaymentProcess() {
      try {
        // localStorage'dan gerekli verileri al
        const ucdMD = localStorage.getItem('param_ucd_md');
        const islemId = localStorage.getItem('param_islem_id');
        const siparisId = localStorage.getItem('param_siparis_id');
        
        console.log('Ödeme tamamlama verileri:', { ucdMD, islemId, siparisId });
        
        if (!ucdMD || !islemId || !siparisId) {
          console.error('Ödeme bilgileri eksik!');
          setStatus('error');
          setError('Ödeme bilgileri eksik veya geçersiz. Lütfen tekrar deneyin.');
          return;
        }
        
        // ÖNEMLİ: Bu çağrı ödemenin tamamlanması için şart
        const result = await paymentService.completePayment({
          ucdMD,
          islemId,
          siparisId
        });
        
        console.log('Ödeme tamamlama sonucu:', result);
        
        if (result.success) {
          // Başarılı ödeme işlemleri
          setStatus('success');
          
          // Ödeme bilgilerini temizle
          localStorage.removeItem('param_ucd_md');
          localStorage.removeItem('param_islem_id');
          localStorage.removeItem('param_siparis_id');
          
          // 2 saniye sonra başarılı sayfasına yönlendir
          setTimeout(() => {
            navigate('/payment/success');
          }, 2000);
        } else {
          // Hata durumu işlemleri
          setStatus('error');
          setError(result.message || 'Ödeme işlemi tamamlanamadı.');
        }
      } catch (error) {
        console.error('Ödeme tamamlama hatası:', error);
        setStatus('error');
        setError(error.message || 'Ödeme tamamlanırken bir hata oluştu.');
      }
    }
    
    completePaymentProcess();
  }, [navigate]);
  
  // Duruma göre içeriği göster
  return (
    <div className="payment-callback-container">
      <h1>Ödeme İşlemi</h1>
      
      {status === 'processing' && (
        <div className="processing">
          <p>Ödeme işleminiz tamamlanıyor, lütfen bekleyin...</p>
          <div className="spinner"></div>
        </div>
      )}
      
      {status === 'success' && (
        <div className="success">
          <p>Ödeme işleminiz başarıyla tamamlandı!</p>
          <p>Yönlendiriliyorsunuz...</p>
        </div>
      )}
      
      {status === 'error' && (
        <div className="error">
          <p>Ödeme işlemi sırasında bir hata oluştu:</p>
          <p>{error}</p>
          <button onClick={() => navigate('/payment')}>Tekrar Deneyin</button>
        </div>
      )}
    </div>
  );
}

export default PaymentCallback;
```

### 2. API Çağrısını Manuel Olarak Test Edin

Eğer sorun devam ederse, tarayıcı konsolunda aşağıdaki kodu çalıştırarak API çağrısını manuel olarak test edebilirsiniz:

```javascript
// Önce localStorage'dan verileri kontrol edin
console.log({
  ucdMD: localStorage.getItem('param_ucd_md'),
  islemId: localStorage.getItem('param_islem_id'),
  siparisId: localStorage.getItem('param_siparis_id'),
  token: localStorage.getItem('auth_token')
});

// Eğer veriler mevcutsa, manuel API çağrısı yapın
const data = {
  ucdMD: localStorage.getItem('param_ucd_md'),
  islemId: localStorage.getItem('param_islem_id'),
  siparisId: localStorage.getItem('param_siparis_id')
};

fetch('/api/payments/complete-payment', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
  },
  body: JSON.stringify(data)
})
.then(res => res.json())
.then(result => console.log('Ödeme tamamlama sonucu:', result))
.catch(err => console.error('Hata:', err));
```

### 3. Network Trafiğini Kontrol Edin

Tarayıcının Developer Tools -> Network sekmesinde, callback sayfası yüklendiğinde `/api/payments/complete-payment` endpointine bir POST isteği gönderilip gönderilmediğini kontrol edin.

- İstek gönderilmiyorsa: Callback bileşenindeki kodun çalıştığından emin olun.
- İstek gönderiliyorsa ama hata alıyorsa: Response detaylarını inceleyin.

### 4. Auth Token Kontrolü

Ödeme tamamlama isteği için auth token gereklidir. Callback sayfasında token'ın hala geçerli olduğundan emin olun:

```javascript
// Konsola yazarak token'ı kontrol edin
console.log('Auth Token:', localStorage.getItem('auth_token'));
```

Eğer token yoksa veya geçersizse, kullanıcıyı tekrar giriş yapmaya yönlendirmeniz gerekebilir.

## Önemli Notlar

1. 3D Secure doğrulama sonrası, `complete-payment` endpoint'i çağrılmazsa, banka tarafında doğrulama işlemi başarılı olsa bile para çekilmez.

2. Bu, Param POS entegrasyonunun normal davranışıdır. 3D doğrulama başarılı olsa bile, ödemenin tamamlanması için ikinci adım zorunludur.

3. Backend tarafında, gerekli endpoint'ler ve işlevler zaten hazırdır. Sadece frontend'de bu endpoint'e çağrı yapılması gerekmektedir.

4. Bu süreç sırasında hata ayıklama yapmak için konsol loglarını aktif tutmanız önerilir.

## Test Kartları

Test ortamında aşağıdaki test kartlarını kullanabilirsiniz:

| Kart No | SKT (MM/YY) | CVC | Kart Sahibi |
|---------|-------------|-----|------------|
| 4022774022774026 | 12/26 | 000 | Test User |
| 5209409745570011 | 05/28 | 103 | Hakan Uysal |

---

Bu dokümantasyon, sorunu çözmek için gerekli bilgileri içermektedir. Eğer sorun devam ederse, lütfen backend loglarını ve frontend konsol çıktılarını inceleyerek daha detaylı bir analiz yapın. 