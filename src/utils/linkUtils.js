const URL_REGEX = /^https?:\/\/\S+$/i;

export function isUrl(text) {
  return URL_REGEX.test(text.trim());
}

export async function fetchPageTitle(url) {
  try {
    const res = await fetch(url, { mode: 'cors' });
    const html = await res.text();
    const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (match) return decodeHTMLEntities(match[1].trim());
  } catch {
    // CORS or network error — fall back to URL-based name
  }
  return fallbackTitle(url);
}

function decodeHTMLEntities(str) {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = str;
  return textarea.value;
}

function fallbackTitle(url) {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/$/, '');
    if (path && path !== '/') {
      const segments = path.split('/').filter(Boolean);
      const last = decodeURIComponent(segments[segments.length - 1])
        .replace(/[-_]/g, ' ')
        .replace(/\.\w+$/, '');
      return `${parsed.hostname} — ${last}`;
    }
    return parsed.hostname;
  } catch {
    return url;
  }
}

// Scan text for URLs present in links array, return segments for rendering.
// URLs in text are replaced visually with their fetched titles.
// Finds ALL occurrences of each URL.
export function getLinkedSegments(text, links) {
  if (!links || links.length === 0 || !text) return null;

  const found = [];
  for (const link of links) {
    let searchFrom = 0;
    while (true) {
      const idx = text.indexOf(link.url, searchFrom);
      if (idx === -1) break;
      found.push({ url: link.url, title: link.title, start: idx, end: idx + link.url.length });
      searchFrom = idx + link.url.length;
    }
  }

  if (found.length === 0) return null;

  found.sort((a, b) => a.start - b.start);

  // Remove overlapping
  const cleaned = [];
  let lastEnd = 0;
  for (const f of found) {
    if (f.start >= lastEnd) {
      cleaned.push(f);
      lastEnd = f.end;
    }
  }

  const result = [];
  let pos = 0;
  for (const seg of cleaned) {
    if (seg.start > pos) {
      result.push({ type: 'text', content: text.slice(pos, seg.start) });
    }
    result.push({ type: 'link', content: seg.title, url: seg.url });
    pos = seg.end;
  }
  if (pos < text.length) {
    result.push({ type: 'text', content: text.slice(pos) });
  }

  return result;
}
