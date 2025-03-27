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
  UCD_HTML?: string;
  isRedirect?: boolean;
  html?: string;
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

class ParamPosService {
  private clientCode: string;
  private clientUsername: string;
  private clientPassword: string;
  private guid: string;
  private baseUrl: string;

  constructor() {
    this.clientCode = process.env.PARAM_CLIENT_CODE || "";
    this.clientUsername = process.env.PARAM_CLIENT_USERNAME || "";
    this.clientPassword = process.env.PARAM_CLIENT_PASSWORD || "";
    this.guid = process.env.PARAM_GUID || "";
    this.baseUrl =
      process.env.PARAM_BASE_URL ||
      "https://posws.param.com.tr/turkpos.ws/service_turkpos_prod.asmx";

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
    amount: "5,00";
    totalAmount: "5,00";
    orderId: "1234567890";
  }): string {
    const hashStr = `${this.clientCode}${this.guid}${
      params.installment
    }${params.amount.toFixed(2)}${params.totalAmount.toFixed(2)}${
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

  async payment(params: PaymentParams): Promise<PaymentResponse> {
    try {
      // Parametreleri doğrula
      // this.validatePaymentParams(params);

      const {
        amount,
        cardNumber,
        cardHolderName,
        expireMonth,
        expireYear,
        cvc,
        installment = 1,
        is3D = true,
        userId,
        ipAddress = "127.0.0.1",
      } = params;

      const orderId = Date.now().toString();
      const totalAmount = await this.calculateCommission(amount, installment);
      const transactionGuid = uuidv4();
      const hash = this.calculateHash({
        installment,
        amount: "5,00",
        totalAmount: "5,00",
        orderId: "1234567890",
      });

      const commonParams = {
        G: {
          CLIENT_CODE: this.clientCode,
          CLIENT_USERNAME: this.clientUsername,
          CLIENT_PASSWORD: this.clientPassword,
        },
        GUID: this.guid,
        Islem_GUID: transactionGuid,
        KK_Sahibi: cardHolderName,
        KK_No: cardNumber,
        KK_SK_Ay: expireMonth,
        KK_SK_Yil: expireYear,
        KK_CVC: cvc,
        Taksit: "1",
        Islem_Tutar: "5,00",
        Toplam_Tutar: "5,00",
        Islem_Hash: hash,
        Siparis_ID: "1234567890",
        Islem_ID: orderId,
        IPAdr: ipAddress,
        Ref_URL: process.env.PRODUCTION_URL || "https://aiku.com.tr",
        Data1: userId || "",
        Data2: "",
        Data3: "",
        Data4: "",
        Data5: "",
      };

      const soapMethod = is3D ? "TP_WMD_UCD" : "TP_WMD_Pay";
      const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
        <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
          <soap:Body>
            <${soapMethod} xmlns="https://turkpos.com.tr/">
              ${Object.entries(commonParams)
                .map(([key, value]) => {
                  if (typeof value === "object") {
                    return `<${key}>${Object.entries(value)
                      .map(([k, v]) => `<${k}>${v}</${k}>`)
                      .join("")}</${key}>`;
                  }
                  return `<${key}>${value}</${key}>`;
                })
                .join("")}
            </${soapMethod}>
          </soap:Body>
        </soap:Envelope>`;

      console.log("SOAP İsteği:", soapEnvelope);

      const response = await axios.post(this.baseUrl, soapEnvelope, {
        headers: {
          "Content-Type": "text/xml;charset=UTF-8",
          SOAPAction: `https://turkpos.com.tr/${soapMethod}`,
        },
      });

      console.log("SOAP Yanıtı:", response.data);

      const parsedResponse = await this.parseSoapResponse(response.data);

      if (
        !parsedResponse[`${soapMethod}Response`] ||
        !parsedResponse[`${soapMethod}Response`][0] ||
        !parsedResponse[`${soapMethod}Response`][0][`${soapMethod}Result`] ||
        !parsedResponse[`${soapMethod}Response`][0][`${soapMethod}Result`][0]
      ) {
        console.error("Geçersiz yanıt formatı:", parsedResponse);
        throw new Error("Geçersiz ödeme yanıtı formatı");
      }

      const result =
        parsedResponse[`${soapMethod}Response`][0][`${soapMethod}Result`][0];

      // Başarısız işlem kontrolü
      if (result.Sonuc === "-1" || result.Sonuc === -1) {
        throw new Error(result.Sonuc_Str || "Ödeme işlemi başarısız");
      }

      // 3D yanıtını kontrol et
      if (is3D && result.UCD_HTML && result.UCD_HTML !== "NONSECURE") {
        return {
          TURKPOS_RETVAL_Sonuc: parseInt(result.Sonuc),
          TURKPOS_RETVAL_Sonuc_Str: result.Sonuc_Str || "",
          TURKPOS_RETVAL_GUID: this.guid,
          TURKPOS_RETVAL_Islem_Tarih: new Date().toISOString(),
          TURKPOS_RETVAL_Dekont_ID: result.Dekont_ID || "",
          TURKPOS_RETVAL_Tahsilat_Tutari: amount.toString(),
          TURKPOS_RETVAL_Odeme_Tutari: totalAmount.toString(),
          TURKPOS_RETVAL_Siparis_ID: orderId,
          TURKPOS_RETVAL_Islem_ID: result.Islem_ID || orderId,
          UCD_HTML: result.UCD_HTML,
          isRedirect: true,
          html: result.UCD_HTML,
        };
      }

      // Normal ödeme yanıtı
      return {
        TURKPOS_RETVAL_Sonuc: parseInt(result.Sonuc),
        TURKPOS_RETVAL_Sonuc_Str: result.Sonuc_Str || "",
        TURKPOS_RETVAL_GUID: this.guid,
        TURKPOS_RETVAL_Islem_Tarih: new Date().toISOString(),
        TURKPOS_RETVAL_Dekont_ID: result.Dekont_ID || "",
        TURKPOS_RETVAL_Tahsilat_Tutari: amount.toString(),
        TURKPOS_RETVAL_Odeme_Tutari: totalAmount.toString(),
        TURKPOS_RETVAL_Siparis_ID: orderId,
        TURKPOS_RETVAL_Islem_ID: result.Islem_ID || orderId,
      };
    } catch (error) {
      console.error("Ödeme hatası:", error);
      if (error instanceof AxiosError && error.response) {
        console.error("SOAP Hata Detayı:", error.response.data);
      }
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
