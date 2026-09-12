import React, { useState, useEffect } from "react";
import { useLocation as useRouterLocation, useNavigate } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { BottomNavigation } from "../components/BottomNavigation";
import { RecyclerCard } from "../components/RecyclerCard";
import { Loader } from "../components/Loader";
import { Button } from "../components/Button";
import { getNearbyRecyclers } from "../services/recyclerService";
import { openAuction } from "../services/lotService";
import { SCRAP_CATEGORIES } from "../utils/constants";
import { useApp } from "../context/AppContext";
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from "react-leaflet";
import L from "leaflet";
import { HiOutlineMapPin, HiOutlineBuildingOffice2, HiXMark, HiOutlineBolt, HiOutlineExclamationTriangle } from "react-icons/hi2";

/* A depot pin drawn to match the design system rather than Leaflet's default
   blue teardrop — indigo body, white core, soft drop shadow. */
const depotPin = new L.DivIcon({
  className: "",
  html: `
    <span style="
      display:block;width:26px;height:26px;border-radius:50% 50% 50% 2px;
      transform:rotate(45deg);
      background:var(--color-brand-600,#3A34D4);
      border:2.5px solid #fff;
      box-shadow:0 2px 6px rgba(15,20,36,.35);
    "></span>`,
  iconSize: [26, 26],
  iconAnchor: [13, 26],
  popupAnchor: [0, -24]
});

