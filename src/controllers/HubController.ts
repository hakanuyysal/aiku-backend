import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { Hub } from '../models/Hub';

// **Yeni Hub Oluşturma**
export const createHub = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: 'Token eksik' });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const userId = decoded.id;

    const {
      name,
      shortDescription,
      detailedDescription,
      type,
      institutionName,
      website,
      email,
      countryCode,
      localPhone,
      hubPhone,
      address,
      logoUrl,
      tags,
      focusSectors,
      programs,
      facilities,
      collaborationLevel,
      accessibility,
      applicationUrl,
      isAcceptingCompanies,
      connectedCompanies,
    } = req.body;

    const newHub = await Hub.create({
      name,
      shortDescription,
      detailedDescription,
      type,
      institutionName,
      website,
      email,
      countryCode,
      localPhone,
      hubPhone,
      address,
      logoUrl,
      tags,
      focusSectors,
      programs,
      facilities,
      collaborationLevel,
      accessibility,
      applicationUrl,
      isAcceptingCompanies,
      connectedCompanies,
      connectedUsers: [userId],
    });

    res.status(201).json({ success: true, hub: newHub });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
  }
};

// **Hub Güncelleme**
export const updateHub = async (req: Request, res: Response) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: 'Token eksik' });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const userId = decoded.id;
    const userRole = decoded.role;

    const { id } = req.params;
    const hub = await Hub.findById(id);
    if (!hub) {
      return res.status(404).json({ success: false, message: 'Hub bulunamadı' });
    }

    // if (!hub.connectedUsers.includes(userId)) {
    //   return res.status(403).json({ success: false, message: 'Bu hub üzerinde yetkiniz yok' });
    // }

    // if (!hub.connectedUsers.includes(userId) && userRole !== 'admin') {
    //   return res.status(403).json({ success: false, message: 'Bu hub üzerinde yetkiniz yok' });
    // }

    Object.assign(hub, req.body);
    await hub.save();

    res.status(200).json({ success: true, hub });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
  }
};

// **Hub Silme**
export const deleteHub = async (req: Request, res: Response) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: 'Token eksik' });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const userId = decoded.id;
    const userRole = decoded.role;

    const { id } = req.params;
    const hub = await Hub.findById(id);
    if (!hub) {
      return res.status(404).json({ success: false, message: 'Hub bulunamadı' });
    }

    if (!hub.connectedUsers.includes(userId)) {
      return res.status(403).json({ success: false, message: 'Bu hub üzerinde yetkiniz yok' });
    }

    if (!hub.connectedUsers.includes(userId) && userRole !== 'admin') {
      return res.status(403).json({ success: false, message: 'Bu hub üzerinde yetkiniz yok' });
    }

    await hub.deleteOne();
    res.status(200).json({ success: true, message: 'Hub başarıyla silindi' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
  }
};

// **Belirli Hub Getirme**
export const getHubById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const hub = await Hub.findById(id)
      .populate('connectedCompanies', 'companyName companyLogo')
      .populate('connectedUsers', 'name email');

    if (!hub) {
      return res.status(404).json({ success: false, message: 'Hub bulunamadı' });
    }

    res.status(200).json({ success: true, hub });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
  }
};

// **Kullanıcının Hublarını Getirme**
export const getHubsByUser = async (req: Request, res: Response) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: 'Token eksik' });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const userId = decoded.id;

    const hubs = await Hub.find({ connectedUsers: userId })
      .populate('connectedCompanies', 'companyName')
      .populate('connectedUsers', 'name');

    res.status(200).json({ success: true, hubs });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
  }
};

// **Tüm Hubları Getirme**
export const getAllHubs = async (_req: Request, res: Response) => {
  try {
    const hubs = await Hub.find()
      .populate('connectedCompanies', 'companyName companyLogo')
      .populate('connectedUsers', 'name email');

    res.status(200).json({ success: true, hubs });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
  }
};
