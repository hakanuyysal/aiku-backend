"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ParamPosService_1 = __importDefault(require("../services/ParamPosService"));
const SavedCard_1 = __importDefault(require("../models/SavedCard"));
class CardController {
    // Yeni kart kaydetme
    saveCard(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { cardNumber, cardHolderName, expireMonth, expireYear, cvc } = req.body;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
                // Param POS'a kart kaydetme isteği
                // @ts-expect-error - Parametre sayısı uyumsuzluğu
                const paramResponse = yield ParamPosService_1.default.saveCard(userId.toString(), cardNumber, cardHolderName, expireMonth, expireYear, cvc);
                if (paramResponse.result) {
                    // Veritabanına kaydetme
                    const savedCard = new SavedCard_1.default({
                        userId,
                        cardToken: paramResponse.result.cardToken,
                        cardMaskedNumber: paramResponse.result.cardMaskedNumber,
                        cardHolderName,
                        cardExpireMonth: expireMonth,
                        cardExpireYear: expireYear,
                        cardType: paramResponse.result.cardType,
                        isDefault: false,
                    });
                    yield savedCard.save();
                    res.status(201).json({
                        success: true,
                        message: "Kart başarıyla kaydedildi",
                        card: savedCard,
                    });
                }
                else {
                    throw new Error("Kart kaydetme işlemi başarısız");
                }
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    message: error instanceof Error
                        ? error.message
                        : "Kart kaydetme işlemi başarısız",
                });
            }
        });
    }
    // Kullanıcının kayıtlı kartlarını listeleme
    getCards(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
                const cards = yield SavedCard_1.default.find({ userId });
                res.status(200).json({
                    success: true,
                    cards,
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    message: "Kartlar getirilirken bir hata oluştu",
                });
            }
        });
    }
    // Kayıtlı kartı silme
    deleteCard(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { cardToken } = req.params;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
                // Önce veritabanından kartı bul
                const card = yield SavedCard_1.default.findOne({ cardToken, userId });
                if (!card) {
                    return res.status(404).json({
                        success: false,
                        message: "Kart bulunamadı",
                    });
                }
                // Param POS'tan kartı sil
                yield ParamPosService_1.default.deleteCard(cardToken);
                // Veritabanından kartı sil
                yield SavedCard_1.default.deleteOne({ cardToken, userId });
                res.status(200).json({
                    success: true,
                    message: "Kart başarıyla silindi",
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    message: error instanceof Error
                        ? error.message
                        : "Kart silme işlemi başarısız",
                });
            }
        });
    }
    // Varsayılan kartı güncelleme
    setDefaultCard(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { cardToken } = req.params;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
                // Önce tüm kartların varsayılan değerini false yap
                yield SavedCard_1.default.updateMany({ userId }, { isDefault: false });
                // Seçilen kartı varsayılan yap
                const updatedCard = yield SavedCard_1.default.findOneAndUpdate({ cardToken, userId }, { isDefault: true }, { new: true });
                if (!updatedCard) {
                    return res.status(404).json({
                        success: false,
                        message: "Kart bulunamadı",
                    });
                }
                res.status(200).json({
                    success: true,
                    message: "Varsayılan kart güncellendi",
                    card: updatedCard,
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    message: "Varsayılan kart güncellenirken bir hata oluştu",
                });
            }
        });
    }
    // Kayıtlı kartla ödeme yapma
    payWithSavedCard(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { cardToken, amount, installment } = req.body;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
                // Kartın kullanıcıya ait olduğunu kontrol et
                const card = yield SavedCard_1.default.findOne({ cardToken, userId });
                if (!card) {
                    return res.status(404).json({
                        success: false,
                        message: "Kart bulunamadı",
                    });
                }
                // Ödeme işlemini gerçekleştir
                // @ts-expect-error - Parametre sayısı uyumsuzluğu
                const paymentResponse = yield ParamPosService_1.default.payment(amount, cardToken, installment);
                res.status(200).json({
                    success: true,
                    message: "Ödeme başarıyla gerçekleşti",
                    payment: paymentResponse,
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    message: error instanceof Error ? error.message : "Ödeme işlemi başarısız",
                });
            }
        });
    }
}
exports.default = new CardController();
