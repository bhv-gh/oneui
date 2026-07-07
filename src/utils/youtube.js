// Direct-to-YouTube upload from the browser using Google Identity Services
// (GIS) for OAuth and the YouTube Data API v3 resumable upload endpoint.
//
// Requires a Google Cloud OAuth **Web** client ID in:
//   REACT_APP_GOOGLE_CLIENT_ID
// with the app's origin listed under "Authorized JavaScript origins", and the
// YouTube Data API v3 enabled on the project. Uploads are created as private.

const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const SCOPE = 'https://www.googleapis.com/auth/youtube.upload';
const GIS_SRC = 'https://accounts.google.com/gsi/client';

export function isYouTubeConfigured() {
  return !!CLIENT_ID;
}

// Load the GIS script once.
let gisPromise = null;
function loadGis() {
  if (gisPromise) return gisPromise;
  gisPromise = new Promise((resolve, reject) => {
    if (window.google && window.google.accounts && window.google.accounts.oauth2) {
      resolve();
      return;
    }
    const s = document.createElement('script');
    s.src = GIS_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(s);
  });
  return gisPromise;
}

// Interactively get an OAuth access token with the youtube.upload scope.
async function getAccessToken() {
  if (!CLIENT_ID) throw new Error('Missing REACT_APP_GOOGLE_CLIENT_ID');
  await loadGis();
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: (resp) => {
        if (resp && resp.access_token) resolve(resp.access_token);
        else reject(new Error(resp?.error || 'Authorization failed'));
      },
      error_callback: (err) => reject(new Error(err?.type || 'Authorization failed')),
    });
    client.requestAccessToken({ prompt: '' });
  });
}

// Upload a video blob to YouTube as a private video.
//   opts: { title, description, onProgress(0..1) }
// Returns { id, url }.
export async function uploadToYouTube(blob, opts = {}) {
  const token = await getAccessToken();
  const metadata = {
    snippet: {
      title: (opts.title || 'Focus timelapse').slice(0, 100),
      description: opts.description || 'Focus session timelapse.',
    },
    status: { privacyStatus: 'private', selfDeclaredMadeForKids: false },
  };

  // 1) start a resumable session
  const initRes = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': blob.type || 'video/webm',
        'X-Upload-Content-Length': String(blob.size),
      },
      body: JSON.stringify(metadata),
    }
  );
  if (!initRes.ok) {
    throw new Error(`YouTube init failed (${initRes.status}): ${await initRes.text()}`);
  }
  const uploadUrl = initRes.headers.get('location');
  if (!uploadUrl) throw new Error('No upload URL returned by YouTube');

  // 2) upload the bytes (XHR so we get progress events)
  const result = await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl, true);
    xhr.setRequestHeader('Content-Type', blob.type || 'video/webm');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && opts.onProgress) opts.onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error('Bad response from YouTube'));
        }
      } else {
        reject(new Error(`Upload failed (${xhr.status}): ${xhr.responseText}`));
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(blob);
  });

  return { id: result.id, url: `https://youtu.be/${result.id}` };
}
