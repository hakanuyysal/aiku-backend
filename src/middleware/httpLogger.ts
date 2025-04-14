import { Request, Response, NextFunction } from "express";
import logger, { formatRequestLog, formatResponseLog } from "../config/logger";

/**
 * Sadece önemli HTTP hatalarını ve kritik işlemleri loglayan middleware
 */
const httpLogger = (req: Request, res: Response, next: NextFunction) => {
  // İstek başlangıç zamanını kaydet
  const requestStartTime = Date.now();

  // Sadece önemli endpoint'leri logla
  if (isImportantEndpoint(req.url)) {
    logger.info(`Önemli Endpoint Erişimi: ${req.method} ${req.url}`, {
      request: formatRequestLog(req),
    });
  }

  // Response'un orjinal methodlarını yedekle
  const originalSend = res.send;
  const originalJson = res.json;

  // Yanıt gönderildiğinde log almak için override
  res.send = function (body: any): Response {
    const responseTime = Date.now() - requestStartTime;

    // Sadece hata yanıtlarını veya önemli endpoint yanıtlarını logla
    if (res.statusCode >= 400 || isImportantEndpoint(req.url)) {
      const logLevel =
        res.statusCode >= 500
          ? "error"
          : res.statusCode >= 400
          ? "warn"
          : "info";
      logger[logLevel](
        `${logLevel.toUpperCase()} - ${req.method} ${req.url} - ${
          res.statusCode
        }`,
        {
          response: formatResponseLog(res, responseTime),
          responseBody: typeof body === "string" ? safeParseJson(body) : body,
        }
      );
    }

    return originalSend.call(res, body);
  };

  res.json = function (body: any): Response {
    const responseTime = Date.now() - requestStartTime;

    // Sadece hata yanıtlarını veya önemli endpoint yanıtlarını logla
    if (res.statusCode >= 400 || isImportantEndpoint(req.url)) {
      const logLevel =
        res.statusCode >= 500
          ? "error"
          : res.statusCode >= 400
          ? "warn"
          : "info";
      logger[logLevel](
        `${logLevel.toUpperCase()} - ${req.method} ${req.url} - ${
          res.statusCode
        }`,
        {
          response: formatResponseLog(res, responseTime),
          responseBody: body,
        }
      );
    }

    return originalJson.call(res, body);
  };

  // `res.on('finish')` ile response tamamlandığında loglama
  // res.end() override etme sorunlarını çözmek için daha basit bir yaklaşım
  res.on('finish', () => {
    // Sadece hata yanıtlarını logla
    if (res.statusCode >= 400) {
      const responseTime = Date.now() - requestStartTime;
      const logLevel = res.statusCode >= 500 ? 'error' : 'warn';
      
      logger[logLevel](`${logLevel.toUpperCase()} - ${req.method} ${req.url} - ${res.statusCode}`, {
        response: formatResponseLog(res, responseTime),
      });
    }
  });

  next();
};

/**
 * JSON string'i güvenli bir şekilde parse etmeye çalışır
 */
function safeParseJson(jsonString: string) {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    return jsonString;
  }
}

/**
 * Verilen URL'in önemli bir endpoint olup olmadığını kontrol eder
 */
function isImportantEndpoint(url: string): boolean {
  const importantPatterns = [
    /\/api\/auth\//, // Kimlik doğrulama
    /\/api\/payments\//, // Ödemeler
    /\/api\/subscriptions\//, // Abonelikler
    /\/api\/investments\//, // Yatırımlar
    /\/api\/company\/create/, // Şirket oluşturma
    /\/api\/cards\//, // Kart işlemleri
  ];

  return importantPatterns.some((pattern) => pattern.test(url));
}

export default httpLogger;
