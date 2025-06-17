// src/AiChatTools.ts
import mongoose from 'mongoose';
import { Product } from './models/Product';
import { Company } from './models/Company';
import { Article } from './models/Article';

/**
 * PRODUCT TOOLS
 */
export async function fetchProductById({ id }: { id: string }) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error('Invalid Product ID');
    }
    const product = await Product.findById(id)
        .populate('companyId', 'companyName companyLogo')
        .lean();
    if (!product) throw new Error('Product not found');
    return product;
}

export async function fetchAllProducts() {
    return await Product.find()
        .populate('companyId', 'companyName companyLogo')
        .lean();
}

export async function fetchProductsByCompany({ companyId }: { companyId: string }) {
    if (!mongoose.Types.ObjectId.isValid(companyId)) {
        throw new Error('Invalid Company ID');
    }
    return await Product.find({ companyId })
        .populate('companyId', 'companyName companyLogo')
        .lean();
}

/**
 * COMPANY TOOLS
 */
export async function fetchCompanyById({ id }: { id: string }) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error('Invalid Company ID');
    }
    const company = await Company.findById(id).lean();
    if (!company) throw new Error('Company not found');
    return company;
}

export async function fetchAllCompanies() {
    return await Company.find().lean();
}

export async function fetchCompaniesForUser({ userId }: { userId: string }) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid User ID');
    }
    return await Company.find({ user: userId }).lean();
}

/**
 * ARTICLE TOOLS
 */
export async function fetchArticleList() {
    // en son eklenen maddeden başla
    return await Article.find().sort({ createdAt: -1 }).lean();
}

export async function fetchArticleById({ id }: { id: string }) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error('Invalid Article ID');
    }
    const article = await Article.findById(id).lean();
    if (!article) throw new Error('Article not found');
    return article;
}

export async function fetchArticleFullContentById({ id }: { id: string }) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error('Invalid Article ID');
    }
    const article = await Article.findById(id).lean();
    if (!article) throw new Error('Article not found');
    return { id: article._id, title: article.title, fullContent: article.fullContent || '' };
}

export async function fetchAllArticleFullContents() {
    const all = await Article.find().lean();
    return all.map(a => ({ id: a._id, fullContent: a.fullContent || '' }));
}

export async function fetchMissingArticleFullContents() {
    const missing = await Article.find({ fullContent: { $in: [null, ''] } }).lean();
    return missing.map(a => ({ id: a._id }));
}
