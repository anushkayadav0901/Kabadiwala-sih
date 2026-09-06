import { api } from "./api";

export const createLot = async ({ collectorId: _collectorId, materials, totalWeight, estimatedValue, photoUrls = [], photo, gpsLat, gpsLng }) => {
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
};
export const getCollectorLots = async (collectorId) => (await api(`/lots/collector/${collectorId}`, { auth: true })).lots;
export const getOpenLots = async () => (await api("/lots", { auth: true })).lots;
export const matchLot = async (lotId, quotedPrice) => api(`/lots/${lotId}/match`, { method: "PUT", body: { quotedPrice }, auth: true });
export const completeHandover = async (lotId, payload) => api(`/lots/${lotId}/handover`, { method: "POST", body: payload, auth: true });
export const updateLotStatus = async (lotId, status, recyclerId) => {
  if (status === "matched") return matchLot(lotId);
  if (status === "paid") return completeHandover(lotId, { recyclerId });
  throw new Error("Lot status updates must use matching or handover actions");
};
export const createTraceabilityRecord = async (record) => record;
export const updateTraceabilityStatus = async (lotId, status) => ({ lot_id: lotId, status });
export const subscribeToLotUpdates = () => () => {};
