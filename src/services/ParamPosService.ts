import axios, { AxiosError } from "axios";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import { parseStringPromise } from "xml2js";

dotenv.config();

interface PaymentResponse {
  TURKPOS_RETVAL_Sonuc: number;
  TURKPOS_RETVAL_Sonuc_Str: string;
  TURKPOS_RETVAL_GUID: string;
  TURKPOS_RETVAL_Islem_Tarih: string;
  TURKPOS_RETVAL_Dekont_ID: string;
  TURKPOS_RETVAL_Tahsilat_Tutari: string;
  TURKPOS_RETVAL_Odeme_Tutari: string;
  TURKPOS_RETVAL_Siparis_ID: string;
  TURKPOS_RETVAL_Islem_ID: string;
  UCD_URL?: string;
  UCD_HTML?: string;
  UCD_MD?: string;
  isRedirect?: boolean;
  html?: string;
}

interface InitializePaymentResponse {
  Islem_ID: string;
  UCD_URL?: string;
  UCD_HTML?: string;
  UCD_MD?: string;
  Siparis_ID: string;
  Sonuc: number;
  Sonuc_Str: string;
  Banka_Sonuc_Kod?: string;
  isRedirect: boolean;
}

interface PaymentParams {
  amount: number;
  cardNumber: string;
  cardHolderName: string;
  expireMonth: string;
  expireYear: string;
  cvc: string;
  installment?: number;
  is3D?: boolean;
  userId?: string;
  ipAddress?: string;
}

interface CompletePaymentParams {
  ucdMD: string;
  islemId: string;
  siparisId: string;
}

class ParamPosService {
  private clientCode: string;
  private clientUsername: string;
  private clientPassword: string;
  private guid: string;
  private baseUrl: string;
  private successUrl: string;
  private errorUrl: string;

  constructor() {
    this.clientCode = process.env.PARAM_CLIENT_CODE || "";
    this.clientUsername = process.env.PARAM_CLIENT_USERNAME || "";
    this.clientPassword = process.env.PARAM_CLIENT_PASSWORD || "";
    this.guid = process.env.PARAM_GUID || "";
    this.baseUrl =
      process.env.PARAM_BASE_URL ||
      "https://posws.param.com.tr/turkpos.ws/service_turkpos_prod.asmx";
    this.successUrl = process.env.PARAM_SUCCESS_URL || "https://aiku.com.tr/payment/success";
    this.errorUrl = process.env.PARAM_ERROR_URL || "https://aiku.com.tr/payment/error";

    if (
      !this.clientCode ||
      !this.clientUsername ||
      !this.clientPassword ||
      !this.guid
    ) {
      throw new Error("Param POS kimlik bilgileri eksik");
    }
  }

  private validatePaymentParams(params: PaymentParams): void {
    if (!params) {
      throw new Error("Ödeme parametreleri eksik");
    }

    const { amount, cardNumber, cardHolderName, expireMonth, expireYear, cvc } =
      params;

    if (typeof amount !== "number" || amount <= 0) {
      throw new Error("Geçersiz ödeme tutarı");
    }

    if (!cardNumber || cardNumber.length < 15 || cardNumber.length > 16) {
      throw new Error("Geçersiz kart numarası");
    }

    if (!cardHolderName || cardHolderName.trim().length === 0) {
      throw new Error("Kart sahibi adı gerekli");
    }

    if (!expireMonth || !expireYear || !cvc) {
      throw new Error("Kart bilgileri eksik");
    }

    // Ay kontrolü (01-12)
    if (!/^(0[1-9]|1[0-2])$/.test(expireMonth)) {
      throw new Error("Geçersiz son kullanma ayı");
    }

    // Yıl kontrolü (YYYY formatında ve geçerli bir yıl)
    const currentYear = new Date().getFullYear();
    const year = parseInt(expireYear);
    if (isNaN(year) || year < currentYear) {
      throw new Error("Geçersiz son kullanma yılı");
    }

    // CVC kontrolü (3 veya 4 haneli)
    if (!/^\d{3,4}$/.test(cvc)) {
      throw new Error("Geçersiz CVC");
    }
  }

