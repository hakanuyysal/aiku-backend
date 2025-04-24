import { Request, Response, NextFunction } from "express";
import logger, { formatRequestLog, formatResponseLog } from "../config/logger";
import geoip from 'geoip-lite';
import * as UAParser from 'ua-parser-js';

/**
 * Gerçek IP adresini tespit eden yardımcı fonksiyon
 */
const getClientIP = (req: Request): string => {
  // Öncelik sırası:
  // 1. X-Real-IP (Nginx tarafından ayarlanır)
  // 2. X-Forwarded-For'un ilk IP'si (proxy zincirinin başlangıç noktası)
  // 3. req.ip (Express'in tespit ettiği IP)
  // 4. Socket remote address
  
  const realIP = req.headers['x-real-ip'] as string;
  if (realIP) return realIP;

  const forwardedFor = req.headers['x-forwarded-for'] as string;
  if (forwardedFor) {
    // İlk IP'yi al (proxy zincirinin başlangıç noktası)
    const ips = forwardedFor.split(',').map(ip => ip.trim());
    return ips[0];
  }

  return req.ip || req.socket.remoteAddress || '';
};

/**
 * İstek detaylarını hazırlayan yardımcı fonksiyon
 */
const prepareRequestDetails = (req?: Request) => {
  if (!req) return null;

  // IP adresi tespiti
  const clientIP = getClientIP(req);

  // GeoIP bilgisi
  const geo = clientIP ? geoip.lookup(clientIP) : null;

  // Proxy bilgileri
  const proxyInfo = {
    realIP: req.headers['x-real-ip'],
    forwardedFor: req.headers['x-forwarded-for'],
    via: req.headers['via'],
    forwarded: req.headers['forwarded']
  };

  // User-Agent parser
  const parser = new UAParser.UAParser();
  const userAgent = req.headers['user-agent'] || '';
  const result = parser.setUA(userAgent).getResult();

  return {
    ip: clientIP,
    proxy: proxyInfo,
    geoLocation: geo ? {
      country: geo.country,
      region: geo.region,
      city: geo.city,
      ll: geo.ll,
      timezone: geo.timezone
    } : null,
    device: {
      browser: {
        name: result.browser.name,
        version: result.browser.version
      },
      os: {
        name: result.os.name,
        version: result.os.version
      },
      device: {
        type: result.device.type,
        vendor: result.device.vendor,
        model: result.device.model
      }
    },
    request: {
      method: req.method,
      url: req.url,
      path: req.path,
      protocol: req.protocol,
      host: req.get('host'),
      headers: {
        'user-agent': req.headers['user-agent'],
        'accept-language': req.headers['accept-language'],
        'content-type': req.headers['content-type'],
        'referer': req.headers['referer'],
        'origin': req.headers['origin']
      },
      query: req.query
    },
    user: req.user ? {
      id: (req.user as any).id,
      email: (req.user as any).email
    } : null
  };
};

/**
 * Hassas verileri temizleyen fonksiyon
 */
const sanitizeRequestBody = (body: any) => {
  if (!body) return undefined;
  
  const sanitized = { ...body };
  const sensitiveFields = [
    'password', 'token', 'apiKey', 'secret', 'creditCard',
    'cardNumber', 'cvv', 'pin', 'ssn', 'accessToken', 
    'refreshToken', 'authorization'
  ];

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '********';
    }
  }

  return sanitized;
};

/**
 * HTTP isteklerini loglayan middleware
 */
const httpLogger = (req: Request, res: Response, next: NextFunction) => {
  // İstek başlangıç zamanı
  const requestStartTime = Date.now();

  // İstek detaylarını hazırla
  const requestDetails = prepareRequestDetails(req);

  // Başlangıç logu
  if (!req.url.includes('/health')) { // Health check isteklerini loglama
    logger.info(`${req.method} ${req.url} başladı`, requestDetails);
  }

  // Response'u dinle
  res.on('finish', () => {
    const responseTime = Date.now() - requestStartTime;
    
    // Yanıt detayları
    const responseDetails = {
      ...requestDetails,
      response: {
        statusCode: res.statusCode,
        statusMessage: res.statusMessage,
        responseTime: `${responseTime}ms`,
        headers: res.getHeaders()
      }
    };

    // Status code'a göre log seviyesini belirle
    if (res.statusCode >= 500) {
      logger.error(`${req.method} ${req.url} - ${res.statusCode}`, responseDetails);
    } else if (res.statusCode >= 400) {
      logger.warn(`${req.method} ${req.url} - ${res.statusCode}`, responseDetails);
    } else if (!req.url.includes('/health')) { // Health check isteklerini loglama
      logger.info(`${req.method} ${req.url} - ${res.statusCode}`, responseDetails);
    }
  });

  next();
};

export default httpLogger;
