import mongoose, { Schema, Document, Model } from "mongoose";

export interface IApplicant extends Document {
    firstname: string;
    lastname: string;
    username: string;
    image?: string;
    location?: string;
    titles: string[];
    cover_letter?: string;
    phone?: string;
    email: string;
    trainings?: string[];
    skills?: string[];
    experience?: Array<{
        company: string;
        position: string;
        duration: string;
        description?: string;
    }>;
    projects?: Array<{
        title: string;
        description?: string;
        technologies?: string[];
        link?: string;
    }>;
    social_links?: {
        linkedin?: string;
        github?: string;
        portfolio?: string;
    };
    languages?: Array<{
        language: string;
        proficiency: "beginner" | "intermediate" | "advanced" | "native";
    }>;
    createdAt: Date;
    updatedAt: Date;
}

interface IApplicantModel extends Model<IApplicant> { }

const applicantSchema = new Schema<IApplicant>(
    {
        firstname: {
            type: String,
            required: [true, "İsim zorunludur"],
            trim: true,
        },
        lastname: {
            type: String,
            required: [true, "Soyisim zorunludur"],
            trim: true,
        },
        username: {
            type: String,
            required: [true, "Kullanıcı adı zorunludur"],
            unique: true,
            trim: true,
        },
        image: {
            type: String,
            default: "default-profile.png",
        },
        location: {
            type: String,
            trim: true,
        },
        titles: {
            type: [String],
            required: true,
            default: [],
        },
        cover_letter: {
            type: String,
            trim: true,
        },
        phone: {
            type: String,
            trim: true,
        },
        email: {
            type: String,
            required: [true, "Email zorunludur"],
            unique: true,
            trim: true,
            lowercase: true,
            match: [
                /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
                "Lütfen geçerli bir email adresi giriniz",
            ],
        },
        trainings: {
            type: [String],
            default: [],
        },
        skills: {
            type: [String],
            default: [],
        },
        experience: [
            {
                company: { type: String, required: true },
                position: { type: String, required: true },
                duration: { type: String, required: true },
                description: { type: String },
            },
        ],
        projects: [
            {
                title: { type: String, required: true },
                description: { type: String },
                technologies: { type: [String], default: [] },
                link: { type: String },
            },
        ],
        social_links: {
            linkedin: { type: String, trim: true },
            github: { type: String, trim: true },
            portfolio: { type: String, trim: true },
        },
        languages: [
            {
                language: { type: String, required: true },
                proficiency: {
                    type: String,
                    enum: ["beginner", "intermediate", "advanced", "native"],
                    required: true,
                },
            },
        ],
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

export const Applicant = mongoose.model<IApplicant, IApplicantModel>(
    "Applicant",
    applicantSchema
);
