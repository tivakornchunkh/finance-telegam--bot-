import { getConfig } from '../config/config.js';

/**
 * Uploads a slip image to permanent image hosting and returns a direct image URL.
 * Catbox.moe is used as primary (free, permanent, fast, compatible with Google Sheets =IMAGE).
 * ImgBB is used as optional fallback if IMGBB_API_KEY is configured.
 */
export async function uploadSlipImage(
  buffer: Buffer,
  filename = 'slip.jpg',
  mimeType = 'image/jpeg'
): Promise<string | null> {
  // 1. Try Catbox (fast, reliable, permanent direct image URLs)
  try {
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });
    form.append('fileToUpload', blob, filename);

    const res = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      body: form,
    });

    if (res.ok) {
      const url = (await res.text()).trim();
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
      }
    }
    console.warn('[Uploader] Catbox upload returned unexpected response:', res.status);
  } catch (err) {
    console.warn('[Uploader] Catbox upload error:', err);
  }

  // 2. Fallback to ImgBB if key is configured
  try {
    const config = getConfig();
    const apiKey = config.IMGBB_API_KEY || process.env.IMGBB_API_KEY;

    if (apiKey) {
      const form = new FormData();
      form.append('image', buffer.toString('base64'));

      const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: 'POST',
        body: form,
      });

      if (res.ok) {
        const json = (await res.json()) as { data?: { url?: string; display_url?: string } };
        const url = json.data?.url || json.data?.display_url;
        if (url) {
          return url;
        }
      }
      console.warn('[Uploader] ImgBB upload failed with status:', res.status);
    }
  } catch (err) {
    console.warn('[Uploader] ImgBB upload error:', err);
  }

  return null;
}
