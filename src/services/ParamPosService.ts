import axios from 'axios';
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
  }

  private async getToken(): Promise<string> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/token`, {
        clientCode: this.clientCode,
        clientUsername: this.clientUsername,
        clientPassword: this.clientPassword,
        guid: this.guid
      });

      return response.data.result.token;
    } catch (error) {
      throw new Error('Token alınamadı');
    }
  }

  async saveCard(userId: string, cardNumber: string, cardHolderName: string, expireMonth: string, expireYear: string, cvc: string) {
    try {
      const token = await this.getToken();
      
      const response = await axios.post(
        `${this.baseUrl}/api/saveCard`,
        {
          cardNumber,
          cardHolderName,
          expireMonth,
          expireYear,
          cvc,
          userId
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      return response.data;
    } catch (error) {
      throw new Error('Kart kaydetme işlemi başarısız');
    }
  }

  async payment(amount: number, cardToken: string, installment: number = 1) {
    try {
      const token = await this.getToken();
      
      const response = await axios.post(
        `${this.baseUrl}/api/payment`,
        {
          amount,
          cardToken,
          installment,
          currency: 'TRY'
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      return response.data;
    } catch (error) {
      throw new Error('Ödeme işlemi başarısız');
    }
  }

  async deleteCard(cardToken: string) {
    try {
      const token = await this.getToken();
      
      const response = await axios.post(
        `${this.baseUrl}/api/deleteCard`,
        {
          cardToken
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      return response.data;
    } catch (error) {
      throw new Error('Kart silme işlemi başarısız');
    }
  }
}

export default new ParamPosService(); 