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
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteApplicant = exports.updateApplicant = exports.createApplicant = exports.getApplicantById = exports.getAllApplicants = void 0;
const Applicant_1 = require("../models/Applicant");
// 📌 **Tüm başvuranları getir**
const getAllApplicants = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const applicants = yield Applicant_1.Applicant.find();
        res.status(200).json({ success: true, applicants });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
});
exports.getAllApplicants = getAllApplicants;
// 📌 **Tek bir başvuranı getir**
const getApplicantById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const applicant = yield Applicant_1.Applicant.findById(req.params.id);
        if (!applicant) {
            return res.status(404).json({ success: false, message: "Applicant not found" });
        }
        res.status(200).json({ success: true, applicant });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
});
exports.getApplicantById = getApplicantById;
// 📌 **Yeni bir başvuran oluştur**
const createApplicant = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const newApplicant = new Applicant_1.Applicant(req.body);
        yield newApplicant.save();
        res.status(201).json({ success: true, message: "Applicant created successfully", applicant: newApplicant });
    }
    catch (error) {
        res.status(400).json({ success: false, message: "Invalid data", error: error.message });
    }
});
exports.createApplicant = createApplicant;
// 📌 **Başvuran bilgilerini güncelle**
const updateApplicant = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const updatedApplicant = yield Applicant_1.Applicant.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedApplicant) {
            return res.status(404).json({ success: false, message: "Applicant not found" });
        }
        res.status(200).json({ success: true, message: "Applicant updated successfully", applicant: updatedApplicant });
    }
    catch (error) {
        res.status(400).json({ success: false, message: "Invalid data", error: error.message });
    }
});
exports.updateApplicant = updateApplicant;
// 📌 **Başvuranı sil**
const deleteApplicant = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const deletedApplicant = yield Applicant_1.Applicant.findByIdAndDelete(req.params.id);
        if (!deletedApplicant) {
            return res.status(404).json({ success: false, message: "Applicant not found" });
        }
        res.status(200).json({ success: true, message: "Applicant deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
});
exports.deleteApplicant = deleteApplicant;
