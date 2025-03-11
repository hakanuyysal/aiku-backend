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
    this.baseUrl = process.env.PARAM_BASE_URL || 'https://test-dmz.param.com.tr:4443/';

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
      console.log('Token isteği gönderiliyor...', {
        clientCode: this.clientCode,
        clientUsername: this.clientUsername,
        guid: this.guid,
        url: `${this.baseUrl}corporate/test/v1/token`
      });

      const response = await axios.post(`${this.baseUrl}corporate/test/v1/token`, {
        clientCode: this.clientCode,
        clientUsername: this.clientUsername,
        clientPassword: this.clientPassword,
        guid: this.guid
      });

      console.log('Token yanıtı:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data
      });

      if (!response.data.result?.token) {
        console.error('Token yanıtında token bulunamadı:', response.data);
        throw new Error('Token alınamadı: ' + JSON.stringify(response.data));
      }

      return response.data.result.token;
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

      const token = await this.getToken();
      
      console.log('Kart kaydetme isteği gönderiliyor...', {
        userId,
        cardHolderName,
        expireMonth,
        expireYear,
        url: `${this.baseUrl}corporate/test/v1/card/register`,
        returnUrl: process.env.CLIENT_URL + '/payment/callback'
      });

      const response = await axios.post(
        `${this.baseUrl}corporate/test/v1/card/register`,
        {
          cardNumber,
          cardHolderName,
          expireMonth,
          expireYear,
          cvc,
          userId,
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

      console.log('Kart kaydetme yanıtı:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data
      });

      if (!response.data.result) {
        console.error('Kart kaydetme yanıtında result bulunamadı:', response.data);
        throw new Error('Kart kaydetme başarısız: ' + JSON.stringify(response.data));
      }

      return response.data;
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
            data: JSON.stringify(error.config?.data)
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
      
      const response = await axios.post(
        `${this.baseUrl}corporate/test/v1/payment`,
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
      
      const response = await axios.post(
        `${this.baseUrl}corporate/test/v1/card/delete`,
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