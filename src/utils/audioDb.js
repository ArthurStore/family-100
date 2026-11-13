const DB_NAME = 'family100_audio_db';
const DB_VERSION = 1;
const STORE_NAME = 'custom_audio';

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB tidak tersedia di browser ini.'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadAllCustomAudio() {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      const keysReq = store.getAllKeys();
      tx.oncomplete = () => {
        const result = {};
        const keys = keysReq.result || [];
        const vals = req.result || [];
        keys.forEach((k, i) => {
          result[k] = vals[i];
        });
        resolve(result);
      };
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    return {};
  }
}

export async function saveCustomAudioSlot(slotKey, entry) {
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(entry, slotKey);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err?.message || 'Gagal menyimpan audio ke IndexedDB.',
    };
  }
}

export async function deleteCustomAudioSlot(slotKey) {
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(slotKey);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
