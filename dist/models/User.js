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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const userSchema = new mongoose_1.Schema({
    firstName: {
        type: String,
        required: [true, 'İsim alanı zorunludur'],
        trim: true
    },
    lastName: {
        type: String,
        required: [true, 'Soyisim alanı zorunludur'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email alanı zorunludur'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Lütfen geçerli bir email adresi giriniz']
    },
    password: {
        type: String,
        required: [true, 'Şifre alanı zorunludur'],
        minlength: [6, 'Şifre en az 6 karakter olmalıdır'],
        select: false
    },
    phone: {
        type: String,
        trim: true
    },
    title: {
        type: String,
        trim: true
    },
    location: {
        type: String,
        trim: true
    },
    profileInfo: {
        type: String,
        trim: true
    },
    profilePhoto: {
        type: String,
        default: null
    },
    linkedin: {
        type: String,
        trim: true
    },
    instagram: {
        type: String,
        trim: true
    },
    facebook: {
        type: String,
        trim: true
    },
    twitter: {
        type: String,
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    favoriteUsers: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'User',
            default: []
        }],
    favoriteCompanies: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Company',
            default: []
        }],
    favoriteProducts: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Product',
            default: []
        }]
});
// Şifreyi hashleme
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcryptjs_1.default.genSalt(10);
    this.password = await bcryptjs_1.default.hash(this.password, salt);
    next();
});
// Şifre karşılaştırma metodu
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcryptjs_1.default.compare(enteredPassword, this.password);
};
exports.User = mongoose_1.default.model('User', userSchema);
