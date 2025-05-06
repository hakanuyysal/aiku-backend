import { Request, Response } from 'express';
import { PanelUser } from '../models/PanelUser';
import jwt from 'jsonwebtoken';

export const getPanelUsers = async (req: Request, res: Response) => {
  try {
    const users = await PanelUser.find().select('-password');
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Kullanıcılar getirilirken bir hata oluştu.' });
  }
};

export const createPanelUser = async (req: Request, res: Response) => {
  try {
    const { username, password, role } = req.body;

    const existingUser = await PanelUser.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Bu kullanıcı adı zaten kullanılıyor.' });
    }

    const user = new PanelUser({
      username,
      password,
      role,
      totalEntries: 0,
      dailyEntries: 0,
    });

    await user.save();

    const { password: _, ...userResponse } = user.toObject();
    res.status(201).json(userResponse);
  } catch (error) {
    res.status(500).json({ message: 'Kullanıcı oluşturulurken bir hata oluştu.' });
  }
};

export const loginPanelUser = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    const user = await PanelUser.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'Geçersiz kullanıcı adı veya şifre.' });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Geçersiz kullanıcı adı veya şifre.' });
    }

    user.dailyEntries += 1;
    user.totalEntries += 1;
    await user.save();

    const token = jwt.sign(
      { 
        userId: user._id, 
        username: user.username,
        role: user.role,
        type: 'panel' 
      },
      process.env.JWT_SECRET || 'panel-secret-key',
      { expiresIn: '24h' }
    );

    const { password: _, ...userResponse } = user.toObject();
    
    res.status(200).json({
      message: 'Giriş başarılı',
      user: userResponse,
      token
    });
  } catch (error) {
    res.status(500).json({ message: 'Giriş yapılırken bir hata oluştu.' });
  }
}; 