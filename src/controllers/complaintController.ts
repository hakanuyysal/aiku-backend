import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Complaint, ComplaintType } from '../models/Complaint';
import { Message } from '../models/Message';

// Şikayet oluşturma
export const createComplaint = async (req: Request, res: Response) => {
  try {
    const { messageId, complaintType, description } = req.body;
    const userId = req.user?.id; // Middleware'den gelen kullanıcı bilgisi

    // Gerekli alanları kontrol et
    if (!messageId || !complaintType || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Message ID, complaint type and user ID are required',
      });
    }

    // Geçerli bir MongoDB ObjectId mi kontrol et
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid message ID',
      });
    }

    // Geçerli bir şikayet türü mü kontrol et
    if (!Object.values(ComplaintType).includes(complaintType as ComplaintType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid complaint type',
        validTypes: Object.values(ComplaintType),
      });
    }

    // Mesajın var olduğunu kontrol et
    const messageExists = await Message.exists({ _id: messageId });
    if (!messageExists) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    // Kullanıcının aynı mesaj için zaten bir şikayeti var mı kontrol et
    const existingComplaint = await Complaint.findOne({
      message: messageId,
      reporter: userId,
    });

    if (existingComplaint) {
      return res.status(400).json({
        success: false,
        message: 'You have already reported this message',
        data: existingComplaint,
      });
    }

    // Yeni şikayet oluştur
    const complaint = await Complaint.create({
      message: messageId,
      reporter: userId,
      complaintType,
      description: description || '',
      status: 'pending',
    });

    res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully',
      data: complaint,
    });
  } catch (error) {
    console.error('Error creating complaint:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while submitting the complaint',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Kullanıcının kendi şikayetlerini getirme
export const getUserComplaints = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    const complaints = await Complaint.find({ reporter: userId })
      .populate('message')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: complaints.length,
      data: complaints,
    });
  } catch (error) {
    console.error('Error getting user complaints:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while retrieving complaints',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Admin: Tüm şikayetleri getirme
export const getAllComplaints = async (req: Request, res: Response) => {
  try {
    // Kullanıcının admin olup olmadığını kontrol et
    if (!req.user?.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required',
      });
    }

    const { status, complaintType, page = 1, limit = 20 } = req.query;
    
    const queryOptions: any = {};
    
    // Filtreleme seçenekleri
    if (status) {
      queryOptions.status = status;
    }
    
    if (complaintType) {
      queryOptions.complaintType = complaintType;
    }

    // Sayfalama
    const skip = (Number(page) - 1) * Number(limit);
    
    const complaints = await Complaint.find(queryOptions)
      .populate('message')
      .populate('reporter', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));
      
    const totalComplaints = await Complaint.countDocuments(queryOptions);

    res.status(200).json({
      success: true,
      count: complaints.length,
      totalPages: Math.ceil(totalComplaints / Number(limit)),
      currentPage: Number(page),
      data: complaints,
    });
  } catch (error) {
    console.error('Error getting all complaints:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while retrieving complaints',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Admin: Şikayet durumunu güncelleme
export const updateComplaintStatus = async (req: Request, res: Response) => {
  try {
    const { complaintId } = req.params;
    const { status } = req.body;
    
    // Kullanıcının admin olup olmadığını kontrol et
    if (!req.user?.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required',
      });
    }
    
    // Geçerli bir durum mu kontrol et
    if (!['pending', 'reviewed', 'resolved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value',
        validStatus: ['pending', 'reviewed', 'resolved', 'rejected'],
      });
    }
    
    const complaint = await Complaint.findByIdAndUpdate(
      complaintId,
      { status, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found',
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Complaint status updated successfully',
      data: complaint,
    });
  } catch (error) {
    console.error('Error updating complaint status:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while updating the complaint status',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}; 