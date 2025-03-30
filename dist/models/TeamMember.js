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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamMember = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const teamMemberSchema = new mongoose_1.Schema({
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
    },
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
    },
    profilePhoto: {
        type: String,
        trim: true,
    },
    company: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        required: [true, 'Company ID is required'],
        ref: 'Company',
    },
    companyName: {
        type: String,
        required: [true, 'Company name is required'],
        trim: true,
    },
    subscriptionStatus: {
        type: String,
        enum: ['active', 'pending', 'trial', 'cancelled', 'expired'],
        default: 'pending',
    },
    subscriptionStartDate: {
        type: Date,
        default: Date.now,
    },
    nextBillingDate: {
        type: Date,
        default: function () {
            const date = new Date(this.subscriptionStartDate);
            date.setMonth(date.getMonth() + 1);
            return date;
        }
    },
    subscriptionPlan: {
        type: String,
        trim: true,
    },
    subscriptionAmount: {
        type: Number,
        min: 0,
    },
    trialEndDate: {
        type: Date,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    paymentMethod: {
        type: String,
        enum: ['creditCard', 'bankTransfer', 'other'],
    },
    savedCardId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'Card',
    },
    lastPaymentDate: {
        type: Date,
    },
    paymentHistory: [
        {
            amount: {
                type: Number,
                required: true,
            },
            date: {
                type: Date,
                default: Date.now,
            },
            status: {
                type: String,
                enum: ['success', 'failed', 'pending'],
                required: true,
            },
            transactionId: {
                type: String,
            },
        },
    ],
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
teamMemberSchema.virtual('fullName').get(function () {
    return `${this.firstName} ${this.lastName}`;
});
teamMemberSchema.pre('save', function (next) {
    return __awaiter(this, void 0, void 0, function* () {
        if (this.isNew) {
            try {
                const company = yield mongoose_1.default.model('Company').findById(this.company);
                if (company && company.companyType === 'Startup') {
                    this.subscriptionStatus = 'trial';
                    const trialEndDate = new Date(this.subscriptionStartDate);
                    trialEndDate.setMonth(trialEndDate.getMonth() + 3);
                    this.trialEndDate = trialEndDate;
                    this.nextBillingDate = trialEndDate;
                }
            }
            catch (error) {
                console.error('Şirket bilgisi kontrol edilirken hata oluştu:', error);
            }
        }
        next();
    });
});
exports.TeamMember = mongoose_1.default.model('TeamMember', teamMemberSchema);
