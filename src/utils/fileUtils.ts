import fs from 'fs';
import path from 'path';

// Dosya silme işlemi
export const deleteFile = (fileUrl: string | undefined): void => {
  if (!fileUrl) return;

  try {
    const filePath = path.join(__dirname, '../../', fileUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('Dosya silme hatası:', error);
  }
}; 