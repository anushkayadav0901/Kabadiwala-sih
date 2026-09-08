const DB_NAME = "kabadi_offline";
const DB_VERSION = 1;
const LOTS_STORE = "pending_lots";
const CACHE_STORE = "data_cache";

let dbPromise;

const openDB = () => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(LOTS_STORE)) {
        db.createObjectStore(LOTS_STORE, { keyPath: "offlineId" });
      }
      if (!db.objectStoreNames.contains(CACHE_STORE)) {
        db.createObjectStore(CACHE_STORE, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
};

const tx = async (storeName, mode = "readonly") => {
  const db = await openDB();
  return db.transaction(storeName, mode).objectStore(storeName);
};

const promisify = (request) =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

// ── Pending lots ────────────────────────────────────────────────────

export const savePendingLot = async (lotData) => {
  const entry = {
    offlineId: `offline_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    lotData,
    createdAt: new Date().toISOString(),
    status: "pending",
  };
  const store = await tx(LOTS_STORE, "readwrite");
  await promisify(store.put(entry));
  return entry;
};

export const getPendingLots = async () => {
  const store = await tx(LOTS_STORE);
  return promisify(store.getAll());
};

export const getPendingCount = async () => {
  const store = await tx(LOTS_STORE);
  return promisify(store.count());
};

export const removePendingLot = async (offlineId) => {
  const store = await tx(LOTS_STORE, "readwrite");
  return promisify(store.delete(offlineId));
};

export const markLotSyncing = async (offlineId) => {
  const store = await tx(LOTS_STORE, "readwrite");
  const entry = await promisify(store.get(offlineId));
  if (entry) {
    entry.status = "syncing";
    await promisify(store.put(entry));
  }
};

export const markLotFailed = async (offlineId, error) => {
  const store = await tx(LOTS_STORE, "readwrite");
  const entry = await promisify(store.get(offlineId));
  if (entry) {
    entry.status = "failed";
    entry.error = error;
    await promisify(store.put(entry));
  }
};

// ── Data cache (prices, recyclers) ──────────────────────────────────

export const cacheData = async (key, data, ttlMs = 3600000) => {
  const store = await tx(CACHE_STORE, "readwrite");
  await promisify(store.put({
    key,
    data,
    cachedAt: Date.now(),
    expiresAt: Date.now() + ttlMs,
  }));
};

export const getCachedData = async (key) => {
  try {
    const store = await tx(CACHE_STORE);
    const entry = await promisify(store.get(key));
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) return entry.data;
    return entry.data;
  } catch {
    return null;
  }
};
