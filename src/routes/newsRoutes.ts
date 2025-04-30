// routes/newsRoutes.ts
import { Router } from 'express';
import {
    manualFetchNews,
    getNews,
    getNewsById,
} from '../controllers/newsController';

const router = Router();

// Opsiyonel: elle çekmek istersen
router.get('/fetch', manualFetchNews);

// Haber listeleme ve detay
router.get('/', getNews);
router.get('/:id', getNewsById);

export default router;
