// src/utils/storage.js
// IndexedDB storage to make saving survive tab closes / reloads better than localStorage.

const DB_NAME = 'coloring-book';
const DB_VERSION = 1;

const STORE_IMAGES = 'images';     // key: id, value: { id, name, src }
const STORE_PROGRESS = 'progress'; // key: imageId, value: { id, dataURL, updatedAt }

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_IMAGES)) db.createObjectStore(STORE_IMAGES);
      if (!db.objectStoreNames.contains(STORE_PROGRESS)) db.createObjectStore(STORE_PROGRESS);
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(storeName, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

async function idbSet(storeName, key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.put(value, key);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

async function idbDelete(storeName, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.delete(key);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

async function idbGetAllValues(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

// ───────────────────────────────────────────────────────────────
// Public API (same shape as your localStorage version)
// ───────────────────────────────────────────────────────────────

export async function loadImages() {
  try {
    const all = await idbGetAllValues(STORE_IMAGES);
    // Keep stable ordering: newest first if you want; otherwise leave as-is.
    return Array.isArray(all) ? all : [];
  } catch {
    return [];
  }
}

export async function saveImages(images) {
  try {
    // Store id, name, src (base64/dataURL)
    // We'll upsert each image record by id.
    await Promise.all(
      (images || []).map(({ id, name, src }) =>
        idbSet(STORE_IMAGES, id, { id, name, src })
      )
    );
  } catch {
    // ignore
  }
}

export async function loadProgress(id) {
  try {
    const row = await idbGet(STORE_PROGRESS, id);
    return row?.dataURL ?? null;
  } catch {
    return null;
  }
}

export async function saveProgress(id, dataURL) {
  try {
    await idbSet(STORE_PROGRESS, id, { id, dataURL, updatedAt: Date.now() });
  } catch {
    // ignore
  }
}

export async function deleteProgress(id) {
  try {
    await idbDelete(STORE_PROGRESS, id);
  } catch {
    // ignore
  }
}

// Small helper: throttle (used by Canvas autosave)
export function throttle(fn, wait = 500) {
  let last = 0;
  let t = null;
  let pending = null;

  const run = () => {
    const args = pending;
    pending = null;
    last = Date.now();
    t = null;
    return fn(...args);
  };

  return (...args) => {
    pending = args;
    const now = Date.now();
    const remain = wait - (now - last);
    if (remain <= 0) {
      if (t) clearTimeout(t);
      return run();
    }
    if (!t) t = setTimeout(run, remain);
  };
}
