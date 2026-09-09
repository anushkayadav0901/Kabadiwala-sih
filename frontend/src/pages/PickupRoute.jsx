import React, { useEffect, useState } from "react";
import { Navbar } from "../components/Navbar";
import { Button } from "../components/Button";
import { Loader } from "../components/Loader";
import { getCurrentBuyer } from "../services/authService";
import { generateTodayRoute, getTodayRoute, markStopComplete, syncPendingRouteUpdates } from "../services/routeService";
import { MapContainer, Marker, Polyline, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import { HiArrowPath, HiCheckCircle, HiMapPin, HiOutlineSignalSlash } from "react-icons/hi2";

const markerIcon = (label, color = "#3A34D4") => new L.DivIcon({
  className: "",
  html: `<span style="display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 2px 6px rgba(15,20,36,.35);color:#fff;font-size:12px;font-weight:800">${label}</span>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

const stopLotId = (stop) => stop.lot?._id || stop.lot;
const routeCoordinates = (route) => route?.routeGeometry?.coordinates?.map(([lng, lat]) => [lat, lng]) || [];

export const PickupRoute = () => {
  const buyer = getCurrentBuyer();
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [error, setError] = useState("");

  const loadRoute = async () => {
    setLoading(true);
    setError("");
    try {
      setRoute(await getTodayRoute(buyer.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoute();
    const handleOnline = async () => {
      setOffline(false);
      await syncPendingRouteUpdates();
      loadRoute();
    };
    const handleOffline = () => setOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [buyer.id]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError("");
    try {
      const response = await generateTodayRoute();
      setRoute(response.route);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleStop = async (stop) => {
    const lotId = stopLotId(stop);
    try {
      const updated = await markStopComplete(route._id || route.id, lotId, "picked_up");
      if (updated) setRoute(updated);
    } catch (err) {
      setError(err.message);
    }
  };

  const stops = [...(route?.stops || [])].sort((a, b) => a.sequence - b.sequence);
  const depotLat = route?.recycler?.locationLat ?? buyer.locationLat ?? stops[0]?.lat;
  const depotLng = route?.recycler?.locationLng ?? buyer.locationLng ?? stops[0]?.lng;
  const center = depotLat != null && depotLng != null ? [depotLat, depotLng] : [28.6139, 77.2090];

  return (
    <div className="screen pb-10">
      <Navbar title="Today's pickup route" />
      <main className="col px-4 pt-4 flex flex-col gap-4">
        {offline && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[12.5px] font-semibold">
            <HiOutlineSignalSlash className="text-base shrink-0" /> Viewing the saved route. Stop updates will sync when you reconnect.
          </div>
        )}

        {loading ? <Loader message="Loading today's route" /> : !route ? (
          <section className="card p-6 text-center">
            <HiMapPin className="text-3xl text-brand-600 mx-auto" />
            <h2 className="font-bold text-[17px] mt-3">No route ready yet</h2>
            <p className="text-[13px] text-muted mt-1">Generate a route after accepting at least two lots with location data.</p>
            <Button className="mt-4" size="md" onClick={handleGenerate} loading={generating} icon={HiArrowPath}>Generate today's route</Button>
          </section>
        ) : (
          <>
            <section className="flex items-end justify-between gap-3">
              <div>
                <p className="eyebrow">Route summary</p>
                <h2 className="text-[20px] font-bold text-ink mt-1">{stops.length} collection stops</h2>
              </div>
              <span className="badge bg-brand-50 text-brand-700">{route.totalDistanceKm} km · {Math.round(route.totalDurationMin)} min</span>
            </section>

            <div className="relative h-64 rounded-[18px] overflow-hidden border border-line">
              <MapContainer center={center} zoom={12} scrollWheelZoom={false} zoomControl={false} className="w-full h-full">
                <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={center} icon={markerIcon("D", "#172033")}><Popup>Recycler depot</Popup></Marker>
                {stops.map((stop) => (
                  <Marker key={String(stopLotId(stop))} position={[stop.lat, stop.lng]} icon={markerIcon(stop.sequence)}>
                    <Popup>{stop.collector?.name || "Collector"}</Popup>
                  </Marker>
                ))}
                {routeCoordinates(route).length > 1 && <Polyline positions={routeCoordinates(route)} pathOptions={{ color: "#3A34D4", weight: 4 }} />}
              </MapContainer>
            </div>

            <section>
              <div className="sec-head"><h3 className="sec-title">Stops in visit order</h3><span className="text-[12.5px] text-faint">{stops.filter((stop) => stop.status !== "pending").length}/{stops.length} done</span></div>
              <div className="flex flex-col gap-2.5">
                {stops.map((stop) => (
                  <div key={String(stopLotId(stop))} className="card p-4 flex items-center gap-3">
                    <span className="w-9 h-9 shrink-0 rounded-full bg-brand-50 text-brand-700 grid place-items-center font-bold">{stop.sequence}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[14px] truncate">{stop.collector?.name || "Collector"}</p>
                      <p className="text-[12.5px] text-faint truncate">{stop.lot?.materials?.[0]?.category || "Mixed scrap"} · {stop.weightKg} kg</p>
                    </div>
                    {stop.status === "pending" ? (
                      <Button size="sm" fullWidth={false} onClick={() => handleStop(stop)}>Mark picked up</Button>
                    ) : (
                      <span className="flex items-center gap-1 text-[12px] font-semibold text-green-700"><HiCheckCircle /> {stop.status === "skipped" ? "Skipped" : "Picked up"}</span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
        {error && <p className="text-[13px] text-alert-600">{error}</p>}
      </main>
    </div>
  );
};