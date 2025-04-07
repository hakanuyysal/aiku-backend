import { Request, Response } from 'express';
import { ExchangeRateService } from '../services/exchangeRateService';

// Döviz kuru controller sınıfı
export class ExchangeRateController {
  private exchangeRateService: ExchangeRateService;

  constructor() {
    this.exchangeRateService = ExchangeRateService.getInstance();
  }

  // Tüm döviz kurlarını getir
  public getAllRates = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.exchangeRateService.getExchangeRates();
      const fromCache = !this.exchangeRateService.isLastFetchFromApi();
      
      res.status(200).json({
        success: true,
        message: 'Döviz kurları başarıyla alındı',
        data: result,
        fromCache: fromCache
      });
    } catch (error) {
      console.error('Döviz kurları alınırken hata:', error);
      
      res.status(500).json({
        success: false,
        message: 'Döviz kurları alınırken bir hata oluştu',
        error: error instanceof Error ? error.message : 'Bilinmeyen hata'
      });
    }
  };

  // Belirli bir para birimi için döviz kurunu getir
  public getRate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { currencyCode } = req.params;
      
      if (!currencyCode) {
        res.status(400).json({
          success: false,
          message: 'Para birimi kodu belirtilmedi'
        });
        return;
      }
      
      const rate = await this.exchangeRateService.getExchangeRate(currencyCode);
      const fromCache = !this.exchangeRateService.isLastFetchFromApi();
      
      if (rate === null) {
        res.status(404).json({
          success: false,
          message: `${currencyCode} para birimi için kur bilgisi bulunamadı`
        });
        return;
      }
      
      res.status(200).json({
        success: true,
        message: `${currencyCode} para birimi için kur bilgisi başarıyla alındı`,
        data: {
          currency: currencyCode.toUpperCase(),
          rate: rate
        },
        fromCache: fromCache
      });
    } catch (error) {
      console.error('Döviz kuru alınırken hata:', error);
      
      res.status(500).json({
        success: false,
        message: 'Döviz kuru alınırken bir hata oluştu',
        error: error instanceof Error ? error.message : 'Bilinmeyen hata'
      });
    }
  };

  // Özellikle TRY (Türk Lirası) kuru için endpoint
  public getTRYRate = async (req: Request, res: Response): Promise<void> => {
    try {
      const rate = await this.exchangeRateService.getExchangeRate('TRY');
      const fromCache = !this.exchangeRateService.isLastFetchFromApi();
      
      if (rate === null) {
        res.status(404).json({
          success: false,
          message: 'TRY para birimi için kur bilgisi bulunamadı'
        });
        return;
      }
      
      res.status(200).json({
        success: true,
        message: 'USD/TRY kuru başarıyla alındı',
        data: {
          currency: 'TRY',
          base: 'USD',
          rate: rate
        },
        fromCache: fromCache
      });
    } catch (error) {
      console.error('TRY kuru alınırken hata:', error);
      
      res.status(500).json({
        success: false,
        message: 'TRY kuru alınırken bir hata oluştu',
        error: error instanceof Error ? error.message : 'Bilinmeyen hata'
      });
    }
  };

  // Cache'i zorla güncelle
  public refreshRates = async (req: Request, res: Response): Promise<void> => {
    try {
      const rates = await this.exchangeRateService.forceRefreshRates();
      
      res.status(200).json({
        success: true,
        message: 'Döviz kurları başarıyla güncellendi',
        data: rates,
        fromCache: false // Zorla güncellendiği için kesinlikle API'den alınmıştır
      });
    } catch (error) {
      console.error('Döviz kurları güncellenirken hata:', error);
      
      res.status(500).json({
        success: false,
        message: 'Döviz kurları güncellenirken bir hata oluştu',
        error: error instanceof Error ? error.message : 'Bilinmeyen hata'
      });
    }
  };
} 