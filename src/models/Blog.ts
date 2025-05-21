import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IBlog extends Document {
    title: string;
    author: mongoose.Types.ObjectId;
    coverPhoto: string | null;
    fullContent: string;
    isApproved: boolean;
    createdAt: Date;
    updatedAt: Date;
}

interface IBlogModel extends Model<IBlog> { }

const BlogSchema = new Schema<IBlog>(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },
        author: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        coverPhoto: {
            type: String,
            default: null,
            trim: true
        },
        fullContent: {
            type: String,
            required: true,
            trim: true
        },
        isApproved: {
            default: false,
            type: Boolean,
        }
    },
    {
        timestamps: true
    }
);

BlogSchema.index({ isApproved: 1, createdAt: -1 });

export const Blog: IBlogModel = mongoose.model<IBlog, IBlogModel>(
    'Blog',
    BlogSchema
);
