import { api } from "./api";
import { savePendingLot, getPendingLots, removePendingLot, markLotSyncing, markLotFailed } from "../utils/offlineStore";

export const createLot = async ({ collectorId: _collectorId, materials, totalWeight, estimatedValue, photoUrls = [], photo, gpsLat, gpsLng, ...rest }) => {
  const lotPayload = { materials, totalWeight, estimatedValue, photoUrls, gpsLat, gpsLng, ...rest };

  if (!navigator.onLine) {
    const entry = await savePendingLot(lotPayload);
    return {
      _id: entry.offlineId,
      offlineId: entry.offlineId,
      isOffline: true,
      materials,
      totalWeight,
      estimatedValue,
      status: "pending_sync",
      createdAt: entry.createdAt,
    };
  }

  try {
    const form = new FormData();
    form.append("materials", JSON.stringify(materials || []));
    form.append("totalWeight", totalWeight);
    form.append("estimatedValue", estimatedValue);
    form.append("photoUrls", JSON.stringify(photoUrls.filter((url) => !String(url).startsWith("data:image/"))));
    if (gpsLat != null) form.append("gpsLat", gpsLat);
    if (gpsLng != null) form.append("gpsLng", gpsLng);
    if (photo instanceof File) {
      form.append("photo", photo);
    } else {
      const capturedPhoto = photoUrls.find((url) => String(url).startsWith("data:image/"));
      if (capturedPhoto) {
        const blob = await fetch(capturedPhoto).then((response) => response.blob());
        form.append("photo", blob, "lot-photo.jpg");
      }
    }
    return (await api("/lots", { method: "POST", body: form, auth: true })).lot;
  } catch (err) {
    if (!navigator.onLine || err.message === "Failed to fetch") {
      const entry = await savePendingLot(lotPayload);
      return {
        _id: entry.offlineId,
        offlineId: entry.offlineId,
        isOffline: true,
        materials,
        totalWeight,
        estimatedValue,
        status: "pending_sync",
        createdAt: entry.createdAt,
      };
    }
    throw err;
  }
};

export const syncPendingLots = async () => {
  if (!navigator.onLine) return { synced: 0, failed: 0, pending: 0 };

  const pending = await getPendingLots();
  let synced = 0;
  let failed = 0;

  for (const entry of pending) {
    if (entry.status === "syncing") continue;
    try {
      await markLotSyncing(entry.offlineId);
      const { materials, totalWeight, estimatedValue, photoUrls = [], photo, gpsLat, gpsLng } = entry.lotData;

      const form = new FormData();
      form.append("materials", JSON.stringify(materials || []));
      form.append("totalWeight", totalWeight);
      form.append("estimatedValue", estimatedValue);
      form.append("photoUrls", JSON.stringify((photoUrls || []).filter((url) => !String(url).startsWith("data:image/"))));
      if (gpsLat != null) form.append("gpsLat", gpsLat);
      if (gpsLng != null) form.append("gpsLng", gpsLng);
      if (photo instanceof File) {
        form.append("photo", photo);
      } else {
        const capturedPhoto = (photoUrls || []).find((url) => String(url).startsWith("data:image/"));
        if (capturedPhoto) {
          const blob = await fetch(capturedPhoto).then((r) => r.blob());
          form.append("photo", blob, "lot-photo.jpg");
        }
      }

      await api("/lots", { method: "POST", body: form, auth: true });
      await removePendingLot(entry.offlineId);
      synced++;
    } catch (err) {
      await markLotFailed(entry.offlineId, err.message);
      failed++;
    }
  }

  const remaining = await getPendingLots();
  return { synced, failed, pending: remaining.length };
};

export const getCollectorLots = async (collectorId) => (await api(`/lots/collector/${collectorId}`, { auth: true })).lots;
export const getLotPassport = async (lotId) => (await api(`/lots/${lotId}/passport`, { auth: true })).passport;
export const getScrapDna = async (lotId) => (await api(`/lots/${lotId}/scrap-dna`, { auth: true })).dna;
export const prepareLotPassport = async (lotId, recyclerId) => (await api(`/lots/${lotId}/passport`, { method: "POST", body: { recyclerId }, auth: true })).passport;
export const getOpenLots = async () => (await api("/lots", { auth: true })).lots;
export const matchLot = async (lotId, quotedPrice) => api(`/lots/${lotId}/match`, { method: "PUT", body: { quotedPrice }, auth: true });
export const completeHandover = async (lotId, payload) => api(`/lots/${lotId}/handover`, { method: "POST", body: payload, auth: true });
export const updateLotStatus = async (lotId, status, recyclerId) => {
  if (status === "matched") return matchLot(lotId);
  if (status === "paid") return completeHandover(lotId, { recyclerId });
  throw new Error("Lot status updates must use matching or handover actions");
};
// Live bidding (reverse auction) on a lot.
export const openAuction = async (lotId) => (await api(`/lots/${lotId}/auction`, { method: "POST", auth: true })).auction;
export const getAuction = async (lotId) => (await api(`/lots/${lotId}/auction`, { auth: true })).auction;
export const acceptAuctionBid = async (lotId, recyclerId) => api(`/lots/${lotId}/auction/accept`, { method: "POST", body: { recyclerId }, auth: true });
export const getOpenAuctions = async () => (await api("/auctions/open", { auth: true })).auctions;
export const placeAuctionBid = async (lotId, amount) => (await api(`/lots/${lotId}/bids`, { method: "POST", body: { amount }, auth: true })).auction;

export const createTraceabilityRecord = async (record) => record;
export const updateTraceabilityStatus = async (lotId, status) => ({ lot_id: lotId, status });
export const subscribeToLotUpdates = () => () => {};
