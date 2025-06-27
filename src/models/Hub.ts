import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IHub extends Document {
    name: string;
    shortDescription?: string;
    detailedDescription?: string;
    type: string;
    institutionName?: string;
    website?: string;
    email?: string;
    countryCode?: string;
    localPhone?: string;
    hubPhone?: string;
    address: string;
    logoUrl?: string;
    tags?: string[];
    connectedCompanies: mongoose.Schema.Types.ObjectId[];
    connectedUsers: mongoose.Schema.Types.ObjectId[];
    focusSectors?: string[];
    programs?: string[];
    facilities?: string[];
    collaborationLevel?: string;
    accessibility?: string[];
    applicationUrl?: string;
    isAcceptingCompanies?: boolean;
    createdAt: Date;
    slug: string;
}


interface IHubModel extends Model<IHub> { }

const hubSchema = new Schema<IHub>(
    {
        name: {
            type: String,
            required: [true, 'Hub name is required'],
            unique: true,
            trim: true,
        },
        shortDescription: {
            type: String,
            trim: true,
        },
        detailedDescription: {
            type: String,
            trim: true,
        },
        type: {
            type: String,
            required: [true, 'Hub type is required'],
            trim: true,
        },
        institutionName: {
            type: String,
            trim: true,
        },
        website: {
            type: String,
            trim: true,
            match: [
                /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/\S*)?$/i,
                'Please enter a valid URL',
            ],
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
            match: [
                /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.[A-Za-z]{2,})+$/,
                'Please enter a valid email address',
            ],
        },
        countryCode: {
            type: String,
            trim: true,
        },

        localPhone: {
            type: String,
            trim: true,
            match: [/^\d{4,15}$/, 'Please enter a valid local phone number'],
            set: (value: string) => value.replace(/[^\d]/g, ''),
        },

        hubPhone: {
            type: String,
            trim: true,
            match: [/^\+?[1-9]\d{1,14}( ?\d{4,15})?$/, 'Please enter a valid full phone number'],
            set: function (this: IHub, _value: string) {
                // Otomatik üretme: countryCode + localPhone
                const cc = this.countryCode?.trim() || '';
                const lp = this.localPhone?.trim() || '';
                return cc && lp ? `${cc} ${lp}` : '';
            },
        },
        address: {
            type: String,
            required: true,
            trim: true,
        },
        logoUrl: {
            type: String,
            trim: true,
        },
        tags: {
            type: [String],
            default: [],
        },
        connectedCompanies: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Company',
            },
        ],
        connectedUsers: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
        focusSectors: {
            type: [String],
            default: [],
        },
        programs: {
            type: [String],
            default: [],
        },
        facilities: {
            type: [String],
            default: [],
        },
        collaborationLevel: {
            type: String,
            trim: true,
        },
        accessibility: {
            type: [String],
            default: [],
        },
        applicationUrl: {
            type: String,
            trim: true,
            match: [
                /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/\S*)?$/i,
                'Please enter a valid URL',
            ],
        },
        isAcceptingCompanies: {
            type: Boolean,
            default: false,
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

hubSchema.virtual('slug').get(function (this: IHub) {
    return this.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
});

hubSchema.pre('save', function (next) {
  if (this.countryCode && this.localPhone) {
    this.hubPhone = `${this.countryCode.trim()} ${this.localPhone.trim()}`;
  }
  next();
});

export const Hub = mongoose.model<IHub, IHubModel>('Hub', hubSchema);
