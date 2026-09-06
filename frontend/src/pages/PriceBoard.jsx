import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "../components/Navbar";
import { BottomNavigation } from "../components/BottomNavigation";
import { PriceCard } from "../components/PriceCard";
import { Button } from "../components/Button";
import { Loader } from "../components/Loader";
import { MaterialIcon } from "../components/icons/MaterialIcon";
import { getPriceBoard } from "../services/priceService";
import { SCRAP_CATEGORIES } from "../utils/constants";
import { useApp } from "../context/AppContext";
import { formatCurrency, calculateTotalValue } from "../utils/helpers";
import {
  HiMinus, HiPlus, HiXMark, HiCheck, HiArrowRight,
  HiOutlineShoppingBag, HiOutlineInformationCircle
} from "react-icons/hi2";

export const PriceBoard = () => {
  const navigate = useNavigate();
  const { setActiveItem, addToBag, bagItems, t } = useApp();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Quick Add to Bag Modal State
  const [modalMaterial, setModalMaterial] = useState(null);
  const [modalWeight, setModalWeight] = useState(5.0);
  const [addedToast, setAddedToast] = useState("");

  useEffect(() => {
    getPriceBoard()
      .then(setMaterials)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredMaterials = materials.filter((m) =>
    selectedCategory === "all" ? true : m.category === selectedCategory
  );

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
        <section className="rounded-[18px] bg-ink text-white p-5">
          <p className="eyebrow text-white/50">Reference rates · Mumbai</p>
          <h2 className="text-[22px] font-bold tracking-[-0.02em] leading-tight mt-1.5">
            What your scrap is worth today
          </h2>
          <p className="text-[12.5px] text-white/55 mt-2 flex items-start gap-1.5">
            <HiOutlineInformationCircle className="text-sm shrink-0 mt-px" />
            Guide prices, not a live market feed. Depots quote their own rate.
          </p>
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

        {/* ---- rows -------------------------------------------------------- */}
        {loading ? (
          <Loader message="Loading rates" />
        ) : filteredMaterials.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-[14px] text-muted">No materials in this category.</p>
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