  private calculateHash(params: {
    installment: number;
    amount: number;
    totalAmount: number;
    orderId: string;
  }): string {
    const hashStr = `${this.clientCode}${this.guid}${
      params.installment
    }${params.amount.toFixed(2).replace(".", ",")}${params.totalAmount.toFixed(2).replace(".", ",")}${
      params.orderId
    }`;
    return crypto.createHash("sha1").update(hashStr).digest("base64");
  }

  private async parseSoapResponse(xmlResponse: string): Promise<any> {
    try {
      const result = await parseStringPromise(xmlResponse);

      if (
        !result ||
        !result["soap:Envelope"] ||
        !result["soap:Envelope"]["soap:Body"]
      ) {
        throw new Error("Geçersiz SOAP yanıtı formatı");
      }

      const body = result["soap:Envelope"]["soap:Body"];
      if (!Array.isArray(body) || body.length === 0) {
        throw new Error("SOAP Body boş veya geçersiz");
      }

      return body[0];
    } catch (error) {
      console.error("SOAP yanıtı parse edilemedi:", error);
      throw new Error("SOAP yanıtı işlenemedi");
    }
  }

  private async calculateCommission(
    amount: number,
    installment: number
  ): Promise<number> {
    try {
      if (typeof amount !== "number" || amount <= 0) {
        throw new Error("Geçersiz tutar");
      }

      // Komisyon oranı hesaplama için API çağrısı yapılabilir
      // Şimdilik sabit bir oran kullanıyoruz
      const commissionRate = installment > 1 ? 1.5 : 0;
      return Number((amount + (amount * commissionRate) / 100).toFixed(2));
    } catch (error) {
      console.error("Komisyon hesaplama hatası:", error);
      return amount;
    }
  }

