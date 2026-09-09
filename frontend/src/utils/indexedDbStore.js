import { openDB } from "idb";

const DB_NAME = "kabadiwala-routes";
const DB_VERSION = 1;
const ROUTE_KEY = "current";

const getDatabase = () => openDB(DB_NAME, DB_VERSION, {
  upgrade(database) {
    if (!database.objectStoreNames.contains("todaysRoute")) database.createObjectStore("todaysRoute", { keyPath: "id" });
    if (!database.objectStoreNames.contains("pendingStopUpdates")) database.createObjectStore("pendingStopUpdates", { keyPath: "id", autoIncrement: true });
  }
});

export const saveRouteLocally = async (route) => {
  if (route) await (await getDatabase()).put("todaysRoute", { ...route, id: ROUTE_KEY });
  return route;
};

export const getRouteLocally = async () => (await getDatabase()).get("todaysRoute", ROUTE_KEY) || null;

export const queueStopUpdate = async (routeId, lotId, status) => (await getDatabase()).add("pendingStopUpdates", {
  routeId,
  lotId,
  status,
  createdAt: new Date().toISOString()
});

export const getPendingStopUpdates = async () => (await getDatabase()).getAll("pendingStopUpdates");

export const clearPendingUpdate = async (id) => (await getDatabase()).delete("pendingStopUpdates", id);