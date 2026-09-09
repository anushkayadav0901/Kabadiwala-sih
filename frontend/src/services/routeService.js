import { api } from "./api";
import {
  clearPendingUpdate,
  getPendingStopUpdates,
  getRouteLocally,
  queueStopUpdate,
  saveRouteLocally
} from "../utils/indexedDbStore";

const online = () => typeof navigator === "undefined" || navigator.onLine;

export const generateTodayRoute = async () => {
  const response = await api("/routes/generate", { method: "POST", auth: true });
  if (response.route) await saveRouteLocally(response.route);
  return response;
};

export const getTodayRoute = async (recyclerId) => {
  const cached = await getRouteLocally();
  if (!online()) return cached;
  try {
    const response = await api(`/routes/${recyclerId}/today`);
    if (response.route) await saveRouteLocally(response.route);
    return response.route || cached;
  } catch (error) {
    if (cached) return cached;
    throw error;
  }
};

const updateCachedStop = async (routeId, lotId, status) => {
  const route = await getRouteLocally();
  if (!route || String(route._id || route.id) !== String(routeId)) return null;
  const updatedRoute = {
    ...route,
    stops: route.stops.map((stop) => String(stop.lot?._id || stop.lot) === String(lotId) ? { ...stop, status } : stop),
    status: route.stops.every((stop) => String(stop.lot?._id || stop.lot) === String(lotId) ? status !== "pending" : stop.status !== "pending") ? "completed" : route.status
  };
  await saveRouteLocally(updatedRoute);
  return updatedRoute;
};

export const markStopComplete = async (routeId, lotId, status = "picked_up") => {
  if (online()) {
    try {
      const response = await api(`/routes/${routeId}/stop/${lotId}`, { method: "PATCH", body: { status }, auth: true });
      if (response.route) await saveRouteLocally(response.route);
      return response.route;
    } catch (error) {
      if (online()) throw error;
    }
  }
  await queueStopUpdate(routeId, lotId, status);
  return updateCachedStop(routeId, lotId, status);
};

export const syncPendingRouteUpdates = async () => {
  if (!online()) return { synced: 0, remaining: (await getPendingStopUpdates()).length };
  const pending = await getPendingStopUpdates();
  let synced = 0;
  for (const update of pending) {
    try {
      const response = await api(`/routes/${update.routeId}/stop/${update.lotId}`, { method: "PATCH", body: { status: update.status }, auth: true });
      await clearPendingUpdate(update.id);
      if (response.route) await saveRouteLocally(response.route);
      synced++;
    } catch {
      // Keep failed updates for the next online sync attempt.
    }
  }
  return { synced, remaining: (await getPendingStopUpdates()).length };
};