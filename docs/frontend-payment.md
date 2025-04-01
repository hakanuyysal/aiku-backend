# 3D Secure Ödeme Tamamlama (TP_WMD_PAY)

## TP_WMD_UCD Yanıtından Alınan Değerler

TP_WMD_UCD yanıtından şu değerleri almanız ve saklamanız gerekiyor:

1. `Islem_ID`: 2224064075
2. `UCD_MD`: eyJ2ZXJzaW9uIjoiMC4wMyIsImV4cGlyeSI6IjI4MDUiLCJnb1N0YW1wIjoiZXlKaGJHY2lPaUpJVXpVeE1pSjku...
3. `Siparis_ID`: ORDER_1743547178690_fd597647

## TP_WMD_PAY İçin Yapılması Gerekenler

1. 3D Secure doğrulama sırasında bu değerleri localStorage'a kaydedin:

```javascript
// Backendden dönen yanıt
localStorage.setItem('param_ucd_md', 'eyJ2ZXJzaW9uIjoiMC4wMyIsImV4cGlyeSI6IjI4MDUiLCJnb1N0YW1wIjoiZXlKaGJHY2lPaUpJVXpVeE1pSjkuZXlKemRXSWlPaUl3TURBd01EQXdNREUwTVRJMU56UWlMQ0owYVcxbGIzVjBVMlZqYjI1a2N5STZORE15TURBd01EQXNJbkp2YkdWeklqb2lJaXdpWlhod0lqb3hOemcyTnpRM01UYzVmUS5JRG1vQ2dYT2FjVEF2R1FRVjgtYjVFdVY5TUV3MDhVTmFjRm4tNzNlVGJidG9TaW41MzNVdy1XYWVMNlVyOTBlcGNEcmlsVEpRWVA2a2JRX2xScWhxQSIsInRpbWUiOiIyMDI1MDQwMjAxMzkzOSIsIm1hYyI6IlBIVWhIQktVekpqeG9scDZKSVBYUVM3NTMwZ3RoUzE3Q1NXOVFPcllQdHhlOTNDbkxTeGRVL1REblAvZEFrVlFVTENkVURKYmI0UTdVK0Q5azlpLzlHWmtyeWhtbjc5MkNRYStyUlNoT2x2eitoS1krQkZveURRSEZ4aG1VUzA5LzkyZnR0enhJd1VDdEQ0Y2oxdFhqY3RuVlFkVTlQdm5LTUVlaWlEVnRrYUpES0RNNVVMNUVJczJVaEtNY3VQWnJQU0Z4a201b0VBNTU2ZTRjV1h4cnQ5bUNPUE1kLzdCcTFaemNkWUg3Y2FvNksyWC9JUXFBbkhxVmVWbHFUdlk2QlBiZTlNTDZScmEyN1U1OFFiOU91cE5UYXlFWHBuZFlKOGlyYXVOT2xXUjlRWHVvcmFFOWlWV1d5d0d0VFNDNEtDcXlLZDNUeTIxYkxucGV4aG5TQVx1MDAzZFx1MDAzZCIsImlkIjoiMDAxMjY1NGEzNjMyLWEyODItNDNkNi04ZDg0LWZkYzVkZDEwOWMzMyJ9');
localStorage.setItem('param_islem_id', '2224064075');
localStorage.setItem('param_siparis_id', 'ORDER_1743547178690_fd597647');
```

2. Banka 3D doğrulama sayfasından callback URL'inize döndüğünde (`/payment/callback`), localStorage'dan bu değerleri alıp ödemeyi tamamlayın:

```javascript
// Callback sayfasında
const completePayment = async () => {
  // localStorage'dan verileri al
  const ucdMD = localStorage.getItem('param_ucd_md');
  const islemId = localStorage.getItem('param_islem_id');
  const siparisId = localStorage.getItem('param_siparis_id');
  
  console.log('Ödeme tamamlama için değerler:', { ucdMD, islemId, siparisId });

  if (!ucdMD || !islemId || !siparisId) {
    console.error('Eksik ödeme bilgileri!');
    return;
  }

  // TP_WMD_PAY isteğini yap
  try {
    const response = await fetch('/api/payments/complete-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      },
      body: JSON.stringify({
        ucdMD,
        islemId,
        siparisId
      })
    });
    
    const result = await response.json();
    console.log('Ödeme tamamlama sonucu:', result);
    
    if (result.success) {
      // Başarılı ödeme
      // Kullanıcıyı başarı sayfasına yönlendir
    } else {
      // Başarısız ödeme
      console.error('Ödeme tamamlanamadı:', result.message);
    }
  } catch (error) {
    console.error('Ödeme tamamlama hatası:', error);
  }
};

// Sayfa yüklendiğinde ödemeyi tamamla
completePayment();
```

**ÖNEMLİ NOKTA:** 3D Secure doğrulaması başarılı olsa bile, bu ikinci adım (TP_WMD_PAY) yapılmazsa karttan para çekilmez! Bu nedenle callback sayfanızda bu kodu mutlaka çalıştırmanız gerekiyor.