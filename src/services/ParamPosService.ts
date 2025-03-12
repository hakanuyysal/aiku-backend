import axios, { AxiosError } from 'axios';
import dotenv from 'dotenv';

dotenv.config();

class ParamPosService {
  private clientCode: string;
  private clientUsername: string;
  private clientPassword: string;
  private guid: string;
  private baseUrl: string;

  constructor() {
    this.clientCode = process.env.PARAM_CLIENT_CODE || '';
    this.clientUsername = process.env.PARAM_CLIENT_USERNAME || '';
    this.clientPassword = process.env.PARAM_CLIENT_PASSWORD || '';
    this.guid = process.env.PARAM_GUID || '';
    this.baseUrl = process.env.PARAM_BASE_URL || 'https://dev.param.com.tr/';

    // Başlangıçta credentials'ları kontrol et
    console.log('ParamPosService başlatılıyor:', {
      baseUrl: this.baseUrl,
      clientCode: this.clientCode ? 'Mevcut' : 'Eksik',
      clientUsername: this.clientUsername ? 'Mevcut' : 'Eksik',
      clientPassword: this.clientPassword ? 'Mevcut' : 'Eksik',
      guid: this.guid ? 'Mevcut' : 'Eksik'
    });
  }

  private async getToken(): Promise<string> {
    try {
      const url = this.baseUrl;
      
      console.log('Token isteği gönderiliyor...', {
        clientCode: this.clientCode,
        clientUsername: this.clientUsername,
        guid: this.guid,
        url
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
            </TP_WMD_UCD>
          </soap:Body>
        </soap:Envelope>`;

      const response = await axios.post(url, soapEnvelope, {
        headers: {
          'Content-Type': 'text/xml;charset=UTF-8',
          'SOAPAction': 'https://turkpos.com.tr/TP_WMD_UCD'
        }
      });

      console.log('Token yanıtı:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data
      });

      // SOAP yanıtını parse et
      const result = response.data;
      if (!result) {
        throw new Error('Token alınamadı: Yanıt boş');
      }

      return result;
    } catch (error) {
      if (error instanceof AxiosError) {
        console.error('Token alma hatası:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message,
          config: {
            url: error.config?.url,
            method: error.config?.method,
            headers: error.config?.headers,
            data: error.config?.data
          }
        });
        throw new Error(`Token alınamadı: ${error.response?.data?.message || error.message}`);
      }
      console.error('Beklenmeyen hata:', error);
      throw error;
    }
  }

  async saveCard(userId: string, cardNumber: string, cardHolderName: string, expireMonth: string, expireYear: string, cvc: string) {
    try {
      console.log('Kart kaydetme işlemi başlatılıyor...', {
        userId,
        cardHolderName,
        expireMonth,
        expireYear,
        cardNumberLength: cardNumber?.length,
        cvcLength: cvc?.length
      });

      const url = this.baseUrl;
      
      const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
        <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
          <soap:Body>
            <TP_KK_Sakli_Liste xmlns="https://turkpos.com.tr/">
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
            </TP_KK_Sakli_Liste>
          </soap:Body>
        </soap:Envelope>`;

      console.log('Kart kaydetme isteği gönderiliyor...', {
        url,
        soapAction: 'https://turkpos.com.tr/TP_KK_Sakli_Liste'
      });

      const response = await axios.post(url, soapEnvelope, {
        headers: {
          'Content-Type': 'text/xml;charset=UTF-8',
          'SOAPAction': 'https://turkpos.com.tr/TP_KK_Sakli_Liste'
        }
      });

      console.log('Kart kaydetme yanıtı:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data
      });

      // SOAP yanıtını parse et
      const result = response.data;
      if (!result) {
        throw new Error('Kart kaydetme yanıtı boş');
      }

      return result;
    } catch (error) {
      if (error instanceof AxiosError) {
        console.error('Kart kaydetme hatası:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message,
          config: {
            url: error.config?.url,
            method: error.config?.method,
            headers: error.config?.headers,
            data: error.config?.data
          }
        });
        throw new Error(`Kart kaydetme işlemi başarısız: ${error.response?.data?.message || error.message}`);
      }
      console.error('Beklenmeyen kart kaydetme hatası:', error);
      throw error;
    }
  }

  async payment(amount: number, cardToken: string, installment: number = 1) {
    try {
      console.log('Ödeme işlemi başlatılıyor...', {
        amount,
        cardToken,
        installment
      });

      const token = await this.getToken();
      const url = new URL('corporate/v1/payment', this.baseUrl).toString();
      
      const response = await axios.post(
        url,
        {
          amount,
          cardToken,
          installment,
          currency: 'TRY',
          returnUrl: process.env.CLIENT_URL + '/payment/callback'
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Ödeme yanıtı:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data
      });

      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        console.error('Ödeme hatası:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message,
          config: {
            url: error.config?.url,
            method: error.config?.method,
            headers: error.config?.headers,
            data: error.config?.data
          }
        });
        throw new Error(`Ödeme işlemi başarısız: ${error.response?.data?.message || error.message}`);
      }
      console.error('Beklenmeyen ödeme hatası:', error);
      throw error;
    }
  }

  async deleteCard(cardToken: string) {
    try {
      console.log('Kart silme işlemi başlatılıyor...', { cardToken });

      const token = await this.getToken();
      const url = new URL('corporate/v1/card/delete', this.baseUrl).toString();
      
      const response = await axios.post(
        url,
        {
          cardToken
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Kart silme yanıtı:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data
      });

      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        console.error('Kart silme hatası:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message,
          config: {
            url: error.config?.url,
            method: error.config?.method,
            headers: error.config?.headers,
            data: error.config?.data
          }
        });
        throw new Error(`Kart silme işlemi başarısız: ${error.response?.data?.message || error.message}`);
      }
      console.error('Beklenmeyen kart silme hatası:', error);
      throw error;
    }
  }
}

export default new ParamPosService(); 