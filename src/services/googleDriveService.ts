/* eslint-disable @typescript-eslint/no-explicit-any */
import { GoogleAuthProvider, signInWithPopup, User } from 'firebase/auth';
import { auth } from '../firebase';

// Cache Google Access Token in memory
let cachedAccessToken: string | null = null;
let googleUser: User | null = null;

// Target main backup folder defined by user
export const TARGET_MAIN_FOLDER_ID = '1vHbHWra2uq2ZYeD6BTyumvgIqu2Ly19d';

/**
 * Perform sign in with Google Auth and request Google Drive scopes
 */
export const signInToGoogleDrive = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    const provider = new GoogleAuthProvider();
    // Scope for full access to folder contents modified/created
    provider.addScope('https://www.googleapis.com/auth/drive');
    
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    if (!credential?.accessToken) {
      throw new Error('Gagal mendapatkan token akses dari Google Sign-In.');
    }
    
    cachedAccessToken = credential.accessToken;
    googleUser = result.user;
    
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Google Drive Auth Error:', error);
    throw error;
  }
};

/**
 * Get active access token
 */
export const getDriveAccessToken = (): string | null => {
  return cachedAccessToken;
};

/**
 * Get logged in Google User
 */
export const getDriveUser = (): User | null => {
  return googleUser || auth.currentUser;
};

/**
 * Clear drive token on logout
 */
export const disconnectGoogleDrive = () => {
  cachedAccessToken = null;
  googleUser = null;
};

/**
 * Check if the specified folder ID exists and is readable
 */
export const verifyFolderAccessibility = async (folderId: string): Promise<boolean> => {
  const token = getDriveAccessToken();
  if (!token) return false;
  
  try {
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}?fields=id,name,mimeType`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      console.warn(`Folder study/access failed: ${response.status}`);
      return false;
    }
    
    const metadata = await response.json();
    return metadata.mimeType === 'application/vnd.google-apps.folder';
  } catch (err) {
    console.error('Error verifying folder:', err);
    return false;
  }
};

/**
 * Create a folder inside a parent folder ID
 */
export const createFolder = async (folderName: string, parentId?: string): Promise<string> => {
  const token = getDriveAccessToken();
  if (!token) throw new Error('Anda belum terhubung dengan Google Drive. Silakan login kembali.');
  
  const metadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    ...(parentId ? { parents: [parentId] } : {})
  };
  
  const response = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(metadata)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gagal membuat folder "${folderName}": ${errorText || response.statusText}`);
  }
  
  const result = await response.json();
  return result.id;
};

/**
 * Upload any Blob or text file using robust multipart/related protocol
 */
export const uploadFile = async (
  fileName: string,
  mimeType: string,
  content: Blob | string,
  parentId: string
): Promise<any> => {
  const token = getDriveAccessToken();
  if (!token) throw new Error('Akses token Google Drive tidak ditemukan.');
  
  const boundary = 'ais_backup_multipart_boundary';
  
  const metadata = {
    name: fileName,
    mimeType: mimeType,
    parents: [parentId]
  };
  
  const getContentBase64 = async (): Promise<string> => {
    if (content instanceof Blob) {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(content);
      });
    } else {
      // UTF-8 safe base64 encoding
      return btoa(encodeURIComponent(content).replace(/%([0-9A-F]{2})/g, (_, p1) => {
        return String.fromCharCode(parseInt(p1, 16));
      }));
    }
  };
  
  const contentBase64 = await getContentBase64();
  
  const multipartBody = 
    `\r\n--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `\r\n--${boundary}\r\n` +
    `Content-Type: ${mimeType}\r\n` +
    `Content-Transfer-Encoding: base64\r\n\r\n` +
    `${contentBase64}\r\n` +
    `--${boundary}--`;
    
  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body: multipartBody
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gagal upload file "${fileName}": ${text || response.statusText}`);
  }
  
  return await response.json();
};

/**
 * Convert JSON array to clean, downloadable CSV formatted text
 */
export const convertToCSV = (data: any[]): string => {
  if (!data || data.length === 0) return '';
  
  // Extract all unique fields across items
  const headersSet = new Set<string>();
  data.forEach((item: any) => {
    if (item && typeof item === 'object') {
      Object.keys(item).forEach((key: string) => {
        // Exclude large binary base64 attributes to save CSV size
        if (item[key] !== null && typeof item[key] !== 'object' && !String(item[key]).startsWith('data:image')) {
          headersSet.add(key);
        }
      });
    }
  });
  
  const headers = Array.from(headersSet);
  const csvRows = [headers.join(',')];
  
  for (const item of data) {
    if (item && typeof item === 'object') {
      const values = headers.map((header: string) => {
        const val = item[header];
        if (val === undefined || val === null) return '""';
        
        const valStr = String(val).replace(/"/g, '""'); // Escape inner double quotes
        return `"${valStr}"`;
      });
      csvRows.push(values.join(','));
    }
  }
  
  return csvRows.join('\r\n');
};

/**
 * Utility to parse data URI to Blob
 */
export const parseBase64ToBlob = (base64Str: string): Blob | null => {
  if (!base64Str || !base64Str.startsWith('data:')) return null;
  try {
    const parts = base64Str.split(',');
    if (parts.length < 2) return null;
    const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch (error) {
    console.error('Error parsing base64 string:', error);
    return null;
  }
};
