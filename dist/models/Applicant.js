"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Applicant = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const applicantSchema = new mongoose_1.Schema({
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
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
exports.Applicant = mongoose_1.default.model("Applicant", applicantSchema);
