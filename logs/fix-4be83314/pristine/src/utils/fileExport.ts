import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * Exports a file. On native: writes to Documents and opens the Share sheet.
 * On web: uses the classic anchor-download trick.
 */
export async function exportFile(
  filename: string,
  content: string,
  mimeType: string = 'text/plain'
): Promise<boolean> {
  // ---- WEB ----
  if (!Capacitor.isNativePlatform()) {
    try {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      return true;
    } catch (err) {
      console.warn('Web download failed:', err);
      return false;
    }
  }

  // ---- NATIVE (Android / iOS) ----
  let uri: string | null = null;

  // Try Documents first
  try {
    const res = await Filesystem.writeFile({
      path: filename,
      data: content,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
      recursive: true,
    });
    uri = res.uri;
  } catch (err) {
    console.warn('Documents write failed, trying Cache:', err);
    // Fallback to Cache
    try {
      const res = await Filesystem.writeFile({
        path: filename,
        data: content,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
        recursive: true,
      });
      uri = res.uri;
    } catch (err2) {
      console.error('Cache write also failed:', err2);
      return false;
    }
  }

  if (!uri) return false;

  // Open the Share sheet so the user can save / email / upload
  try {
    await Share.share({
      title: filename,
      text: 'Task Priority export',
      url: uri,
      dialogTitle: 'Save or share your file',
    });
    return true;
  } catch (shareErr) {
    // User may have cancelled — file still exists, so treat as success
    console.log('Share cancelled or unavailable:', shareErr);
    return true;
  }
}