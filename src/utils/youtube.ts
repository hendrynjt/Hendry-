/**
 * Extracts a YouTube video ID from standard watch, Shorts, youtu.be, or embed URLs.
 */
export function extractYouTubeVideoId(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();

    if (host === 'youtu.be') {
      const id = parsed.pathname.split('/').filter(Boolean)[0];
      return id && /^[a-zA-Z0-9_-]{6,20}$/.test(id) ? id : null;
    }

    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      if (parsed.pathname.startsWith('/shorts/')) {
        const id = parsed.pathname.split('/')[2];
        return id && /^[a-zA-Z0-9_-]{6,20}$/.test(id) ? id : null;
      }
      if (parsed.pathname.startsWith('/embed/')) {
        const id = parsed.pathname.split('/')[2];
        return id && /^[a-zA-Z0-9_-]{6,20}$/.test(id) ? id : null;
      }
      const v = parsed.searchParams.get('v');
      if (v && /^[a-zA-Z0-9_-]{6,20}$/.test(v)) {
        return v;
      }
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Builds a YouTube embed URL for 9:16 Shorts or standard videos.
 */
export function buildYouTubeEmbedUrl(rawUrl: string): string | null {
  const videoId = extractYouTubeVideoId(rawUrl);
  if (!videoId) return null;
  return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1`;
}

/**
 * Appends ?sub_confirmation=1 to a YouTube channel URL so visitors immediately
 * receive YouTube's official Subscribe confirmation prompt.
 */
export function buildYouTubeSubscribeUrl(channelUrl: string): string {
  const fallback = 'https://www.youtube.com/@hendrysoulveyra?sub_confirmation=1';
  const trimmed = channelUrl.trim();
  if (!trimmed) return fallback;

  try {
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    parsed.searchParams.set('sub_confirmation', '1');
    return parsed.toString();
  } catch {
    return fallback;
  }
}

/**
 * Normalizes a YouTube Shorts or video URL so external links always open reliably.
 */
export function buildSafeExternalYouTubeUrl(rawUrl: string, fallbackChannel: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return fallbackChannel;
  try {
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
  } catch {
    return fallbackChannel;
  }
  return fallbackChannel;
}
