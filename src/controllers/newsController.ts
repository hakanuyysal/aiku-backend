import { Request, Response } from 'express';
import axios from 'axios';
import { Article } from '../models/Article';
import { Setting } from '../models/Setting';

const NEWS_API_KEY = process.env.NEWS_API_KEY!;
const QUERY = process.env.QUERY!;

const DIFFBOT_TOKEN = process.env.DIFFBOT_TOKEN!;
const DIFFBOT_URL = 'https://api.diffbot.com/v3/article';

/**
 * NewsAPI’dan yeni haberleri çekip MongoDB’ye kaydeder.
 */
export const fetchAndStoreNews = async (): Promise<void> => {
    // 1) Son çekim zamanını oku ya da yeni ayarla
    let setting = await Setting.findOne({ key: 'lastFetchedAt' });
    if (!setting) {
        setting = new Setting({
            key: 'lastFetchedAt',
            value: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
        });
    }
    const from = setting.value;
    console.log('>> [DEBUG] fetchAndStoreNews çalıştı, from:', from);

    // 2) NewsAPI’den makaleleri al
    const response = await axios.get('https://newsapi.org/v2/everything', {
        params: {
            apiKey: NEWS_API_KEY,
            q: QUERY,
            from,               // eğer kullanıyorsanız
            pageSize: 100,
            sortBy: 'publishedAt'
        }
    });
    const fetched = response.data.articles as any[];
    console.log('>> [DEBUG] NewsAPI returned:', fetched.length, 'articles');

    // 3) Her makale için upsert + Diffbot
    for (const a of fetched) {
        // upsert ile belgeyi oluştur veya güncelle, yenisini döndür (new: true)
        const doc = await Article.findOneAndUpdate(
            { url: a.url },
            {
                $setOnInsert: {
                    source: a.source,
                    author: a.author,
                    title: a.title,
                    description: a.description,
                    url: a.url,
                    urlToImage: a.urlToImage,
                    publishedAt: new Date(a.publishedAt),
                    content: a.content,
                }
            },
            {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true
            }
        );

        // Eğer yeni kaydedildiyse veya fullContent hâlâ boşsa, Diffbot’tan çek
        if (!doc.fullContent) {
            try {
                const dbRes = await axios.get(DIFFBOT_URL, {
                    params: {
                        token: DIFFBOT_TOKEN,
                        url: doc.url,
                        fields: 'text'
                    }
                });
                const fullText = dbRes.data.objects?.[0]?.text || '';
                doc.fullContent = fullText;
                await doc.save();
                console.log(`>> [Diffbot] fullContent kaydedildi for ${doc._id}`);
            } catch (e: any) {
                console.warn(`>> [Diffbot] failed for ${doc._id}:`, e.message);
            }
        }
    }

    // 4) Ayarı güncelle
    setting.value = new Date().toISOString();
    await setting.save();
    console.log('>> [DEBUG] fetchAndStoreNews tamamlandı.');
};


/**
 * (Opsiyonel) HTTP isteği ile haberleri güncellemek için:
 * GET /news/fetch
 */
export const manualFetchNews = async (req: Request, res: Response) => {
    try {
        await fetchAndStoreNews();
        res.json({ success: true, message: 'Haberler başarıyla güncellendi.' });
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Haber çekme sırasında hata', error: err.message });
    }
};

/**
 * GET /news?limit=20&page=1
 * Veritabanındaki haberleri listeler (default: son 20)
 */
export const getNews = async (req: Request, res: Response) => {
    try {
        const limit = parseInt((req.query.limit as string) ?? '20', 10);
        const page = parseInt((req.query.page as string) ?? '1', 10);
        const search = (req.query.search as string) ?? '';
        const skip = (page - 1) * limit;

        // Eğer search varsa, title, content veya fullContent içinde ara:
        const filter: any = {};
        if (search.trim()) {
            const regex = new RegExp(search, 'i');
            filter.$or = [
                { title: regex },
                { content: regex },
                { fullContent: regex }
            ];
        }

        const articles = await Article
            .find(filter)
            .sort({ publishedAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Article.countDocuments(filter);
        res.json({ success: true, page, limit, total, articles });
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Haberleri listelerken hata', error: err.message });
    }
};

/**
 * GET /news/:id
 * Tek bir haberi ID ile getirir
 */
export const getNewsById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const article = await Article.findById(id);
        if (!article) {
            return res.status(404).json({ success: false, message: 'Haber bulunamadı' });
        }
        res.json({ success: true, article });
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Haber getirirken hata', error: err.message });
    }
};

// Tek bir haber için fullContent al
export const fetchFullContentById = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const article = await Article.findById(req.params.id);
        if (!article) {
            res.status(404).json({ success: false, message: 'Haber bulunamadı' });
            return;
        }

        const diffbotRes = await axios.get(DIFFBOT_URL, {
            params: {
                token: DIFFBOT_TOKEN,
                url: article.url,
                fields: 'text',
            }
        });

        const fullText = diffbotRes.data.objects?.[0]?.text || '';
        article.fullContent = fullText;
        await article.save();

        res.json({ success: true, fullText });
    } catch (err: any) {
        console.error('Diffbot error:', err.response?.data || err.message);
        res.status(500).json({ success: false, message: 'Tam içerik alınamadı', error: err.message });
    }
};

// Tüm haberleri fullContent ile güncelle
export const fetchFullContentAll = async (
    _req: Request,          // parametre kullanmıyorsanız bile tip koyun
    res: Response
): Promise<void> => {
    try {
        const articles = await Article.find({});
        for (const art of articles) {
            try {
                const diffbotRes = await axios.get(DIFFBOT_URL, {
                    params: {
                        token: DIFFBOT_TOKEN,
                        url: art.url,
                        fields: 'text',
                    }
                });
                art.fullContent = diffbotRes.data.objects?.[0]?.text || '';
                await art.save();
            } catch (e: any) {
                console.warn(`Diffbot failed for ${art._id}:`, e.message);
            }
        }
        res.json({ success: true, message: `${articles.length} haberin fullContent’ı güncellendi.` });
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Toplu güncelleme sırasında hata', error: err.message });
    }
};

export const fetchMissingFullContent = async (_req: Request, res: Response): Promise<void> => {
    try {
        // fullContent null veya boş string olanları bul
        const missing = await Article.find({
            $or: [
                { fullContent: { $exists: false } },
                { fullContent: null },
                { fullContent: "" }
            ]
        });

        let updatedCount = 0;
        for (const art of missing) {
            try {
                const diffbotRes = await axios.get(DIFFBOT_URL, {
                    params: {
                        token: DIFFBOT_TOKEN,
                        url: art.url,
                        fields: 'text'
                    }
                });
                const text = diffbotRes.data.objects?.[0]?.text || '';
                if (text) {
                    art.fullContent = text;
                    await art.save();
                    updatedCount++;
                }
            } catch (e: any) {
                console.warn(`Diffbot failed for ${art._id}:`, e.message);
            }
        }

        res.json({
            success: true,
            totalMissing: missing.length,
            updatedCount
        });
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Eksik güncelleme sırasında hata', error: err.message });
    }
};
