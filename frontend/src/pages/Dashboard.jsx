import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Navbar } from "../components/Navbar";
import { BottomNavigation } from "../components/BottomNavigation";
import { Loader } from "../components/Loader";
import { MaterialIcon } from "../components/icons/MaterialIcon";
import { ScaleIllustration } from "../components/icons/Illustrations";
import { useApp } from "../context/AppContext";
import { getPriceBoard } from "../services/priceService";
import { formatCurrency, calculateTotalValue } from "../utils/helpers";
import {
  HiOutlineCamera, HiOutlineTag, HiOutlineMapPin, HiOutlineWallet,
  HiOutlineShieldCheck, HiOutlineUser, HiOutlineMagnifyingGlass,
  HiChevronRight, HiArrowRight, HiOutlineTrophy, HiOutlineSparkles,
  HiOutlineChartBar, HiOutlineBuildingOffice2, HiOutlineCalculator,
  HiOutlineShieldExclamation
} from "react-icons/hi2";
import { RewardsModal } from "../components/RewardsModal";
import { GamificationSection } from "../components/GamificationSection";
import { EcoImpact } from "../components/EcoImpact";
import { getTokenBalance } from "../services/tokenService";

export const Dashboard = () => {
  const navigate = useNavigate();
  const { user, t, userLocation, bagItems } = useApp();
  const [materials, setMaterials] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isRewardsOpen, setIsRewardsOpen] = useState(false);
  const [tokenBalance, setTokenBalance] = useState(() => getTokenBalance());

  useEffect(() => {
    getPriceBoard()
      .then(setMaterials)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const greetingName = user?.name?.split(" ")[0] || "Collector";

  const featureCards = [
    { id: "prices",    title: t("todayPrices"),      desc: "Live rates",        icon: HiOutlineTag,        path: "/prices" },
    { id: "recyclers", title: t("nearbyRecyclers"),  desc: "Authorized depots", icon: HiOutlineMapPin,     path: "/recyclers" },
    { id: "earnings",  title: t("earnings"),          desc: "Sales & payouts",   icon: HiOutlineWallet,     path: "/earnings" },
    { id: "safety",    title: t("safetyGuide"),       desc: "Handling rules",    icon: HiOutlineShieldCheck,path: "/safety" },
    { id: "epr",       title: "EPR Compliance",        desc: "Producer targets",  icon: HiOutlineBuildingOffice2, path: "/epr" },
    { id: "economics", title: "Unit Economics",         desc: "Trip profitability", icon: HiOutlineCalculator, path: "/economics" },
    { id: "anomalies", title: "Anomaly Detection",     desc: "Fraud monitoring",  icon: HiOutlineShieldExclamation, path: "/anomalies" }
  ];

  const filteredMaterials = materials.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.hindiName && m.hindiName.includes(searchQuery))
  );

  const bagValue = bagItems.reduce(
    (sum, item) => sum + calculateTotalValue(item.pricePerKg, item.weightKg),
    0
  );

  return (
    <div className="screen pb-nav">
      <Navbar showBack={false} />

      <main className="col px-4 pt-4 flex flex-col gap-6">
        {/* ---- greeting ------------------------------------------------ */}
        <motion.section
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow">Namaste, {greetingName}</p>
              <h2 className="text-[24px] font-bold tracking-[-0.02em] leading-tight mt-1">
                What did you collect today?
              </h2>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {/* Leaderboard Rank Pill */}
              <button
                onClick={() => navigate("/leaderboard")}
                className="h-10 px-3 rounded-2xl border flex items-center gap-1.5 tap shadow-xs bg-brand-50/90 border-brand-200 text-brand-800 hover:bg-brand-100/70 transition-colors"
                title="View Leaderboard & Rankings"
              >
                <HiOutlineChartBar className="text-brand-600 text-[15px]" />
                <span className="tnum font-black text-[13.5px]">#4 Rank</span>
              </button>

              {/* Tokens Pill */}
              <button
                onClick={() => setIsRewardsOpen(true)}
                className="h-10 px-3 rounded-2xl border flex items-center gap-1.5 tap shadow-xs hover:opacity-90 transition-opacity"
                style={{ background: "#FEF5E4", borderColor: "#FDE68A" }}
                title="Open Rewards Store"
              >
                <HiOutlineSparkles style={{ color: "#D97706", fontSize: 14 }} />
                <span className="tnum font-black text-[14px]" style={{ color: "#92400E" }}>{tokenBalance}</span>
              </button>
            </div>
          </div>
          {userLocation?.address && (
            <p className="text-[13px] text-faint mt-1.5 flex items-center gap-1">
              <HiOutlineMapPin className="text-sm shrink-0" />
              <span className="truncate">{userLocation.address}</span>
            </p>
          )}
        </motion.section>

        {/* ---- hero action (primary — comes first) -------------------- */}
        <section>
          <button
            onClick={() => navigate("/scan")}
            className="w-full text-left rounded-[18px] bg-brand-600 text-white overflow-hidden
                       relative tap active:bg-brand-700 transition-colors"
          >
            <div className="relative z-10 p-5 pr-32">
              <span className="badge bg-white/15 text-white">Offline AI</span>
              <h3 className="text-[20px] font-bold tracking-[-0.015em] leading-tight mt-2.5">
                Photograph your scrap
              </h3>
              <p className="text-[13.5px] text-white/70 mt-1 max-w-[24ch] leading-snug">
                Get the material and a price in seconds — no internet needed.
              </p>
              <span className="inline-flex items-center gap-1.5 mt-4 h-9 px-4 rounded-lg
                               bg-white text-brand-700 text-[13.5px] font-semibold">
                <HiOutlineCamera className="text-base" />
                Open camera
              </span>
            </div>
            <ScaleIllustration className="absolute right-[-14px] bottom-[-8px] w-36 h-32 opacity-90 z-0" />
          </button>
        </section>

        {/* ---- gamification section (streak, levels, badges) ------------ */}
        <GamificationSection totalWeightKg={185} onOpenRewards={() => setIsRewardsOpen(true)} />

        {/* ---- eco impact ---------------------------------------------- */}
        <EcoImpact totalWeightKg={185} />

        {/* ---- search -------------------------------------------------- */}
        <section>
          <div className="relative">
            <HiOutlineMagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-faint text-xl pointer-events-none" />
            <input
              type="text"
              placeholder="Search a material rate…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="field pl-12 text-[15px]"
            />
          </div>

          {searchQuery && (
            <div className="card mt-2 divide-y divide-hair overflow-hidden">
              {filteredMaterials.length === 0 ? (
                <p className="p-4 text-[13.5px] text-faint">
                  No material matches "{searchQuery}".
                </p>
              ) : (
                filteredMaterials.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => navigate("/prices")}
                    className="w-full p-3 flex items-center gap-3 text-left tap
                               hover:bg-sunken active:bg-sunken transition-colors"
                  >
                    <MaterialIcon material={m} size="sm" />
                    <span className="flex-1 min-w-0 text-[14px] font-semibold truncate">
                      {m.name}
                    </span>
                    <span className="text-[14px] font-bold tnum shrink-0">
                      {formatCurrency(m.pricePerKg)}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </section>

        {/* ---- bag summary --------------------------------------------- */}
        {bagItems.length > 0 && (
          <button
            onClick={() => navigate("/bag")}
            className="card p-4 flex items-center gap-3 text-left tap active:bg-sunken/50 transition-colors"
          >
            <span className="w-11 h-11 shrink-0 rounded-xl bg-gold-50 text-gold-600 grid place-items-center font-bold text-[15px] tnum">
              {bagItems.length}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14.5px] font-semibold text-ink">
                {bagItems.length === 1 ? "1 item in your bag" : `${bagItems.length} items in your bag`}
              </span>
              <span className="block text-[12.5px] text-faint">Ready to sell</span>
            </span>
            <span className="text-right shrink-0">
              <span className="block font-bold text-[16px] tnum">{formatCurrency(bagValue)}</span>
            </span>
            <HiChevronRight className="text-faint shrink-0" />
          </button>
        )}

        {/* ---- quick links --------------------------------------------- */}
        <section>
          <div className="sec-head">
            <h3 className="sec-title">Quick actions</h3>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {featureCards.map((card, i) => {
              // The last tile spans both columns so an odd count never leaves a
              // half-empty row — the labels are translated and can run long.
              const spans = i === featureCards.length - 1 && featureCards.length % 2 === 1;
              return (
                <button
                  key={card.id}
                  onClick={() => navigate(card.path)}
                  className={`card p-3.5 text-left tap active:bg-sunken/50 transition-colors ${
                    spans ? "col-span-2 flex items-center gap-3" : "flex flex-col gap-2.5"
                  }`}
                >
                  <span className="w-10 h-10 shrink-0 rounded-xl bg-sunken text-ink grid place-items-center">
                    <card.icon className="text-[19px]" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[14px] font-semibold text-ink leading-snug">
                      {card.title}
                    </span>
                    <span className="block text-[11.5px] text-faint leading-snug mt-0.5">
                      {card.desc}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ---- rates --------------------------------------------------- */}
        <section>
          <div className="sec-head">
            <h3 className="sec-title">Today's top rates</h3>
            <button onClick={() => navigate("/prices")} className="sec-link tap">
              See all <HiArrowRight className="text-xs" />
            </button>
          </div>

          {loading ? (
            <Loader message="Loading rates" />
          ) : (
            <div className="card divide-y divide-hair overflow-hidden">
              {materials.slice(0, 4).map((mat) => (
                <button
                  key={mat.id}
                  onClick={() => navigate("/prices")}
                  className="w-full p-3.5 flex items-center gap-3 text-left tap
                             hover:bg-sunken/50 active:bg-sunken transition-colors"
                >
                  <MaterialIcon material={mat} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14.5px] font-semibold text-ink truncate">
                      {mat.name}
                    </span>
                    <span className="block text-[11.5px] text-faint">per {mat.unit || "kg"}</span>
                  </span>
                  <span className="text-right shrink-0">
                    <span className="block font-bold text-[16px] tnum leading-tight">
                      {formatCurrency(mat.pricePerKg)}
                    </span>
                    <span
                      className={`block text-[11px] font-semibold leading-tight mt-0.5 tnum ${
                        mat.trend === "up"
                          ? "text-gold-600"
                          : mat.trend === "down"
                          ? "text-alert-600"
                          : "text-faint"
                      }`}
                    >
                      {mat.change}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* ---- safety nudge -------------------------------------------- */}
        <button
          onClick={() => navigate("/safety")}
          className="card p-4 flex items-center gap-3 text-left tap active:bg-sunken/50 transition-colors mb-2"
        >
          <span className="w-10 h-10 shrink-0 rounded-xl bg-alert-50 text-alert-600 grid place-items-center">
            <HiOutlineShieldCheck className="text-xl" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-semibold text-ink">Never burn wires</span>
            <span className="block text-[12.5px] text-faint">
              Four rules that keep this work safe
            </span>
          </span>
          <HiChevronRight className="text-faint shrink-0" />
        </button>
      </main>

      <RewardsModal
        isOpen={isRewardsOpen}
        onClose={() => setIsRewardsOpen(false)}
        onBalanceChange={setTokenBalance}
      />

      <BottomNavigation />
    </div>
  );
};