  // İlk adım: 3D ekranını almak için TP_WMD_UCD isteği yapma
  async initializePayment(params: PaymentParams): Promise<InitializePaymentResponse> {
    try {
      this.validatePaymentParams(params);

      const {
        amount,
        cardNumber,
        cardHolderName,
        expireMonth,
        expireYear,
        cvc,
        installment = 1,
        userId,
        ipAddress = "127.0.0.1",
      } = params;

      // Test ortamında farklı bir endpoint kullanalım
      if (process.env.PARAM_CLIENT_CODE === '10738') {
        console.log("Test ortamı için alternatif endpoint kullanılıyor...");
        return this.initializeTestPayment(params);
      }

      // installment'ın en az 1 olmasını sağla
      const validInstallment = Math.max(1, installment);

      const orderId = `ORDER_${Date.now()}`;
      const totalAmount = await this.calculateCommission(amount, validInstallment);
      const hash = this.calculateHash({
        installment: validInstallment,
        amount: amount,
        totalAmount: totalAmount,
        orderId: orderId,
      });

      const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
        <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
          <soap:Body>
            <TP_WMD_UCD xmlns="https://turkpos.com.tr/">
              <G>
                <CLIENT_CODE>${this.clientCode}</CLIENT_CODE>
                <CLIENT_USERNAME>${this.clientUsername}</CLIENT_USERNAME>
                <CLIENT_PASSWORD>${this.clientPassword}</CLIENT_PASSWORD>
              </G>
              <GUID>${this.guid}</GUID>
              <KK_Sahibi>${cardHolderName}</KK_Sahibi>
              <KK_No>${cardNumber}</KK_No>
              <KK_SK_Ay>${expireMonth}</KK_SK_Ay>
              <KK_SK_Yil>${expireYear}</KK_SK_Yil>
              <KK_CVC>${cvc}</KK_CVC>
              <KK_Sahibi_GSM></KK_Sahibi_GSM>
              <Hata_URL>${this.errorUrl}</Hata_URL>
              <Basarili_URL>${this.successUrl}</Basarili_URL>
              <Siparis_ID>${orderId}</Siparis_ID>
              <Siparis_Aciklama></Siparis_Aciklama>
              <Taksit>${validInstallment}</Taksit>
              <Islem_Tutar>${amount.toFixed(2).replace(".", ",")}</Islem_Tutar>
              <Toplam_Tutar>${totalAmount.toFixed(2).replace(".", ",")}</Toplam_Tutar>
              <Islem_Hash>${hash}</Islem_Hash>
              <Islem_Guvenlik_Tip>3D</Islem_Guvenlik_Tip>
              <Islem_ID></Islem_ID>
              <IPAdr>${ipAddress}</IPAdr>
              <Ref_URL>${process.env.PRODUCTION_URL || "https://aiku.com.tr"}</Ref_URL>
              <Data1>${userId || ""}</Data1>
              <Data2></Data2>
              <Data3></Data3>
              <Data4></Data4>
              <Data5></Data5>
            </TP_WMD_UCD>
          </soap:Body>
        </soap:Envelope>`;

      console.log("TP_WMD_UCD İsteği:", soapEnvelope);

      const response = await axios.post(this.baseUrl, soapEnvelope, {
        headers: {
          "Content-Type": "text/xml;charset=UTF-8",
          SOAPAction: "https://turkpos.com.tr/TP_WMD_UCD",
        },
      });

      console.log("TP_WMD_UCD Yanıtı:", response.data);

      const parsedResponse = await this.parseSoapResponse(response.data);

      if (
        !parsedResponse["TP_WMD_UCDResponse"] ||
        !parsedResponse["TP_WMD_UCDResponse"][0] ||
        !parsedResponse["TP_WMD_UCDResponse"][0]["TP_WMD_UCDResult"] ||
        !parsedResponse["TP_WMD_UCDResponse"][0]["TP_WMD_UCDResult"][0]
      ) {
        console.error("Geçersiz yanıt formatı:", parsedResponse);
        throw new Error("Geçersiz ödeme yanıtı formatı");
      }

      const result = parsedResponse["TP_WMD_UCDResponse"][0]["TP_WMD_UCDResult"][0];

      // Başarısız işlem kontrolü - hem -1 hem de negatif değerleri kontrol et
      if (result.Sonuc && (result.Sonuc[0] === "-1" || parseInt(result.Sonuc[0]) < 0)) {
        throw new Error(result.Sonuc_Str ? result.Sonuc_Str[0] : "Ödeme işlemi başarısız");
      }

      // HTML veya URL kontrol et - Param bazen UCD_HTML, bazen UCD_URL dönüyor
      const hasRedirectContent = 
        (result.UCD_HTML && result.UCD_HTML[0]) || 
        (result.UCD_URL && result.UCD_URL[0]);

      if (!hasRedirectContent) {
        throw new Error("3D doğrulama içeriği alınamadı");
      }

      return {
        Islem_ID: result.Islem_ID ? result.Islem_ID[0] : "",
        UCD_URL: result.UCD_URL ? result.UCD_URL[0] : undefined,
        UCD_HTML: result.UCD_HTML ? result.UCD_HTML[0] : undefined,
        UCD_MD: result.UCD_MD ? result.UCD_MD[0] : undefined,
        Siparis_ID: result.Siparis_ID ? result.Siparis_ID[0] : orderId,
        Sonuc: parseInt(result.Sonuc[0]),
        Sonuc_Str: result.Sonuc_Str ? result.Sonuc_Str[0] : "",
        Banka_Sonuc_Kod: result.Banka_Sonuc_Kod ? result.Banka_Sonuc_Kod[0] : undefined,
        isRedirect: true // Her zaman 3D olduğu için her zaman yönlendirme yapılacak
      };
    } catch (error) {
      console.error("Ödeme başlatma hatası:", error);
      if (error instanceof AxiosError && error.response) {
        console.error("SOAP Hata Detayı:", error.response.data);
      }
      throw this.handleError(error);
    }
  }

  // Test ortamı için özel ödeme başlatma metodu
  private async initializeTestPayment(params: PaymentParams): Promise<InitializePaymentResponse> {
    try {
      const {
        amount,
        cardNumber,
        cardHolderName,
        expireMonth,
        expireYear,
        cvc,
        installment = 1,
        userId,
        ipAddress = "127.0.0.1",
      } = params;

      // Test ortamında komisyon hesaplama yapmadan doğrudan tutarı kullan
      const totalAmount = amount;
      const orderId = `ORDER_${Date.now()}`;
      
      // Test ortamında taksit değerini 0 olarak ayarla
      const validInstallment = 0;
      
      // -------------------- HASH HESAPLAMA METODU 1 --------------------
      // Hash için string oluşturma (FORMAT 1)
      const hashStr1 = `${this.clientCode}${this.guid}${validInstallment}${amount.toFixed(2).replace(".", ",")}${amount.toFixed(2).replace(".", ",")}${orderId}`;
      console.log("Hash String (Format 1):", hashStr1);
      const hash1 = crypto.createHash("sha1").update(hashStr1).digest("base64");
      console.log("Hash Value (Format 1):", hash1);

      // -------------------- HASH HESAPLAMA METODU 2 --------------------
      // Hash için string oluşturma (FORMAT 2 - GUID küçük harfli olabilir)
      const guidLowercase = this.guid.toLowerCase();
      const hashStr2 = `${this.clientCode}${guidLowercase}${validInstallment}${amount.toFixed(2).replace(".", ",")}${amount.toFixed(2).replace(".", ",")}${orderId}`;
      console.log("Hash String (Format 2):", hashStr2);
      const hash2 = crypto.createHash("sha1").update(hashStr2).digest("base64");
      console.log("Hash Value (Format 2):", hash2);

      // -------------------- HASH HESAPLAMA METODU 3 --------------------
      // Hash için string oluşturma (FORMAT 3 - noktalarla ve SHA256)
      const hashStr3 = `${this.clientCode}${this.guid}${validInstallment}${amount.toFixed(2)}${amount.toFixed(2)}${orderId}`;
      console.log("Hash String (Format 3):", hashStr3);
      const hash3 = crypto.createHash("sha256").update(hashStr3).digest("base64");
      console.log("Hash Value (Format 3):", hash3);

      // -------------------- HASH HESAPLAMA METODU 4 --------------------
      // Format 4 (virgül yerine nokta kullanarak)
      const hashStr4 = `${this.clientCode}${this.guid}${validInstallment}${amount.toFixed(2)}${amount.toFixed(2)}${orderId}`;
      console.log("Hash String (Format 4):", hashStr4);
      const hash4 = crypto.createHash("sha1").update(hashStr4).digest("base64");
      console.log("Hash Value (Format 4):", hash4);

      // Hangi hash metodunu kullanacağız? Format 1'i deneyelim önce
      const hashToUse = hash1;

      console.log("Kullanılacak Hash Değeri:", hashToUse);
      
      // TP_WMD_UCD yerine sadece TP_WMD_Pay deneyelim
      const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
        <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
          <soap:Body>
            <TP_WMD_UCD xmlns="https://turkpos.com.tr/">
              <G>
                <CLIENT_CODE>${this.clientCode}</CLIENT_CODE>
                <CLIENT_USERNAME>${this.clientUsername}</CLIENT_USERNAME>
                <CLIENT_PASSWORD>${this.clientPassword}</CLIENT_PASSWORD>
              </G>
              <GUID>${this.guid}</GUID>
              <KK_Sahibi>${cardHolderName}</KK_Sahibi>
              <KK_No>${cardNumber}</KK_No>
              <KK_SK_Ay>${expireMonth}</KK_SK_Ay>
              <KK_SK_Yil>${expireYear}</KK_SK_Yil>
              <KK_CVC>${cvc}</KK_CVC>
              <KK_Sahibi_GSM></KK_Sahibi_GSM>
              <Hata_URL>${this.errorUrl}</Hata_URL>
              <Basarili_URL>${this.successUrl}</Basarili_URL>
              <Siparis_ID>${orderId}</Siparis_ID>
              <Siparis_Aciklama>Test işlemi</Siparis_Aciklama>
              <Taksit>${validInstallment}</Taksit>
              <Islem_Tutar>${amount.toFixed(2).replace(".", ",")}</Islem_Tutar>
              <Toplam_Tutar>${amount.toFixed(2).replace(".", ",")}</Toplam_Tutar>
              <Islem_Hash>${hashToUse}</Islem_Hash>
              <Islem_Guvenlik_Tip>3D</Islem_Guvenlik_Tip>
              <Islem_ID></Islem_ID>
              <IPAdr>${ipAddress}</IPAdr>
              <Ref_URL>${process.env.PRODUCTION_URL || "https://aiku.com.tr"}</Ref_URL>
              <Data1>${userId || ""}</Data1>
              <Data2></Data2>
              <Data3></Data3>
              <Data4></Data4>
              <Data5></Data5>
            </TP_WMD_UCD>
          </soap:Body>
        </soap:Envelope>`;

      console.log("TP_WMD_UCD Test İsteği:", soapEnvelope);

      const response = await axios.post(this.baseUrl, soapEnvelope, {
        headers: {
          "Content-Type": "text/xml;charset=UTF-8",
          SOAPAction: "https://turkpos.com.tr/TP_WMD_UCD",
        },
      });

      console.log("TP_WMD_UCD Test Yanıtı:", response.data);
      
      // Eğer hash hatası alırsak
      if (response.data.includes("İşlem Hash geçersiz")) {
        console.log("İşlem Hash geçersiz hatası alındı, Format 2 ile tekrar deneniyor...");
        
        // Format 2 ile tekrar deneyelim
        const retryEnvelope = soapEnvelope.replace(`<Islem_Hash>${hashToUse}</Islem_Hash>`, 
                                                  `<Islem_Hash>${hash2}</Islem_Hash>`);
        
        console.log("Retry Envelope:", retryEnvelope);
        
        const retryResponse = await axios.post(this.baseUrl, retryEnvelope, {
          headers: {
            "Content-Type": "text/xml;charset=UTF-8",
            SOAPAction: "https://turkpos.com.tr/TP_WMD_UCD",
          },
        });
        
        console.log("TP_WMD_UCD Retry Yanıtı:", retryResponse.data);
        
        // Yine başarısız olursa, Format 4 ile deneyelim
        if (retryResponse.data.includes("İşlem Hash geçersiz")) {
          console.log("İşlem Hash hala geçersiz, Format 4 ile tekrar deneniyor...");
          
          const finalEnvelope = soapEnvelope.replace(`<Islem_Hash>${hashToUse}</Islem_Hash>`, 
                                                    `<Islem_Hash>${hash4}</Islem_Hash>`);
          
          console.log("Final Envelope:", finalEnvelope);
          
          const finalResponse = await axios.post(this.baseUrl, finalEnvelope, {
            headers: {
              "Content-Type": "text/xml;charset=UTF-8",
              SOAPAction: "https://turkpos.com.tr/TP_WMD_UCD",
            },
          });
          
          console.log("TP_WMD_UCD Final Yanıtı:", finalResponse.data);
          
          // Tüm hash değerleri başarısız olursa burada devam et
          return this.parseWMDResponse(finalResponse.data, orderId);
        }
        
        // Format 2 başarılı olursa
        return this.parseWMDResponse(retryResponse.data, orderId);
      }
      
      // İlk hash başarılı olursa
      return this.parseWMDResponse(response.data, orderId);
      
    } catch (error) {
      console.error("Test ödeme başlatma hatası:", error);
      if (error instanceof AxiosError && error.response) {
        console.error("Test SOAP Hata Detayı:", error.response.data);
      }
      throw this.handleError(error);
    }
  }
  