export const NearbyRecyclers = () => {
  const { userLocation, activeLot, t } = useApp();
  const routerLocation = useRouterLocation();
  const navigate = useNavigate();
  const eprState = routerLocation.state;
  const [recyclers, setRecyclers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(
    eprState?.eprCategories ? "e_waste" : "all"
  );
  const [eprBanner, setEprBanner] = useState(!!eprState?.eprProducer);
  const [auctionBusy, setAuctionBusy] = useState(false);
  const [auctionError, setAuctionError] = useState("");

  const lotId = activeLot?.id || activeLot?._id;
  // Bidding needs a lot the server knows about that no recycler has taken yet.
  const canAuction = Boolean(lotId) && !activeLot?.isOffline && (!activeLot?.status || activeLot.status === "created");

  useEffect(() => {
    const fetchRecyclers = async () => {
      setLoading(true);
      try {
        const eprProducerId = eprBanner ? eprState?.eprProducerId : null;
        const list = await getNearbyRecyclers(userLocation, selectedCategory, null, activeLot?.id, eprProducerId);
        setRecyclers(list);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecyclers();
  }, [selectedCategory, userLocation, activeLot?.id]);

  const handleStartBidding = async () => {
    setAuctionBusy(true);
    setAuctionError("");
    try {
      await openAuction(lotId);
      navigate(`/auction/${lotId}`);
    } catch (err) {
      setAuctionError(err.message);
    } finally {
      setAuctionBusy(false);
    }
  };

  return (
    <div className="screen pb-nav">
      <Navbar title={t("nearbyRecyclers") || "Nearby recyclers"} />

      <main className="col px-4 pt-4 flex flex-col gap-4">
        {/* ---- EPR context banner --------------------------------------- */}
        {eprBanner && eprState?.eprProducer && (
          <div className="flex items-start gap-2.5 p-3 bg-green-50 border border-green-200 rounded-2xl">
            <HiOutlineBuildingOffice2 className="text-green-600 text-lg mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[12.5px] font-bold text-green-800 leading-snug">
                EPR Network — {eprState.eprProducer}
              </p>
              <p className="text-[11px] text-green-700 mt-0.5 leading-relaxed">
                Sell e-waste ({eprState.eprCategories?.join(", ")}) to these authorized recyclers
                and earn <strong>+{eprState.eprPremium}% EPR premium</strong> over market rate.
              </p>
            </div>
            <button onClick={() => setEprBanner(false)} className="shrink-0 text-green-600 tap">
              <HiXMark className="text-base" />
            </button>
          </div>
        )}

        {/* ---- live bidding ------------------------------------------------ */}
        {canAuction && (
          <section className="card p-4 flex flex-col gap-3 border-brand-200">
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 shrink-0 rounded-xl bg-brand-50 text-brand-600 grid place-items-center">
                <HiOutlineBolt className="text-xl" />
              </span>
              <div className="min-w-0">
                <p className="text-[14.5px] font-semibold text-ink leading-snug">Let recyclers bid for your lot</p>
                <p className="text-[12.5px] text-muted leading-snug mt-0.5">
                  Authorized recyclers get 15 minutes to send offers. You see every bid and pick the one you trust.
                </p>
              </div>
            </div>
            <Button size="lg" variant="primary" onClick={handleStartBidding} loading={auctionBusy} icon={HiOutlineBolt}>
              Start 15-minute bidding
            </Button>
            {auctionError && <p className="text-[12.5px] text-alert-700">{auctionError}</p>}
            <p className="text-[12px] text-faint text-center">Or choose a recycler yourself below.</p>
          </section>
        )}

        {activeLot?.isOffline && (
          <div className="card p-3.5 flex items-start gap-2.5 bg-sunken">
            <HiOutlineExclamationTriangle className="text-amber-600 text-lg shrink-0 mt-0.5" />
            <p className="text-[12.5px] text-muted leading-snug">
              Live bidding needs internet. Your lot is saved on this phone and will sync first — until then, pick a recycler below.
            </p>
          </div>
        )}

        {/* ---- map ------------------------------------------------------- */}
        <div className="relative h-56 rounded-[18px] overflow-hidden border border-line">
          <MapContainer
            center={[userLocation.lat, userLocation.lng]}
            zoom={13}
            scrollWheelZoom={false}
            zoomControl={false}
            className="w-full h-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* the collector's own position, so distances have a reference */}
            <CircleMarker
              center={[userLocation.lat, userLocation.lng]}
              radius={7}
              pathOptions={{
                color: "#ffffff",
                weight: 3,
                fillColor: "var(--color-gold-500, #F0A020)",
                fillOpacity: 1
              }}
            >
              <Popup>
                <span className="text-[13px] font-semibold">You are here</span>
              </Popup>
            </CircleMarker>

            {recyclers.map((r) => (
              <Marker key={r.id} position={[r.lat, r.lng]} icon={depotPin}>
                <Popup>
                  <span className="block text-[13.5px] font-bold text-ink leading-snug">
                    {r.name}
                  </span>
                  <span className="block text-[12px] text-faint mt-0.5">{r.address}</span>
                  <span className="block text-[12px] font-semibold text-brand-600 mt-1 tnum">
                    {r.distanceKm} km away
                  </span>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          <div className="absolute left-3 bottom-3 z-[400] pointer-events-none">
            <span className="badge bg-surface text-ink shadow-[var(--shadow-card)]">
              <HiOutlineMapPin className="text-[11px]" />
              {recyclers.length} depots nearby
            </span>
          </div>
        </div>

        {/* ---- filter rail ------------------------------------------------ */}
        <div className="rail -mx-4 px-4">
          {SCRAP_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              data-on={selectedCategory === cat.id}
              className="chip tap"
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* ---- list -------------------------------------------------------- */}
        <section>
          <div className="sec-head">
            <h3 className="sec-title">
              {loading ? "Finding depots" : `${recyclers.length} depots`}
            </h3>
            <span className="text-[12.5px] font-medium text-faint">Best match first</span>
          </div>

          {loading ? (
            <Loader message="Finding nearby scrap buyers" />
          ) : recyclers.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-[14px] font-semibold text-ink">No depots take this material</p>
              <p className="text-[13px] text-muted mt-1">
                Try another category, or check the full list.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {recyclers.map((recycler) => (
                <RecyclerCard key={recycler.id} recycler={recycler} />
              ))}
            </div>
          )}
        </section>
      </main>

      <BottomNavigation />
    </div>
  );
};
