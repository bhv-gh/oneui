const HASH_KEY = 'flow-user-hash';

export async function hashSecret(secret) {
  const encoder = new TextEncoder();
  const data = encoder.encode(secret);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function getUserHash() {
  return localStorage.getItem(HASH_KEY) || '';
}

export function setUserHash(hash) {
  localStorage.setItem(HASH_KEY, hash);
}

export function clearUserHash() {
  localStorage.removeItem(HASH_KEY);
}