  // WMD Yanıtını Parse Eden Yardımcı Metot
  private async parseWMDResponse(responseData: string, orderId: string): Promise<InitializePaymentResponse> {
    const parsedResponse = await this.parseSoapResponse(responseData);

    if (
      !parsedResponse["TP_WMD_UCDResponse"] ||
      !parsedResponse["TP_WMD_UCDResponse"][0] ||
      !parsedResponse["TP_WMD_UCDResponse"][0]["TP_WMD_UCDResult"] ||
      !parsedResponse["TP_WMD_UCDResponse"][0]["TP_WMD_UCDResult"][0]
    ) {
      console.error("Geçersiz yanıt formatı:", parsedResponse);
      throw new Error("Geçersiz ödeme yanıtı formatı");
    }

    const result = parsedResponse["TP_WMD_UCDResponse"][0]["TP_WMD_UCDResult"][0];

    // Başarısız işlem kontrolü
    if (result.Sonuc && (result.Sonuc[0] === "-1" || parseInt(result.Sonuc[0]) < 0)) {
      throw new Error(result.Sonuc_Str ? result.Sonuc_Str[0] : "Ödeme işlemi başarısız");
    }

    // HTML veya URL kontrol et
    const hasRedirectContent = 
      (result.UCD_HTML && result.UCD_HTML[0]) || 
      (result.UCD_URL && result.UCD_URL[0]);

    if (!hasRedirectContent) {
      throw new Error("3D doğrulama içeriği alınamadı");
    }

    return {
      Islem_ID: result.Islem_ID ? result.Islem_ID[0] : "",
      UCD_URL: result.UCD_URL ? result.UCD_URL[0] : undefined,
      UCD_HTML: result.UCD_HTML ? result.UCD_HTML[0] : undefined,
      UCD_MD: result.UCD_MD ? result.UCD_MD[0] : undefined,
      Siparis_ID: result.Siparis_ID ? result.Siparis_ID[0] : orderId,
      Sonuc: parseInt(result.Sonuc[0]),
      Sonuc_Str: result.Sonuc_Str ? result.Sonuc_Str[0] : "",
      Banka_Sonuc_Kod: result.Banka_Sonuc_Kod ? result.Banka_Sonuc_Kod[0] : undefined,
      isRedirect: true
    };
  }

