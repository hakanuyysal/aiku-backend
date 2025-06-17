import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IInvestmentNews extends Document {
    title: string;
    coverPhoto?: string | null;
    text: string;
    date: Date; // manuel girilecek yayın tarihi
    createdAt: Date;
    updatedAt: Date;
}

interface IInvestmentNewsModel extends Model<IInvestmentNews> { }

const InvestmentNewsSchema = new Schema<IInvestmentNews>(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },
        coverPhoto: {
            type: String,
            default: null,
            trim: true
        },
        text: {
            type: String,
            required: true,
            trim: true
        },
        date: {
            type: Date,
            required: true
        }
    },
    {
        timestamps: true // createdAt & updatedAt otomatik
    }
);

// Sıralama için index
InvestmentNewsSchema.index({ date: -1 });

export const InvestmentNews: IInvestmentNewsModel = mongoose.model<IInvestmentNews, IInvestmentNewsModel>(
    'InvestmentNews',
    InvestmentNewsSchema
);
