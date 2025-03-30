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
exports.ChatSession = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const chatSessionSchema = new mongoose_1.Schema({
    initiatorCompany: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'Company',
        required: [true, 'Başlatan şirket zorunludur'],
    },
    targetCompany: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'Company',
        required: [true, 'Hedef şirket zorunludur'],
    },
    title: {
        type: String,
        required: [true, 'Sohbet başlığı zorunludur'],
        trim: true,
    },
    lastMessageText: {
        type: String,
        trim: true,
    },
    lastMessageSender: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'Company',
    },
    lastMessageDate: {
        type: Date,
    },
    unreadCountInitiator: {
        type: Number,
        default: 0,
    },
    unreadCountTarget: {
        type: Number,
        default: 0,
    },
    archivedByInitiator: {
        type: Boolean,
        default: false,
    },
    archivedByTarget: {
        type: Boolean,
        default: false,
    },
    deletedByInitiator: {
        type: Boolean,
        default: false,
    },
    deletedByTarget: {
        type: Boolean,
        default: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true, // createdAt ve updatedAt alanlarını otomatik ekler
});
// İki şirket arasında benzersiz sohbet oturumu oluşturmak için bileşik index
chatSessionSchema.index({ initiatorCompany: 1, targetCompany: 1 }, { unique: true });
exports.ChatSession = mongoose_1.default.model('ChatSession', chatSessionSchema);