  // İkinci adım: 3D doğrulama sonrası TP_WMD_Pay isteği yapma
  async completePayment(params: CompletePaymentParams): Promise<PaymentResponse> {
    try {
      const { ucdMD, islemId, siparisId } = params;

      if (!ucdMD || !islemId || !siparisId) {
        throw new Error("Ödeme tamamlama için gerekli parametreler eksik");
      }

      const transactionGuid = uuidv4();

      const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
        <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
          <soap:Body>
            <TP_WMD_Pay xmlns="https://turkpos.com.tr/">
              <G>
                <CLIENT_CODE>${this.clientCode}</CLIENT_CODE>
                <CLIENT_USERNAME>${this.clientUsername}</CLIENT_USERNAME>
                <CLIENT_PASSWORD>${this.clientPassword}</CLIENT_PASSWORD>
              </G>
              <GUID>${this.guid}</GUID>
              <UCD_MD>${ucdMD}</UCD_MD>
              <Islem_GUID>${transactionGuid}</Islem_GUID>
              <Siparis_ID>${siparisId}</Siparis_ID>
            </TP_WMD_Pay>
          </soap:Body>
        </soap:Envelope>`;

      console.log("TP_WMD_Pay İsteği:", soapEnvelope);

      const response = await axios.post(this.baseUrl, soapEnvelope, {
        headers: {
          "Content-Type": "text/xml;charset=UTF-8",
          SOAPAction: "https://turkpos.com.tr/TP_WMD_Pay",
        },
      });

      console.log("TP_WMD_Pay Yanıtı:", response.data);

      const parsedResponse = await this.parseSoapResponse(response.data);

      if (
        !parsedResponse["TP_WMD_PayResponse"] ||
        !parsedResponse["TP_WMD_PayResponse"][0] ||
        !parsedResponse["TP_WMD_PayResponse"][0]["TP_WMD_PayResult"] ||
        !parsedResponse["TP_WMD_PayResponse"][0]["TP_WMD_PayResult"][0]
      ) {
        console.error("Geçersiz TP_WMD_Pay yanıt formatı:", parsedResponse);
        throw new Error("Geçersiz ödeme tamamlama yanıtı formatı");
      }

      const result = parsedResponse["TP_WMD_PayResponse"][0]["TP_WMD_PayResult"][0];

      // Başarısız işlem kontrolü
      if (result.Sonuc[0] === "-1" || parseInt(result.Sonuc[0]) === -1) {
        throw new Error(result.Sonuc_Str[0] || "Ödeme tamamlama işlemi başarısız");
      }

      return {
        TURKPOS_RETVAL_Sonuc: parseInt(result.Sonuc[0]),
        TURKPOS_RETVAL_Sonuc_Str: result.Sonuc_Str[0],
        TURKPOS_RETVAL_GUID: this.guid,
        TURKPOS_RETVAL_Islem_Tarih: new Date().toISOString(),
        TURKPOS_RETVAL_Dekont_ID: result.Dekont_ID ? result.Dekont_ID[0] : "",
        TURKPOS_RETVAL_Tahsilat_Tutari: result.Odeme_Tutari ? result.Odeme_Tutari[0] : "",
        TURKPOS_RETVAL_Odeme_Tutari: result.Odeme_Tutari ? result.Odeme_Tutari[0] : "",
        TURKPOS_RETVAL_Siparis_ID: siparisId,
        TURKPOS_RETVAL_Islem_ID: islemId,
      };
    } catch (error) {
      console.error("Ödeme tamamlama hatası:", error);
      if (error instanceof AxiosError && error.response) {
        console.error("SOAP Hata Detayı:", error.response.data);
      }
      throw this.handleError(error);
    }
  }

  // Eski payment metodu şimdi iki adımı kapsıyor
  async payment(params: PaymentParams): Promise<PaymentResponse> {
    try {
      // is3D parametresini true olarak zorla
      params.is3D = true;
      
      // İlk adım: 3D ekranını alma
      const initResponse = await this.initializePayment(params);
      
      // Hangi içerik dönmüşse onu kullan (UCD_HTML veya UCD_URL)
      const redirectContent = initResponse.UCD_HTML || initResponse.UCD_URL || "";
      
      // 3D işleminde her zaman URL veya HTML içeriğini döndür
      return {
        TURKPOS_RETVAL_Sonuc: initResponse.Sonuc,
        TURKPOS_RETVAL_Sonuc_Str: initResponse.Sonuc_Str,
        TURKPOS_RETVAL_GUID: this.guid,
        TURKPOS_RETVAL_Islem_Tarih: new Date().toISOString(),
        TURKPOS_RETVAL_Dekont_ID: "",
        TURKPOS_RETVAL_Tahsilat_Tutari: params.amount.toString(),
        TURKPOS_RETVAL_Odeme_Tutari: params.amount.toString(),
        TURKPOS_RETVAL_Siparis_ID: initResponse.Siparis_ID,
        TURKPOS_RETVAL_Islem_ID: initResponse.Islem_ID,
        UCD_URL: initResponse.UCD_URL,
        UCD_HTML: initResponse.UCD_HTML,
        UCD_MD: initResponse.UCD_MD,
        isRedirect: true,
        html: redirectContent
      };
      
      // Not: Burada ikinci adım olan completePayment() metodu kullanıcı 3D sayfasını 
      // doğruladıktan sonra callback URL'inden çağrılacak
    } catch (error) {
      console.error("Ödeme hatası:", error);
      throw this.handleError(error);
    }
  }

  async saveCard(params: {
    userId: string;
    cardNumber: string;
    cardHolderName: string;
    expireMonth: string;
    expireYear: string;
    cvc: string;
  }) {
    try {
      const {
        userId,
        cardNumber,
        cardHolderName,
        expireMonth,
        expireYear,
        cvc,
      } = params;

      const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
        <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
          <soap:Body>
            <KK_Sakli_Liste xmlns="https://turkpos.com.tr/">
              <G>
                <CLIENT_CODE>${this.clientCode}</CLIENT_CODE>
                <CLIENT_USERNAME>${this.clientUsername}</CLIENT_USERNAME>
                <CLIENT_PASSWORD>${this.clientPassword}</CLIENT_PASSWORD>
              </G>
              <GUID>${this.guid}</GUID>
              <KK_Sahibi>${cardHolderName}</KK_Sahibi>
              <KK_No>${cardNumber}</KK_No>
              <KK_SK_Ay>${expireMonth}</KK_SK_Ay>
              <KK_SK_Yil>${expireYear}</KK_SK_Yil>
              <KK_CVC>${cvc}</KK_CVC>
              <Data1>${userId}</Data1>
              <Data2>${process.env.CLIENT_URL}/payment/callback</Data2>
            </KK_Sakli_Liste>
          </soap:Body>
        </soap:Envelope>`;

      const response = await axios.post(this.baseUrl, soapEnvelope, {
        headers: {
          "Content-Type": "text/xml;charset=UTF-8",
          SOAPAction: "https://turkpos.com.tr/KK_Sakli_Liste",
        },
      });

      const parsedResponse = await this.parseSoapResponse(response.data);
      return parsedResponse.KK_Sakli_Liste_Response[0].KK_Sakli_Liste_Result[0];
    } catch (error) {
      console.error("Kart kaydetme hatası:", error);
      throw this.handleError(error);
    }
  }

