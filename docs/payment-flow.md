# Param POS 3D Secure Ödeme Akışı

```
┌─────────────┐         ┌──────────────┐          ┌───────────────┐         ┌────────────┐
│   Kullanıcı │         │  Frontend    │          │   Backend     │         │  Param POS  │
└──────┬──────┘         └──────┬───────┘          └───────┬───────┘         └──────┬─────┘
       │                       │                          │                        │
       │  1. Ödeme Bilgileri   │                          │                        │
       │─────────────────────►│                          │                        │
       │                       │                          │                        │
       │                       │  2. initializePayment()  │                        │
       │                       │─────────────────────────►│                        │
       │                       │                          │                        │
       │                       │                          │    3. TP_WMD_UCD       │
       │                       │                          │───────────────────────►│
       │                       │                          │                        │
       │                       │                          │◄───────────────────────│
       │                       │                          │    4. UCD Yanıtı       │
       │                       │                          │  (Islem_ID,            │
       │                       │                          │   Islem_GUID,          │
       │                       │                          │   UCD_MD,              │
       │                       │                          │   Siparis_ID)          │
       │                       │                          │                        │
       │                       │◄─────────────────────────│                        │
       │                       │  5. 3D Secure HTML       │                        │
       │                       │                          │                        │
       │                       │  6. Değerleri sakla      │                        │
       │                       │  (localStorage)          │                        │
       │                       │  - param_islem_id        │                        │
       │                       │  - param_islem_guid      │                        │
       │                       │  - param_ucd_md          │                        │
       │                       │  - param_siparis_id      │                        │
       │                       │                          │                        │
       │◄──────────────────────│                          │                        │
       │  7. 3D Secure Form    │                          │                        │
       │                       │                          │                        │
       │  8. 3D Doğrulama      │                          │                        │
       │─────────────────────────────────────────────────────────────────────────►│
       │                       │                          │                        │
       │◄─────────────────────────────────────────────────────────────────────────│
       │  9. Banka Sayfasından │                          │                        │
       │     Callback URL'e    │                          │                        │
       │     Yönlendirme      │                          │                        │
       │                       │                          │                        │
       │  10. Callback sayfası │                          │                        │
       │─────────────────────►│                          │                        │
       │                       │                          │                        │
       │                       │  11. localStorage'dan    │                        │
       │                       │      değerleri al        │                        │
       │                       │                          │                        │
       │                       │  12. completePayment()   │                        │
       │                       │─────────────────────────►│                        │
       │                       │  (ucdMD, islemId,        │                        │
       │                       │   siparisId, islemGuid)  │                        │
       │                       │                          │                        │
       │                       │                          │   13. TP_WMD_PAY       │
       │                       │                          │───────────────────────►│
       │                       │                          │  (Islem_GUID önemli!)  │
       │                       │                          │                        │
       │                       │                          │◄───────────────────────│
       │                       │                          │   14. Ödeme Tamamlandı │
       │                       │                          │                        │
       │                       │◄─────────────────────────│                        │
       │                       │  15. Başarı/Hata Mesajı  │                        │
       │                       │                          │                        │
       │◄──────────────────────│                          │                        │
       │  16. Kullanıcıya      │                          │                        │
       │      Sonucu Göster    │                          │                        │
       │                       │                          │                        │
```

## Ödeme Akışı Adımları Açıklaması

1. **Kullanıcı ödeme bilgilerini girer**: Kart numarası, son kullanma tarihi, CVV ve diğer gerekli bilgiler.

2. **Frontend, backend'e `initializePayment` isteği yapar**: Kullanıcının girdiği ödeme bilgileri backend'e gönderilir.

3. **Backend, Param POS'a `TP_WMD_UCD` isteği yapar**: 3D Secure ekranını almak için ilk istek.

4. **Param POS, `TP_WMD_UCD` yanıtını gönderir**: Bu yanıtta önemli değerler bulunur:
   - `Islem_ID`: İşlem kimliği
   - `Islem_GUID`: İşlem GUID (ÇOK ÖNEMLİ!)
   - `UCD_MD`: 3D Secure doğrulama token'ı
   - `Siparis_ID`: Sipariş kimliği
   - `UCD_HTML` veya `UCD_URL`: 3D Secure formunun HTML içeriği veya URL'i

5. **Backend, 3D Secure form içeriğini frontend'e gönderir**: HTML içeriği veya redirect URL.

6. **Frontend, önemli değerleri `localStorage`'a kaydeder**:
   - `param_islem_id`
   - `param_islem_guid` (ÇOK ÖNEMLİ!)
   - `param_ucd_md`
   - `param_siparis_id`

7. **Kullanıcıya 3D Secure formu gösterilir**: Kullanıcı 3D Secure doğrulaması için banka sayfasına yönlendirilir.

8. **Kullanıcı 3D doğrulamayı tamamlar**: SMS kodu veya diğer doğrulama yöntemleri ile.

9. **Banka, kullanıcıyı callback URL'e yönlendirir**: 3D doğrulama tamamlandıktan sonra.

10. **Kullanıcı callback sayfasına gelir**: Frontend'de ödeme tamamlama süreci başlar.

11. **Frontend, `localStorage`'dan değerleri alır**: 6. adımda kaydedilen değerler.

12. **Frontend, backend'e `completePayment` isteği yapar**: Şu parametrelerle:
    - `ucdMD`: 3D Secure token'ı
    - `islemId`: İşlem kimliği
    - `siparisId`: Sipariş kimliği
    - `islemGuid`: İşlem GUID (ÇOK ÖNEMLİ!)

13. **Backend, Param POS'a `TP_WMD_PAY` isteği yapar**: Bu istek para çekme işlemini gerçekleştirir.
    - `Islem_GUID` parametresi ÇOK ÖNEMLİ! Bu parametre olmadan veya yanlış gönderilirse para çekilmez.

14. **Param POS, ödeme tamamlama sonucunu döndürür**: Başarılı veya başarısız.

15. **Backend, sonucu frontend'e iletir**: Başarı durumu ve ödeme detayları.

16. **Frontend, kullanıcıya sonucu gösterir**: Başarılı veya başarısız olduğunu bildiren ekran.

## Kritik Noktalar

1. **`Islem_GUID` çok önemlidir**: Bu değer, TP_WMD_UCD yanıtından gelir ve TP_WMD_PAY isteğinde mutlaka gönderilmelidir. Aksi takdirde, 3D Secure doğrulaması başarılı olsa bile karttan para çekilmez.

2. **LocalStorage'da değerleri saklayın**: 3D Secure doğrulaması sırasında sayfa yenilenebilir veya kullanıcı yönlendirilebilir. Bu nedenle, gerekli değerleri localStorage'da saklamak önemlidir.

3. **Hata yönetimi yapın**: Ödeme işlemlerinde her adımda hata kontrolü yapmalı ve kullanıcıya uygun mesajları göstermelisiniz.

4. **Güvenlik önlemleri alın**: Ödeme bilgilerini güvenli bir şekilde işleyin ve saklayın. 