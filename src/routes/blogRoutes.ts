import { Router } from 'express';
import { check } from 'express-validator';
import {
    createBlog,
    updateBlog,
    deleteBlog,
    getBlogById,
    getBlogsByUser,
    getAllBlogs
} from '../controllers/blogController';
import { protect } from '../middleware/auth';
import { optionalAuth } from '../middleware/optionalAuth';

const router = Router();

// **Tüm Blogları Getirme (örn: GET /api/blog/all)**
router.get('/all', optionalAuth, getAllBlogs);

// **Kullanıcının Bloglarını Getirme (örn: GET /api/blog/user)**
router.get('/user', protect, getBlogsByUser);

// **Belirtilen ID'ye Sahip Blogu Getirme (örn: GET /api/blog/:id)**
router.get('/:id', getBlogById);

// **Blog Oluşturma (örn: POST /api/blog)**
router.post(
    '/',
    protect,
    [
        check('title', 'Başlık zorunludur').not().isEmpty(),
        check('fullContent', 'İçerik zorunludur').not().isEmpty(),
        // coverPhoto opsiyonel olduğu için burada kontrol yok
    ],
    createBlog
);

// **Blog Güncelleme (örn: PUT /api/blog/:id)**
router.put('/:id', protect, updateBlog);

// **Blog Silme (örn: DELETE /api/blog/:id)**
router.delete('/:id', protect, deleteBlog);

export default router;
