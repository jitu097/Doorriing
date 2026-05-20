// Lightweight persistent cache for selected query keys (localStorage)
const STORAGE_KEY = 'doorriing:persistentQueryCache:v1';

const DEFAULT_WHITELIST = [
  'home-shops',
  'dashboard:categories',
  'dashboard:nearby',
  'dashboard:banners',
];

function readRaw() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    console.warn('[persistentCache] read error', e);
    return {};
  }
}

function writeRaw(obj) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch (e) {
    console.warn('[persistentCache] write error', e);
  }
}

export function restoreKeys(whitelist = DEFAULT_WHITELIST) {
  const raw = readRaw();
  const out = {};
  for (const k of whitelist) {
    if (raw[k]) out[k] = raw[k];
  }
  return out;
}

export function persistEntries(entries = {}, opts = { debounceMs: 300 }) {
  // entries: { key: { data, timestamp, ttl } }
  const prev = readRaw();
  const merged = { ...prev, ...entries };
  writeRaw(merged);
}

export function clearPersistent() {
  try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
}

export default {
  restoreKeys,
  persistEntries,
  clearPersistent,
};
