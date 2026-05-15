import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

export const downloadFile = async (dataUrl: string, fileName: string) => {
  if (Capacitor.isNativePlatform()) {
    try {
      // For native platform, we save to filesystem and then share/open
      const base64Data = dataUrl.split(',')[1];
      
      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache,
      });

      await Share.share({
        title: fileName,
        text: `Buka ${fileName}`,
        url: savedFile.uri,
        dialogTitle: 'Simpan atau Bagikan File',
      });
      
      return true;
    } catch (error) {
      console.error('Error saving/sharing file:', error);
      throw error;
    }
  } else {
    // Standard web download
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  }
};
