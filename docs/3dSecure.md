# AIKU 3D Secure Ödeme Entegrasyonu Dokümantasyonu

## İçindekiler

1. [Genel Bakış](#genel-bakış)
2. [Ödeme İşlem Akışı](#ödeme-işlem-akışı)
3. [API Endpoint ve Yanıt Formatı](#api-endpoint-ve-yanıt-formatı)
4. [Frontend Entegrasyonu](#frontend-entegrasyonu)
5. [3D Secure Form Gösterimi](#3d-secure-form-gösterimi)
6. [Callback Yönetimi](#callback-yönetimi)
7. [Ödeme Tamamlama](#ödeme-tamamlama)
8. [Hata Yönetimi](#hata-yönetimi)
9. [Test Kartları](#test-kartları)
10. [Sıkça Sorulan Sorular](#sıkça-sorulan-sorular)

## Genel Bakış

AIKU ödeme sistemi, Param POS entegrasyonu üzerinden 3D Secure ödeme işlemlerini desteklemektedir. Bu dokümantasyon, frontend geliştiricileri için 3D Secure entegrasyonunun nasıl yapılacağını detaylı bir şekilde açıklamaktadır.

## Ödeme İşlem Akışı

3D Secure ödeme işlemi **zorunlu olarak iki adımda** gerçekleştirilir:

1. **İlk Adım (TP_WMD_UCD)**: Kart bilgileri gönderilerek 3D Secure doğrulama sayfası alınır
2. **İkinci Adım (TP_WMD_Pay)**: Kullanıcı 3D doğrulamayı tamamladıktan sonra, ödeme tamamlanır

> **ÖNEMLİ:** İkinci adım olan TP_WMD_Pay çağrısını mutlaka yapmanız gerekir. Bu çağrı olmadan, 3D doğrulama başarılı olsa bile bankadan para çekilmez!

![3D Secure Akış Diyagramı](https://www.aiku.com.tr/img/3d-flow.png)

## API Endpoint ve Yanıt Formatı

### 1. Ödeme İşlemi Başlatma

```
POST /api/payments/process-payment
```

#### İstek Gövdesi (Request Body)

```json
{
  "cardNumber": "4022774022774026",
  "cardHolderName": "test test",
  "expireMonth": "12",
  "expireYear": "2026",
  "cvc": "000",
  "amount": 1.00,
  "installment": 1
}
```

#### Başarılı Yanıt Örneği

```json
{
  "success": true,
  "data": {
    "TURKPOS_RETVAL_Sonuc": 1,
    "TURKPOS_RETVAL_Sonuc_Str": "İşlem Başarılı",
    "TURKPOS_RETVAL_GUID": "1B52D752-1980-4835-A0EC-30E3CB1077A5",
    "TURKPOS_RETVAL_Islem_Tarih": "2025-03-30T13:25:09.742Z",
    "TURKPOS_RETVAL_Dekont_ID": "",
    "TURKPOS_RETVAL_Tahsilat_Tutari": "1",
    "TURKPOS_RETVAL_Odeme_Tutari": "1",
    "TURKPOS_RETVAL_Siparis_ID": "ORDER_1743341109065_a08607c4",
    "TURKPOS_RETVAL_Islem_ID": "2221578869",
    "UCD_HTML": "<!DOCTYPE html PUBLIC \"-//W3C//DTD XHTML 1.0 Transitional//EN\" \"http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd\">...",
    "UCD_MD": "eyJpZCI6IjAxMTE3ZGIyNDcyYi01OGFlLTQzOTMtYmYwNC0wNzRkNWFkYjM2ZWUiLCJ0aW1lIjoiMjAyNTAzMzAxNjI1MDkiLCJ2ZXJzaW9uIjoiMC4wM...",
    "isRedirect": true,
    "html": "<!DOCTYPE html PUBLIC \"-//W3C//DTD XHTML 1.0 Transitional//EN\" \"http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd\">..."
  }
}
```

### 2. Ödeme Tamamlama (ÇOK ÖNEMLİ!)

```
POST /api/payments/complete-payment
```

#### İstek Gövdesi (Request Body)

```json
{
  "ucdMD": "eyJpZCI6IjAxMTE3ZGIyNDcyYi01OGFlLTQzOTMtYmYwNC0wNzRkNWFkYjM2ZWUiLCJ0aW1lIjoiMjAyNTAzMzAxNjI1MDkiLCJ2ZXJzaW9uIjoiMC4wM...",
  "islemId": "2221578869",
  "siparisId": "ORDER_1743341109065_a08607c4"
}
```

#### Başarılı Yanıt Örneği

```json
{
  "success": true,
  "data": {
    "TURKPOS_RETVAL_Sonuc": 1,
    "TURKPOS_RETVAL_Sonuc_Str": "İşlem Başarılı",
    "TURKPOS_RETVAL_GUID": "1B52D752-1980-4835-A0EC-30E3CB1077A5",
    "TURKPOS_RETVAL_Islem_Tarih": "2025-03-30T13:30:15.123Z",
    "TURKPOS_RETVAL_Dekont_ID": "12345678",
    "TURKPOS_RETVAL_Tahsilat_Tutari": "1",
    "TURKPOS_RETVAL_Odeme_Tutari": "1",
    "TURKPOS_RETVAL_Siparis_ID": "ORDER_1743341109065_a08607c4",
    "TURKPOS_RETVAL_Islem_ID": "2221578869"
  }
}
```

### Yanıtta Kullanılan Önemli Alanlar

- `success`: İşlemin başarılı olup olmadığını belirtir.
- `data.TURKPOS_RETVAL_Sonuc`: İşlem sonucu kodu (1: Başarılı)
- `data.TURKPOS_RETVAL_Islem_ID`: Ödeme tamamlama işleminde kullanılacak işlem ID'si
- `data.TURKPOS_RETVAL_Siparis_ID`: Ödeme tamamlama işleminde kullanılacak sipariş ID'si
- `data.UCD_MD`: 3D Secure doğrulama sonrası işlemi tamamlamak için gerekli token
- `data.isRedirect`: 3D Secure formuna yönlendirme yapılması gerektiğini belirtir
- `data.html`: 3D Secure formunun HTML içeriği

## Frontend Entegrasyonu

### 1. Ödeme Başlatma

```javascript
// Örnek ödeme formu
const paymentForm = document.getElementById('payment-form');

paymentForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = {
    cardNumber: document.getElementById('card-number').value.replace(/\s/g, ''),
    cardHolderName: document.getElementById('card-holder-name').value,
    expireMonth: document.getElementById('expire-month').value,
    expireYear: document.getElementById('expire-year').value,
    cvc: document.getElementById('cvc').value,
    amount: parseFloat(document.getElementById('amount').value),
    installment: parseInt(document.getElementById('installment').value) || 1
  };
  
  try {
    // Ödeme başlatma isteği
    const response = await fetch('/api/payments/process-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + getAuthToken() // Kullanıcı token'ı
      },
      body: JSON.stringify(formData)
    });
    
    const result = await response.json();
    
    if (!result.success) {
      showError(result.message);
      return;
    }
    
    // ÖNEMLİ: İşlem bilgilerini lokalde sakla (ödeme tamamlama için)
    savePaymentData(result.data);
    
    // 3D Secure formunu göster
    showSecureForm(result.data);
  } catch (error) {
    showError('Ödeme işlemi başlatılırken bir hata oluştu');
    console.error(error);
  }
});

// ÖNEMLİ: Ödeme tamamlama için gerekli bilgileri sakla
function savePaymentData(paymentResult) {
  localStorage.setItem('param_islem_id', paymentResult.TURKPOS_RETVAL_Islem_ID);
  localStorage.setItem('param_siparis_id', paymentResult.TURKPOS_RETVAL_Siparis_ID);
  localStorage.setItem('param_ucd_md', paymentResult.UCD_MD);
}
```

## 3D Secure Form Gösterimi

API yanıtında `isRedirect: true` değeri geldiğinde, kullanıcıyı 3D Secure doğrulama sayfasına yönlendirmeniz gerekir. 3D Secure formunu göstermek için 3 farklı yöntem kullanabilirsiniz:

### 1. İframe Yöntemi (Önerilen)

```javascript
function showSecureForm(paymentData) {
  // Ödeme container'ı oluştur
  const paymentContainer = document.createElement('div');
  paymentContainer.id = 'payment-iframe-container';
  paymentContainer.style.position = 'fixed';
  paymentContainer.style.top = '0';
  paymentContainer.style.left = '0';
  paymentContainer.style.width = '100%';
  paymentContainer.style.height = '100%';
  paymentContainer.style.backgroundColor = 'rgba(0,0,0,0.5)';
  paymentContainer.style.zIndex = '10000';
  paymentContainer.style.display = 'flex';
  paymentContainer.style.justifyContent = 'center';
  paymentContainer.style.alignItems = 'center';
  
  // iframe oluştur
  const iframe = document.createElement('iframe');
  iframe.id = 'payment-iframe';
  iframe.style.width = '80%';
  iframe.style.height = '80%';
  iframe.style.maxWidth = '600px';
  iframe.style.maxHeight = '600px';
  iframe.style.border = 'none';
  iframe.style.borderRadius = '8px';
  iframe.style.backgroundColor = 'white';
  
  // HTML içeriğini iframe'e yükle
  iframe.srcdoc = paymentData.html;
  
  // Kapatma butonu ekle
  const closeButton = document.createElement('button');
  closeButton.textContent = 'İptal';
  closeButton.style.position = 'absolute';
  closeButton.style.top = '20px';
  closeButton.style.right = '20px';
  closeButton.style.padding = '8px 16px';
  closeButton.style.backgroundColor = '#f44336';
  closeButton.style.color = 'white';
  closeButton.style.border = 'none';
  closeButton.style.borderRadius = '4px';
  closeButton.style.cursor = 'pointer';
  
  closeButton.addEventListener('click', () => {
    document.body.removeChild(paymentContainer);
    // İptal işlemleri
    onPaymentCancelled();
  });
  
  // Elemanları ekle
  paymentContainer.appendChild(iframe);
  paymentContainer.appendChild(closeButton);
  document.body.appendChild(paymentContainer);
}
```

### 2. Yeni Pencere Yöntemi

```javascript
function showSecureForm(paymentData) {
  // Yeni pencere aç
  const paymentWindow = window.open('', 'AIKU_3D_Payment', 'width=800,height=600,status=yes,toolbar=no');
  
  // HTML içeriğini yaz
  paymentWindow.document.write(paymentData.html);
  
  // Pencere başlığını ayarla
  paymentWindow.document.title = '3D Secure Ödeme';
  
  // Pencere kapatıldığında işlem iptal edildi olarak kabul et
  const checkWindow = setInterval(() => {
    if (paymentWindow.closed) {
      clearInterval(checkWindow);
      onPaymentCancelled();
    }
  }, 500);
}
```

### 3. Redirect Yöntemi

```javascript
function showSecureForm(paymentData) {
  // HTML içeriğini geçici bir sayfaya kaydet ve yönlendir
  sessionStorage.setItem('3d_secure_html', paymentData.html);
  window.location.href = '/payment/3d-secure';
}

// /payment/3d-secure sayfasında
window.addEventListener('DOMContentLoaded', () => {
  const htmlContent = sessionStorage.getItem('3d_secure_html');
  if (!htmlContent) {
    window.location.href = '/payment';
    return;
  }
  
  // HTML içeriğini sayfaya yükle
  document.body.innerHTML = htmlContent;
  
  // Temizle
  sessionStorage.removeItem('3d_secure_html');
});
```

## Callback Yönetimi

3D Secure doğrulama tamamlandıktan sonra, banka tarafından belirtilen callback URL'ye yönlendirme yapılır. Bu URL'yi `Basarili_URL` ve `Hata_URL` parametreleriyle backend'de konfigüre etmiş olmalısınız.

### Callback Sayfası Oluşturma

```javascript
// /payment/callback.js
document.addEventListener('DOMContentLoaded', async () => {
  // URL parametrelerini al
  const urlParams = new URLSearchParams(window.location.search);
  const status = urlParams.get('status');
  
  // UCD_MD parametresini URL'den veya localStorage'dan al
  const ucdMD = urlParams.get('UCD_MD') || localStorage.getItem('param_ucd_md');
  
  if (!ucdMD) {
    showError('Ödeme bilgileri eksik');
    return;
  }
  
  // Diğer gerekli bilgileri localStorage'dan al
  const islemId = localStorage.getItem('param_islem_id');
  const siparisId = localStorage.getItem('param_siparis_id');
  
  if (!islemId || !siparisId) {
    showError('Ödeme işlemi bilgileri eksik');
    return;
  }
  
  // Ödemeyi tamamla - ÇOK ÖNEMLİ!
  await completePayment(ucdMD, islemId, siparisId);
});
```

## Ödeme Tamamlama

3D doğrulama tamamlandıktan sonra, ödeme işlemini tamamlamak için backend'e istek yapmanız **ZORUNLUDUR**. Bu adım atlanırsa, kullanıcı 3D doğrulamayı başarıyla tamamlasa bile bankadan para çekilmez!

```javascript
async function completePayment(ucdMD, islemId, siparisId) {
  try {
    showLoadingSpinner('Ödeme tamamlanıyor...');
    
    // ÖNEMLİ: Bu istek mutlaka yapılmalıdır, yoksa bankadan para çekilmez!
    const response = await fetch('/api/payments/complete-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + getAuthToken()
      },
      body: JSON.stringify({
        ucdMD: ucdMD,
        islemId: islemId,
        siparisId: siparisId
      })
    });
    
    const result = await response.json();
    
    hideLoadingSpinner();
    
    if (result.success) {
      // Ödeme başarılı
      clearPaymentStorage();
      showSuccessPage(result.data);
    } else {
      // Ödeme başarısız
      showError(result.message || 'Ödeme işlemi tamamlanamadı');
    }
  } catch (error) {
    hideLoadingSpinner();
    showError('Ödeme tamamlanırken bir hata oluştu');
    console.error(error);
  }
}

function clearPaymentStorage() {
  localStorage.removeItem('param_islem_id');
  localStorage.removeItem('param_siparis_id');
  localStorage.removeItem('param_ucd_md');
}
```

## Hata Yönetimi

Ödeme işlemi sırasında çeşitli hatalar oluşabilir. Bu hataları düzgün bir şekilde kullanıcıya göstermelisiniz:

```javascript
function showError(message) {
  const errorContainer = document.getElementById('payment-error') || createErrorContainer();
  errorContainer.textContent = message;
  errorContainer.style.display = 'block';
  
  // 5 saniye sonra otomatik kapat
  setTimeout(() => {
    errorContainer.style.display = 'none';
  }, 5000);
}

function createErrorContainer() {
  const container = document.createElement('div');
  container.id = 'payment-error';
  container.style.position = 'fixed';
  container.style.top = '20px';
  container.style.left = '50%';
  container.style.transform = 'translateX(-50%)';
  container.style.backgroundColor = '#f44336';
  container.style.color = 'white';
  container.style.padding = '12px 24px';
  container.style.borderRadius = '4px';
  container.style.zIndex = '10001';
  container.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
  document.body.appendChild(container);
  return container;
}
```

## Test Kartları

Test ortamında aşağıdaki test kartlarını kullanabilirsiniz:

| Kart No | SKT (MM/YY) | CVC | Kart Sahibi |
|---------|-------------|-----|------------|
| 4022774022774026 | 12/26 | 000 | Test User |
| 5209409745570011 | 05/28 | 103 | Hakan Uysal |

## Sıkça Sorulan Sorular

### 3D doğrulama başarılı ama bankadan para çekilmiyor, neden?
Param entegrasyonundaki en yaygın sorun, 3D doğrulama sonrası TP_WMD_Pay API'sinin çağrılmamasıdır. 3D akışı iki adımdan oluşur:
1. TP_WMD_UCD: 3D doğrulama sayfasını alır
2. TP_WMD_Pay: 3D doğrulama tamamlandıktan sonra bankadan parayı çeker

İkinci adımı atlarsanız, kullanıcı 3D doğrulamayı başarıyla tamamlasa bile ödeme gerçekleşmez. Bu nedenle **callback sayfanızda mutlaka `completePayment()` fonksiyonunu çağırmalısınız**.

### 3D Secure HTML içeriği yüklenmiyor, ne yapmalıyım?
Tarayıcı konsolunda hata mesajlarını kontrol edin. Cross-Origin Resource Sharing (CORS) hatası alıyorsanız, iframe'in içeriğini doğrudan doküman içine yazabilirsiniz.

### 3D doğrulama sonrası callback URL'ye yönlenme olmuyor
Backend'de tanımlanan `Basarili_URL` ve `Hata_URL` değerlerinin doğru olduğundan ve erişilebilir olduğundan emin olun.

### UCD_MD parametresi bulunamadı hatası alıyorum
Banka, callback URL'ye yönlendirme yaparken bu parametreyi göndermemiş olabilir. Bu durumda localStorage'da sakladığınız yedek değeri kullanmayı deneyin.

### API'de "isRedirect" alanı var ama kullanmıyorum
API yanıtında `isRedirect: true` değeri varsa, kullanıcının 3D Secure sayfasına yönlendirilmesi gerektiğini gösterir. Bu durumda `html` veya `UCD_HTML` alanındaki içeriği kullanıcıya göstermeniz gerekir.

---

Bu dokümantasyon en son 30 Mart 2025 tarihinde güncellenmiştir. Herhangi bir sorunuz veya geri bildiriminiz varsa, lütfen `dev@aiku.com.tr` adresine e-posta gönderin. 