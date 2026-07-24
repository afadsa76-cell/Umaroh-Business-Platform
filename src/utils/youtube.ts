/**
 * Utility to extract clean media info (YouTube, Google Drive, Google Photos, or Direct MP4)
 */

export type MediaPlatform = 'youtube' | 'gdrive' | 'gphotos' | 'direct' | 'other';

export interface MediaInfo {
  platform: MediaPlatform;
  embedUrl: string;
  watchUrl: string;
  thumbnailUrl: string;
  platformName: string;
  badgeBg: string;
  fileId?: string;
}

export function getMediaInfo(urlOrCode: string | undefined | null): MediaInfo {
  if (!urlOrCode) {
    return {
      platform: 'other',
      embedUrl: '',
      watchUrl: '',
      thumbnailUrl: '',
      platformName: 'MEDIA',
      badgeBg: 'bg-slate-700',
    };
  }

  const trimmed = urlOrCode.trim();

  // 1. Extract if wrapped in iframe tag src="..."
  const iframeMatch = trimmed.match(/src=["']([^"']+)["']/);
  const target = iframeMatch && iframeMatch[1] ? iframeMatch[1] : trimmed;

  // 2. Check Google Drive
  // Formats: drive.google.com/file/d/FILE_ID, drive.google.com/open?id=FILE_ID, docs.google.com/file/d/FILE_ID
  const gdriveFileMatch = target.match(/(?:drive|docs)\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([a-zA-Z0-9_-]+)/);
  if (gdriveFileMatch && gdriveFileMatch[1]) {
    const fileId = gdriveFileMatch[1];
    return {
      platform: 'gdrive',
      embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
      watchUrl: `https://drive.google.com/file/d/${fileId}/view?usp=sharing`,
      thumbnailUrl: `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`,
      platformName: 'GOOGLE DRIVE',
      badgeBg: 'bg-blue-600',
      fileId,
    };
  }

  // 3. Check Google Photos
  if (target.includes('photos.app.goo.gl') || target.includes('photos.google.com')) {
    return {
      platform: 'gphotos',
      embedUrl: target,
      watchUrl: target,
      thumbnailUrl: '',
      platformName: 'GOOGLE PHOTOS',
      badgeBg: 'bg-emerald-600',
    };
  }

  // 4. Check YouTube
  const ytRegExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
  const ytMatch = target.match(ytRegExp);
  const ytId = ytMatch && ytMatch[2] && ytMatch[2].length === 11 ? ytMatch[2] : (target.length === 11 && !target.includes('/') && !target.includes(':') ? target : null);

  if (ytId) {
    return {
      platform: 'youtube',
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytId}?rel=0&enablejsapi=1&autoplay=1`,
      watchUrl: `https://www.youtube.com/watch?v=${ytId}`,
      thumbnailUrl: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
      platformName: 'YOUTUBE',
      badgeBg: 'bg-red-600',
      fileId: ytId,
    };
  }

  // 5. Direct Video / MP4 / WebM
  if (/\.(mp4|webm|mov|ogg|m4v)(\?.*)?$/i.test(target)) {
    return {
      platform: 'direct',
      embedUrl: target,
      watchUrl: target,
      thumbnailUrl: '',
      platformName: 'VIDEO MP4',
      badgeBg: 'bg-purple-600',
    };
  }

  // Fallback
  return {
    platform: 'other',
    embedUrl: target,
    watchUrl: target,
    thumbnailUrl: '',
    platformName: 'LINK MEDIA',
    badgeBg: 'bg-slate-700',
  };
}

// Backward-compatible helpers
export function getYouTubeVideoId(urlOrCode: string | undefined | null): string | null {
  const info = getMediaInfo(urlOrCode);
  if (info.platform === 'youtube') {
    return info.fileId || null;
  }
  return null;
}

export function getYouTubeThumbnailUrl(urlOrCode: string | undefined | null): string {
  return getMediaInfo(urlOrCode).thumbnailUrl;
}

export function getYouTubeWatchUrl(urlOrCode: string | undefined | null): string {
  return getMediaInfo(urlOrCode).watchUrl;
}

export function getYouTubeEmbedUrl(urlOrCode: string | undefined | null): string {
  return getMediaInfo(urlOrCode).embedUrl;
}
