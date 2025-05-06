import { Request, Response } from 'express';
import { PanelUser } from '../models/PanelUser';

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

    const userResponse = { ...user.toObject() };
    delete userResponse.password;

    res.status(201).json(userResponse);
  } catch (error) {
    res.status(500).json({ message: 'Kullanıcı oluşturulurken bir hata oluştu.' });
  }
}; 