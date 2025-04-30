import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IArticle extends Document {
    source: {
        id: string | null;
        name: string;
    };
    author: string | null;
    title: string;
    description: string | null;
    url: string;
    urlToImage: string | null;
    publishedAt: Date;
    content: string | null;
    createdAt: Date;
    updatedAt: Date;
}

interface IArticleModel extends Model<IArticle> { }

const ArticleSchema = new Schema<IArticle>(
    {
        source: {
            id: { type: String, default: null },
            name: { type: String, required: true }
        },
        author: { type: String, default: null },
        title: { type: String, required: true, trim: true },
        description: { type: String, default: null, trim: true },
        url: { type: String, required: true, unique: true, trim: true },
        urlToImage: { type: String, default: null, trim: true },
        publishedAt: { type: Date, required: true },
        content: { type: String, default: null, trim: true },
    },
    {
        timestamps: true,
    }
);

// Opsiyonel: 7 gün sonra otomatik silinsin
// ArticleSchema.index({ publishedAt: 1 }, { expireAfterSeconds: 7 * 24 * 3600 });

export const Article: IArticleModel = mongoose.model<IArticle, IArticleModel>(
    'Article',
    ArticleSchema
);
