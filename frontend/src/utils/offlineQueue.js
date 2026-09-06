const QUEUE_KEY = "kabadi_offline_queue";

export const isOnline = () => navigator.onLine;

export const enqueue = (action, payload) => {
  const queue = getQueue();
  queue.push({ id: `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, action, payload, createdAt: new Date().toISOString() });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  return queue[queue.length - 1];
};

export const getQueue = () => {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]"); } catch { return []; }
};

export const removeFromQueue = (id) => {
  const queue = getQueue().filter((item) => item.id !== id);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
};

export const clearQueue = () => localStorage.removeItem(QUEUE_KEY);

export const syncQueue = async (handlers) => {
  if (!isOnline()) return { synced: 0, failed: 0, remaining: getQueue().length };
  const queue = getQueue();
  let synced = 0;
  let failed = 0;
  for (const item of queue) {
    try {
      const handler = handlers[item.action];
      if (handler) {
        await handler(item.payload);
        removeFromQueue(item.id);
        synced++;
      }
    } catch {
      failed++;
    }
  }
  return { synced, failed, remaining: getQueue().length };
};
