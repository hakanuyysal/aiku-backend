import axios from 'axios';
import { ExchangeRateCache } from '../utils/cacheUtils';
import logger from '../config/logger';

// Döviz kuru API yanıt tipi
export interface ExchangeRateResponse {
  result: string;
  provider: string;
  documentation: string;
  terms_of_use: string;
  time_last_update_unix: number;
  time_last_update_utc: string;
  time_next_update_unix: number;
  time_next_update_utc: string;
  time_eol_unix: number;
  base_code: string;
  rates: {
    [key: string]: number;
  };
}

// Döviz kuru servisi
export class ExchangeRateService {
  private static instance: ExchangeRateService;
  private cache: ExchangeRateCache;
  private readonly API_URL = 'https://open.er-api.com/v6/latest/USD';
  private readonly CACHE_KEY = 'usd_exchange_rates';
  private readonly CACHE_DURATION_MS = 12 * 60 * 60 * 1000; // 12 saat
  private lastFetchFromApi: boolean = false; // Son veri çekiminin API'den olup olmadığını izler

  private constructor() {
    this.cache = ExchangeRateCache.getInstance();
  }

  // Singleton pattern ile tek instance oluştur
  public static getInstance(): ExchangeRateService {
    if (!ExchangeRateService.instance) {
      ExchangeRateService.instance = new ExchangeRateService();
    }
    return ExchangeRateService.instance;
  }

  // Son veri çekiminin API'den olup olmadığını döndür
  public isLastFetchFromApi(): boolean {
    return this.lastFetchFromApi;
  }

  // Döviz kurlarını getir (cache'den veya API'den)
  public async getExchangeRates(): Promise<ExchangeRateResponse> {
    try {
      // Cache'den veriyi kontrol et
      const cachedData = this.cache.get<ExchangeRateResponse>(this.CACHE_KEY);
      
      // Eğer cache'de veri varsa ve süresi dolmamışsa, cache'den döndür
      if (cachedData.data && !cachedData.expired) {
        console.log('💰 Döviz kurları cache\'den alındı');
        logger.debug('Döviz kurları cache\'den alındı', { cacheKey: this.CACHE_KEY });
        this.lastFetchFromApi = false; // Cache'den veri alındı
        return cachedData.data;
      }

      // Cache'de veri yoksa veya süresi dolduysa, API'den yeni veri al
      console.log('🔄 Döviz kurları API\'den güncelleniyor...');
      logger.info('Döviz kurları API\'den güncelleniyor', { url: this.API_URL });
      const response = await axios.get<ExchangeRateResponse>(this.API_URL);
      
      // API yanıtını cache'e kaydet
      await this.cache.set(this.CACHE_KEY, response.data, this.CACHE_DURATION_MS);
      
      console.log('✅ Döviz kurları başarıyla güncellendi');
      logger.info('Döviz kurları başarıyla güncellendi', { 
        lastUpdateUTC: response.data.time_last_update_utc,
        nextUpdateUTC: response.data.time_next_update_utc
      });
      this.lastFetchFromApi = true; // API'den veri alındı
      return response.data;
    } catch (error: any) {
      console.error('❌ Döviz kurları alınırken hata:', error);
      logger.error('Döviz kurları alınırken hata', { 
        error: error.message, 
        stack: error.stack,
        url: this.API_URL
      });
      
      // Hata durumunda, eğer cache'de eski veri varsa onu döndür
      const cachedData = this.cache.get<ExchangeRateResponse>(this.CACHE_KEY);
      if (cachedData.data) {
        console.log('⚠️ API hatası nedeniyle eski cache verisi kullanılıyor');
        logger.warn('API hatası nedeniyle eski cache verisi kullanılıyor', { 
          cacheKey: this.CACHE_KEY,
          cacheAge: cachedData.data.time_last_update_utc
        });
        this.lastFetchFromApi = false; // Cache'den veri alındı
        return cachedData.data;
      }
      
      // Cache'de de veri yoksa hata fırlat
      throw new Error('Döviz kurları alınamadı ve cache\'de veri bulunamadı');
    }
  }

  // Belirli bir para birimi için döviz kurunu getir
  public async getExchangeRate(currencyCode: string): Promise<number | null> {
    try {
      const exchangeRates = await this.getExchangeRates();
      const upperCaseCurrencyCode = currencyCode.toUpperCase();
      
      if (exchangeRates.rates && exchangeRates.rates[upperCaseCurrencyCode]) {
        return exchangeRates.rates[upperCaseCurrencyCode];
      }
      
      return null; // Para birimi bulunamadı
    } catch (error: any) {
      console.error(`❌ ${currencyCode} kuru alınırken hata:`, error);
      logger.error(`${currencyCode} kuru alınırken hata`, {
        error: error.message,
        stack: error.stack,
        currencyCode
      });
      throw error;
    }
  }

  // Cache'i temizle ve zorla güncelle
  public async forceRefreshRates(): Promise<ExchangeRateResponse> {
    try {
      // API'den yeni veri al
      console.log('🔄 Döviz kurları zorla güncelleniyor...');
      logger.info('Döviz kurları zorla güncelleniyor', { url: this.API_URL });
      const response = await axios.get<ExchangeRateResponse>(this.API_URL);
      
      // API yanıtını cache'e kaydet
      await this.cache.set(this.CACHE_KEY, response.data, this.CACHE_DURATION_MS);
      
      console.log('✅ Döviz kurları başarıyla güncellendi');
      logger.info('Döviz kurları başarıyla güncellendi', { 
        lastUpdateUTC: response.data.time_last_update_utc,
        nextUpdateUTC: response.data.time_next_update_utc
      });
      this.lastFetchFromApi = true; // API'den veri alındı
      return response.data;
    } catch (error: any) {
      console.error('❌ Döviz kurları güncellenirken hata:', error);
      logger.error('Döviz kurları güncellenirken hata', { 
        error: error.message, 
        stack: error.stack,
        url: this.API_URL
      });
      throw error;
    }
  }
} 