  async deleteCard(cardToken: string) {
    try {
      const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
        <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
          <soap:Body>
            <KK_Sakli_Liste_Sil xmlns="https://turkpos.com.tr/">
              <G>
                <CLIENT_CODE>${this.clientCode}</CLIENT_CODE>
                <CLIENT_USERNAME>${this.clientUsername}</CLIENT_USERNAME>
                <CLIENT_PASSWORD>${this.clientPassword}</CLIENT_PASSWORD>
              </G>
              <GUID>${this.guid}</GUID>
              <KK_Islem_ID>${cardToken}</KK_Islem_ID>
            </KK_Sakli_Liste_Sil>
          </soap:Body>
        </soap:Envelope>`;

      const response = await axios.post(this.baseUrl, soapEnvelope, {
        headers: {
          "Content-Type": "text/xml;charset=UTF-8",
          SOAPAction: "https://turkpos.com.tr/KK_Sakli_Liste_Sil",
        },
      });

      const parsedResponse = await this.parseSoapResponse(response.data);
      return parsedResponse.KK_Sakli_Liste_Sil_Response[0]
        .KK_Sakli_Liste_Sil_Result[0];
    } catch (error) {
      console.error("Kart silme hatası:", error);
      throw this.handleError(error);
    }
  }

  private handleError(error: any): Error {
    if (error instanceof AxiosError) {
      const response = error.response?.data;
      if (response) {
        return new Error(
          `İşlem başarısız: ${response.message || error.message}`
        );
      }
    }
    return new Error(error.message || "Beklenmeyen bir hata oluştu");
  }
}

export default new ParamPosService();
