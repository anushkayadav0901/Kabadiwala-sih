import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "../components/Navbar";
import { BottomNavigation } from "../components/BottomNavigation";
import { PriceCard } from "../components/PriceCard";
import { Button } from "../components/Button";
import { Loader } from "../components/Loader";
import { MaterialIcon } from "../components/icons/MaterialIcon";
import { getPriceBoard, getPriceHistory, categoryFor, getLiveMasterDoc, syncMetalMandiRates } from "../services/priceService";
import { SCRAP_CATEGORIES } from "../utils/constants";
import { useApp } from "../context/AppContext";
import { formatCurrency, calculateTotalValue } from "../utils/helpers";
import {
  HiMinus, HiPlus, HiXMark, HiCheck, HiArrowRight,
  HiOutlineShoppingBag, HiOutlineInformationCircle,
  HiOutlineArrowPath, HiOutlineMapPin, HiOutlineSignal
} from "react-icons/hi2";

const BENCHMARK_CITIES = [
  { id: 113, name: "Central Delhi, Delhi NCR" },
  { id: 412, name: "Mumbai, Maharashtra" },
  { id: 6, name: "Ahmedabad, Gujarat" },
  { id: 77, name: "Bengaluru Urban, Karnataka" },
  { id: 260, name: "Hyderabad, Telangana" },
  { id: 326, name: "Kolkata, West Bengal" },
  { id: 512, name: "Pune, Maharashtra" },
  { id: 278, name: "Jaipur, Rajasthan" }
];

