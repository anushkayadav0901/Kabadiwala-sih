import Lot from "../models/Lot.js";
import PickupRoute from "../models/PickupRoute.js";
import Recycler from "../models/Recycler.js";

const haversineKm = (from, to) => {
  const radians = (value) => (value * Math.PI) / 180;
  const dLat = radians(to.lat - from.lat);
  const dLng = radians(to.lng - from.lng);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(radians(from.lat)) * Math.cos(radians(to.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const nearestNeighbor = (lots, recycler) => {
  const remaining = [...lots];
  const ordered = [];
  let current = { lat: recycler.locationLat, lng: recycler.locationLng };
  while (remaining.length) {
    let nearestIndex = 0;
    let nearestDistance = Infinity;
    remaining.forEach((lot, index) => {
      const distance = haversineKm(current, { lat: lot.gpsLat, lng: lot.gpsLng });
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });
    const [next] = remaining.splice(nearestIndex, 1);
    ordered.push(next);
    current = { lat: next.gpsLat, lng: next.gpsLng };
  }
  return ordered;
};

const fetchOsrmTrip = async (coordinates) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const coordinateString = coordinates.map(({ lng, lat }) => `${lng},${lat}`).join(";");
    const response = await fetch(
      `https://router.project-osrm.org/trip/v1/driving/${coordinateString}?source=first&roundtrip=false&overview=full&geometries=geojson`,
      { signal: controller.signal }
    );
    if (!response.ok) return null;
    const payload = await response.json();
    if (payload.code !== "Ok" || !payload.trips?.[0] || !payload.waypoints?.length) return null;
    return payload;
  } finally {
    clearTimeout(timeout);
  }
};

export const generateRouteForRecycler = async (recyclerId) => {
  const recycler = await Recycler.findById(recyclerId);
  if (!recycler) throw new Error("Recycler not found");

  const lots = await Lot.find({ matchedRecycler: recyclerId, status: "matched", routeId: null })
    .populate("collector", "name phone");
  const routableLots = lots.filter((lot) => Number.isFinite(lot.gpsLat) && Number.isFinite(lot.gpsLng));
  if (routableLots.length < 2) return null;

  const depot = { lat: recycler.locationLat, lng: recycler.locationLng };
  let orderedLots = nearestNeighbor(routableLots, recycler);
  let routeGeometry = null;
  let totalDistanceKm = 0;
  let totalDurationMin = 0;

  try {
    const osrm = await fetchOsrmTrip([depot, ...routableLots.map((lot) => ({ lat: lot.gpsLat, lng: lot.gpsLng }))]);
    if (osrm) {
      const indexedLots = new Map(routableLots.map((lot, index) => [index + 1, lot]));
      const orderedIndexes = osrm.waypoints
        .map((waypoint, inputIndex) => ({ ...waypoint, inputIndex }))
        .filter((waypoint) => waypoint.inputIndex !== 0 && waypoint.waypoint_index != null)
        .sort((a, b) => a.waypoint_index - b.waypoint_index)
        .map((waypoint) => waypoint.inputIndex);
      const osrmLots = orderedIndexes.map((index) => indexedLots.get(index)).filter(Boolean);
      if (osrmLots.length === routableLots.length) orderedLots = osrmLots;
      routeGeometry = osrm.trips[0].geometry;
      totalDistanceKm = Number((osrm.trips[0].distance / 1000).toFixed(2));
      totalDurationMin = Number((osrm.trips[0].duration / 60).toFixed(2));
    }
  } catch {
    // The nearest-neighbor route remains usable when the public router is unavailable.
  }

  if (!totalDistanceKm) {
    let previous = depot;
    for (const lot of orderedLots) {
      totalDistanceKm += haversineKm(previous, { lat: lot.gpsLat, lng: lot.gpsLng });
      previous = { lat: lot.gpsLat, lng: lot.gpsLng };
    }
    totalDistanceKm = Number(totalDistanceKm.toFixed(2));
    totalDurationMin = Number((totalDistanceKm * 3).toFixed(2));
  }

  const route = await PickupRoute.create({
    recycler: recyclerId,
    date: new Date(),
    stops: orderedLots.map((lot, index) => ({
      lot: lot._id,
      collector: lot.collector._id || lot.collector,
      lat: lot.gpsLat,
      lng: lot.gpsLng,
      weightKg: lot.totalWeight,
      sequence: index + 1
    })),
    totalDistanceKm,
    totalDurationMin,
    routeGeometry
  });
  await Lot.updateMany({ _id: { $in: orderedLots.map((lot) => lot._id) } }, { $set: { routeId: route._id } });
  return route.populate([{ path: "stops.lot" }, { path: "stops.collector", select: "name phone" }]);
};