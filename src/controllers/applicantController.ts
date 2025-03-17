import { Request, Response } from "express";
import { Applicant } from "../models/Applicant";

// 📌 **Tüm başvuranları getir**
export const getAllApplicants = async (req: Request, res: Response) => {
  try {
    const applicants = await Applicant.find();
    res.status(200).json({ success: true, applicants });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// 📌 **Tek bir başvuranı getir**
export const getApplicantById = async (req: Request, res: Response) => {
  try {
    const applicant = await Applicant.findById(req.params.id);
    if (!applicant) {
      return res.status(404).json({ success: false, message: "Applicant not found" });
    }
    res.status(200).json({ success: true, applicant });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// 📌 **Yeni bir başvuran oluştur**
export const createApplicant = async (req: Request, res: Response) => {
  try {
    const newApplicant = new Applicant(req.body);
    await newApplicant.save();
    res.status(201).json({ success: true, message: "Applicant created successfully", applicant: newApplicant });
  } catch (error: any) {
    res.status(400).json({ success: false, message: "Invalid data", error: error.message });
  }
};

// 📌 **Başvuran bilgilerini güncelle**
export const updateApplicant = async (req: Request, res: Response) => {
  try {
    const updatedApplicant = await Applicant.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedApplicant) {
      return res.status(404).json({ success: false, message: "Applicant not found" });
    }
    res.status(200).json({ success: true, message: "Applicant updated successfully", applicant: updatedApplicant });
  } catch (error: any) {
    res.status(400).json({ success: false, message: "Invalid data", error: error.message });
  }
};

// 📌 **Başvuranı sil**
export const deleteApplicant = async (req: Request, res: Response) => {
  try {
    const deletedApplicant = await Applicant.findByIdAndDelete(req.params.id);
    if (!deletedApplicant) {
      return res.status(404).json({ success: false, message: "Applicant not found" });
    }
    res.status(200).json({ success: true, message: "Applicant deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};