export const PriceBoard = () => {
  const navigate = useNavigate();
  const { setActiveItem, addToBag, bagItems, t } = useApp();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedCity, setSelectedCity] = useState(BENCHMARK_CITIES[0]);
  const [liveMeta, setLiveMeta] = useState(null);
  const [syncing, setSyncing] = useState(false);

  // Quick Add to Bag Modal State
  const [modalMaterial, setModalMaterial] = useState(null);
  const [modalWeight, setModalWeight] = useState(5.0);
  const [addedToast, setAddedToast] = useState("");
  const [priceHistory, setPriceHistory] = useState([]);

  const loadRates = async () => {
    try {
      const doc = await getLiveMasterDoc();
      if (doc) {
        setLiveMeta({
          source: doc.source,
          cityName: doc.cityName,
          lastSyncedAt: doc.lastSyncedAt,
          itemCount: doc.itemCount
        });
        if (doc.materials && doc.materials.length > 0) {
          setMaterials(doc.materials);
        }
      }
      const board = await getPriceBoard();
      setMaterials(board);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRates();
  }, []);

  const handleSyncCity = async (city) => {
    setSyncing(true);
    setSelectedCity(city);
    try {
      const freshDoc = await syncMetalMandiRates(city.id, city.name);
      if (freshDoc?.materials && freshDoc.materials.length > 0) {
        setMaterials(freshDoc.materials);
        setLiveMeta({
          source: freshDoc.source,
          cityName: freshDoc.cityName || city.name,
          lastSyncedAt: freshDoc.lastSyncedAt,
          itemCount: freshDoc.itemCount
        });
        setAddedToast(`Live rates synced with MetalMandi for ${city.name}!`);
      } else {
        setAddedToast(`Synced MetalMandi benchmark for ${city.name}!`);
      }
    } catch (err) {
      setAddedToast("Using cached benchmark rates");
    } finally {
      setSyncing(false);
      setTimeout(() => setAddedToast(""), 3500);
    }
  };

  useEffect(() => {
    if (!modalMaterial) return;
    getPriceHistory(categoryFor(modalMaterial))
      .then(setPriceHistory)
      .catch(() => setPriceHistory([]));
  }, [modalMaterial]);

  const formatSyncTime = (isoString) => {
    if (!isoString) return "Updated today";
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return "Updated today";
      return `Updated ${d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}`;
    } catch {
      return "Updated today";
    }
  };

  const filteredMaterials = materials.filter((m) => {
    if (selectedCategory === "all") return true;
    if (selectedCategory === "batteries") {
      return (
        m.id?.includes("battery") ||
        m.name?.toLowerCase().includes("battery") ||
        m.category === "batteries" ||
        m.mandiCategory?.toLowerCase().includes("battery")
      );
    }
    if (selectedCategory === "paper") {
      return (
        m.category === "paper" ||
        m.name?.toLowerCase().includes("paper") ||
        m.name?.toLowerCase().includes("cardboard") ||
        m.name?.toLowerCase().includes("raddi")
      );
    }
    return m.category === selectedCategory;
  });

  const handleSelectMaterial = (material) => {
    setActiveItem(material);
    navigate("/estimated-value");
  };

  const handleOpenQuickAdd = (material) => {
    setModalMaterial(material);
    setModalWeight(5.0);
  };

  const handleConfirmAddToBag = () => {
    if (!modalMaterial) return;
    addToBag(modalMaterial, null, modalWeight);
    setAddedToast(`Added ${modalWeight.toFixed(2)} kg of ${modalMaterial.name} to Bag!`);
    setModalMaterial(null);
    setTimeout(() => setAddedToast(""), 3000);
  };

  const totalBagValue = bagItems.reduce(
    (sum, item) => sum + calculateTotalValue(item.pricePerKg, item.weightKg),
    0
  );

  const topRate = Math.max(...materials.map((m) => m.pricePerKg), 1);
  const chartPoints = (() => {
    if (priceHistory.length < 2) return "";
    const values = priceHistory.map((row) => Number(row.quotedPrice));
    const min = Math.min(...values); const max = Math.max(...values); const span = max - min || 1;
    return values.map((value, index) => `${(index / (values.length - 1)) * 240},${68 - ((value - min) / span) * 58}`).join(" ");
  })();

  return (
    <div className="screen pb-nav">
      <Navbar title={t("todayPrices") || "Rate board"} />

      {/* toast */}
      <AnimatePresence>
        {addedToast && (
          <motion.div
            initial={{ y: -16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -16, opacity: 0 }}
            className="fixed top-[68px] left-1/2 -translate-x-1/2 z-50 px-4"
          >
            <div className="bg-ink text-white rounded-xl px-4 py-2.5 shadow-[var(--shadow-lift)]
                            flex items-center gap-2 text-[13px] font-medium max-w-[92vw]">
              <HiCheck className="text-gold-500 text-base shrink-0" />
              <span className="truncate">{addedToast}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="col px-4 pt-4 flex flex-col gap-4">
        {/* ---- board header --------------------------------------------- */}
        <section className="rounded-2xl bg-ink text-white p-4.5 shadow-sm border border-white/10">
          {/* Main Title & Action Row */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-[20px] font-bold tracking-[-0.02em] leading-snug text-white">
                Real-Time Scrap Rates
              </h1>
              <p className="text-[12.5px] text-white/65 mt-0.5 leading-relaxed">
                Benchmark market rates across India. Final rate is confirmed at depot weigh-in.
              </p>
            </div>

            {/* Sync Live Rates Action */}
            <button
              onClick={() => handleSyncCity(selectedCity)}
              disabled={syncing}
              className="shrink-0 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 active:bg-white/20 text-white text-[12px] font-medium flex items-center gap-1.5 transition-colors tap border border-white/10"
              title="Sync live scrap rates"
            >
              <HiOutlineArrowPath className={`text-xs ${syncing ? "animate-spin text-emerald-400" : "text-white/70"}`} />
              <span>{syncing ? "Syncing…" : "Sync Rates"}</span>
            </button>
          </div>

          {/* Location & Secondary Verified Metadata Row */}
          <div className="mt-3.5 pt-3 border-t border-white/10 flex items-center justify-between gap-2 flex-wrap">
            {/* Location Selector */}
            <div className="flex items-center gap-1.5">
              <HiOutlineMapPin className="text-white/50 text-sm shrink-0" />
              <label htmlFor="benchmark-city-select" className="sr-only">Benchmark Location</label>
              <select
                id="benchmark-city-select"
                value={selectedCity.id}
                onChange={(e) => {
                  const found = BENCHMARK_CITIES.find(c => c.id === Number(e.target.value));
                  if (found) handleSyncCity(found);
                }}
                className="bg-white/10 text-white text-[12px] font-medium rounded-md px-2 py-1 outline-none border border-white/10 cursor-pointer hover:bg-white/15 transition-colors"
              >
                {BENCHMARK_CITIES.map(c => (
                  <option key={c.id} value={c.id} className="bg-ink text-white">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Secondary Metadata */}
            <div className="text-[11px] text-white/55 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              <span>MetalMandi benchmark</span>
              <span>·</span>
              <span>{formatSyncTime(liveMeta?.lastSyncedAt)}</span>
            </div>
          </div>
        </section>

        {/* ---- bag strip -------------------------------------------------- */}
        {bagItems.length > 0 && (
          <button
            onClick={() => navigate("/bag")}
            className="card p-3.5 flex items-center gap-3 text-left tap active:bg-sunken/50 transition-colors"
          >
            <span className="w-10 h-10 shrink-0 rounded-xl bg-brand-50 text-brand-600 grid place-items-center">
              <HiOutlineShoppingBag className="text-lg" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold text-ink">
                {bagItems.length} {bagItems.length === 1 ? "item" : "items"} in your bag
              </span>
              <span className="block text-[12.5px] text-faint tnum">
                {formatCurrency(totalBagValue)} estimated
              </span>
            </span>
            <HiArrowRight className="text-faint shrink-0" />
          </button>
        )}

        {/* ---- category rail ---------------------------------------------- */}
        <div className="overflow-x-auto no-scrollbar -mx-4 px-4 flex items-center gap-2 py-0.5 scroll-smooth">
          {SCRAP_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              data-on={selectedCategory === cat.id}
              className="chip tap shrink-0"
            >
              {cat.name}
            </button>
          ))}
          <div className="w-2 shrink-0" aria-hidden="true" />
        </div>

        {/* ---- rows -------------------------------------------------------- */}
        {loading ? (
          <Loader message="Loading rates" />
        ) : filteredMaterials.length === 0 ? (
          <div className="card p-6 text-center">
            <p className="text-[14px] font-semibold text-ink">No items under {SCRAP_CATEGORIES.find(c => c.id === selectedCategory)?.name || "this category"} today.</p>
            <p className="text-[12.5px] text-muted mt-1">Rates are updated regularly as market quotes become available.</p>
            <button
              onClick={() => setSelectedCategory("all")}
              className="mt-3 inline-flex items-center text-[12.5px] font-semibold text-brand-600 hover:text-brand-700"
            >
              View all materials →
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {filteredMaterials.map((mat) => (
              <PriceCard
                key={mat.id}
                material={mat}
                onClick={() => handleSelectMaterial(mat)}
                onQuickAdd={handleOpenQuickAdd}
              />
            ))}
          </div>
        )}

        {/* ---- comparison --------------------------------------------------- */}
        {!loading && filteredMaterials.length > 0 && (
          <section className="card p-4 mb-2">
            <h4 className="sec-title mb-3">Highest value per kilo</h4>
            <div className="flex flex-col gap-3">
              {[...materials]
                .sort((a, b) => b.pricePerKg - a.pricePerKg)
                .slice(0, 5)
                .map((m) => (
                  <div key={m.id} className="flex items-center gap-3">
                    <MaterialIcon material={m} size="sm" tone="ink" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[13px] font-semibold text-ink truncate">
                          {m.name}
                        </span>
                        <span className="text-[13px] font-bold tnum shrink-0">
                          {formatCurrency(m.pricePerKg)}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-sunken overflow-hidden mt-1.5">
                        <div
                          className="h-full rounded-full bg-brand-600"
                          style={{ width: `${(m.pricePerKg / topRate) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </section>
        )}
      </main>

      {/* ---- quick-add sheet ------------------------------------------------ */}
      <AnimatePresence>
        {modalMaterial && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="absolute inset-0 bg-ink/60 backdrop-blur-[2px]"
              onClick={() => setModalMaterial(null)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 340 }}
              className="relative w-full max-w-[440px] bg-surface rounded-t-[24px] shadow-[var(--shadow-sheet)]"
            >
              <div className="pt-3 pb-1 grid place-items-center">
                <span className="w-10 h-1 rounded-full bg-line" />
              </div>

              <div className="p-4 pt-2 flex items-start gap-3">
                <MaterialIcon material={modalMaterial} size="lg" />
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-[17px] leading-tight text-ink">
                    {modalMaterial.name}
                  </h3>
                  <p className="text-[13px] text-muted mt-0.5 tnum">
                    {formatCurrency(modalMaterial.pricePerKg)} per {modalMaterial.unit || "kg"}
                  </p>
                </div>
                <button
                  onClick={() => setModalMaterial(null)}
                  className="w-9 h-9 shrink-0 grid place-items-center rounded-full bg-sunken
                             text-muted hover:bg-line tap transition-colors"
                  aria-label="Close"
                >
                  <HiXMark className="text-lg" />
                </button>
              </div>

                <div className="px-4">
                {modalMaterial.marketRangeMin != null && (
                  <div className="mb-4 p-3 rounded-xl bg-brand-50 border border-brand-100">
                    <p className="eyebrow text-brand-700">Fair-price shield</p>
                    <p className="font-bold text-brand-700 tnum text-[17px] mt-1">
                      {formatCurrency(modalMaterial.marketRangeMin)}–{formatCurrency(modalMaterial.marketRangeMax)} / kg
                    </p>
                    <p className="text-[11.5px] text-brand-700/75 mt-1">Today’s location benchmark; compare depot offers before selling.</p>
                  </div>
                )}
                {chartPoints && (
                  <div className="mb-4 p-3 rounded-xl bg-sunken">
                    <div className="flex items-center justify-between"><p className="eyebrow">30-day trend</p><span className="text-[11px] text-faint">Guide rate</span></div>
                    <svg viewBox="0 0 240 72" className="w-full h-20 mt-1" role="img" aria-label="Thirty day price trend">
                      <polyline points={chartPoints} fill="none" stroke="#3A34D4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setModalWeight((prev) => Math.max(0.5, Number((prev - 0.5).toFixed(2))))}
                    className="w-12 h-12 shrink-0 rounded-xl bg-sunken text-ink grid place-items-center
                               tap hover:bg-line transition-colors"
                    aria-label="Decrease weight"
                  >
                    <HiMinus className="text-lg" />
                  </button>
                  <div className="flex-1 h-12 rounded-xl border-[1.5px] border-line flex items-center justify-center gap-1">
                    <input
                      type="number"
                      step="0.5"
                      min="0.1"
                      value={modalWeight}
                      onChange={(e) => setModalWeight(Math.max(0.1, Number(Number(e.target.value).toFixed(2))))}
                      className="w-20 text-center font-bold text-[22px] tnum bg-transparent focus:outline-none"
                      aria-label="Weight in kilograms"
                    />
                    <span className="text-[14px] font-semibold text-faint">kg</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalWeight((prev) => Number((prev + 0.5).toFixed(2)))}
                    className="w-12 h-12 shrink-0 rounded-xl bg-brand-600 text-white grid place-items-center
                               tap hover:bg-brand-700 transition-colors"
                    aria-label="Increase weight"
                  >
                    <HiPlus className="text-lg" />
                  </button>
                </div>

                <div className="rail mt-3">
                  {[1, 2, 5, 10, 20].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setModalWeight(val)}
                      data-on={modalWeight === val}
                      className="chip tnum tap"
                    >
                      {val} kg
                    </button>
                  ))}
                </div>

                <div className="flex items-baseline justify-between mt-4 pt-4 border-t border-hair">
                  <span className="eyebrow">Subtotal</span>
                  <span className="font-bold text-[24px] tnum">
                    {formatCurrency(calculateTotalValue(modalMaterial.pricePerKg, modalWeight))}
                  </span>
                </div>
                {modalMaterial.marketRangeMin != null && (
                  <p className="text-[12px] text-faint text-right mt-1 tnum">
                    Fair estimate: {formatCurrency(modalMaterial.marketRangeMin * modalWeight)}–{formatCurrency(modalMaterial.marketRangeMax * modalWeight)}
                  </p>
                )}
              </div>

              <div className="p-4">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleConfirmAddToBag}
                  icon={HiOutlineShoppingBag}
                >
                  Add to bag
                </Button>
              </div>
              <div className="safe-b" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <BottomNavigation />
    </div>
  );
};
