import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "../components/Navbar";
import { BottomNavigation } from "../components/BottomNavigation";
import { Loader } from "../components/Loader";
import { useApp } from "../context/AppContext";
import { api } from "../services/api";
import {
  HiOutlineBuildingOffice2,
  HiOutlineExclamationTriangle,
  HiOutlineArrowTopRightOnSquare,
  HiChevronDown,
  HiChevronUp,
  HiOutlineBanknotes,
  HiOutlineInformationCircle,
  HiArrowRight
} from "react-icons/hi2";

const BRAND = {
  samsung:  { color: "#1428A0", bg: "#E8EAFF", letter: "S" },
  apple:    { color: "#555555", bg: "#F0F0F0", letter: "A" },
  lg:       { color: "#A50034", bg: "#FDEAEF", letter: "LG" },
  hp:       { color: "#0096D6", bg: "#E5F5FC", letter: "hp" },
  dell:     { color: "#007DB8", bg: "#E5F3FA", letter: "D" },
  xiaomi:   { color: "#FF6900", bg: "#FFF0E5", letter: "Mi" },
  voltas:   { color: "#E31E24", bg: "#FDEAEB", letter: "V" },
  boat:     { color: "#1A1A1A", bg: "#F0F0F0", letter: "b" }
};

const BrandLogo = ({ producerId }) => {
  const b = BRAND[producerId] || { color: "#666", bg: "#eee", letter: "?" };
  return (
    <span
      className="inline-flex items-center justify-center w-7 h-7 rounded-lg shrink-0 font-black text-[11px] leading-none"
      style={{ background: b.bg, color: b.color }}
    >
      {b.letter}
    </span>
  );
};

const ProgressRing = ({ pct, size = 48, stroke = 4.5 }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const filled = circ * (Math.min(pct, 100) / 100);
  const color = pct >= 100 ? "var(--color-green-500)" : pct >= 85 ? "var(--color-gold-500)" : "var(--color-red-500)";
  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-line)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={circ - filled} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.8s ease" }} />
    </svg>
  );
};

const StatusChip = ({ status }) => {
  const map = {
    compliant: { label: "Compliant", cls: "bg-green-50 text-green-700 border-green-200" },
    on_track: { label: "On Track", cls: "bg-gold-50 text-gold-700 border-gold-200" },
    behind: { label: "Behind", cls: "bg-red-50 text-red-700 border-red-200" }
  };
  const s = map[status] || map.behind;
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${s.cls}`}>{s.label}</span>;
};

const ProducerCard = ({ producer, expanded, onToggle, onFindBuyers = () => {} }) => (
  <div className="card overflow-hidden">
    <button
      type="button"
      onClick={onToggle}
      className="w-full p-3 flex items-center gap-3 text-left tap active:bg-sunken/40 transition-colors"
    >
      <div className="relative">
        <ProgressRing pct={producer.compliancePct} />
        <span className="absolute inset-0 flex items-center justify-center text-[10.5px] font-bold tnum rotate-90">
          {producer.compliancePct}%
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <BrandLogo producerId={producer.id} />
          <h4 className="font-bold text-[14px] leading-snug text-ink truncate">{producer.name}</h4>
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          <StatusChip status={producer.status} />
          {producer.penaltyRisk && (
            <span className="text-[9.5px] font-semibold text-red-600 flex items-center gap-0.5">
              <HiOutlineExclamationTriangle className="text-[10px]" /> Penalty
            </span>
          )}
          <span className="text-[10.5px] text-faint tnum ml-auto">
            Gap {producer.gapTonnes.toLocaleString("en-IN")}T
          </span>
        </div>
      </div>

      {expanded
        ? <HiChevronUp className="text-faint text-base shrink-0" />
        : <HiChevronDown className="text-faint text-base shrink-0" />}
    </button>

    <AnimatePresence>
      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="px-3 pb-3 border-t border-hair space-y-2.5">
            <div className="grid grid-cols-4 gap-1.5 pt-2.5">
              {[
                { l: "Target", v: `${producer.requiredTonnes.toLocaleString("en-IN")}T` },
                { l: "Sold*", v: `${producer.estimatedSoldTonnes.toLocaleString("en-IN")}T` },
                { l: "Collected*", v: `${producer.collectedTonnes.toLocaleString("en-IN")}T` },
                { l: "Premium", v: `+${producer.premiumOverMarket}%` }
              ].map((d) => (
                <div key={d.l} className="bg-sunken rounded-lg px-2 py-1.5 text-center">
                  <p className="text-[9px] text-muted font-medium uppercase tracking-wider">{d.l}</p>
                  <p className="text-[12px] font-bold text-ink tnum mt-0.5">{d.v}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-1">
              {producer.categories.map((cat) => (
                <span key={cat} className="text-[10px] font-medium bg-sunken text-muted px-2 py-0.5 rounded-full">
                  {cat}
                </span>
              ))}
            </div>

            <p className="text-[10.5px] text-faint">
              via <span className="font-medium text-muted">{producer.contactChannel}</span>
            </p>

            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onFindBuyers(producer); }}
              className="w-full flex items-center justify-center gap-2 h-10 rounded-xl
                         bg-brand-600 text-white text-[12.5px] font-bold
                         tap active:bg-brand-700 transition-colors"
            >
              <HiOutlineArrowTopRightOnSquare className="text-sm" />
              Sell to {producer.name.split(" ")[0]} EPR Network
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

export const EPRCompliance = () => {
  const navigate = useNavigate();
  const { t } = useApp();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");

  const handleFindBuyers = (producer) => {
    navigate("/recyclers", {
      state: {
        eprProducer: producer.name,
        eprProducerId: producer.id,
        eprCategories: producer.categories,
        eprPremium: producer.premiumOverMarket
      }
    });
  };

  useEffect(() => {
    api("/epr/dashboard")
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="screen grid place-items-center"><Loader /></div>;
  if (!data) return <div className="screen grid place-items-center"><p className="text-muted">Could not load EPR data</p></div>;

  const { industryStats: stats, producers, currentFY, mandatedTargetPct } = data;
  const filtered = filterStatus === "all" ? producers : producers.filter((p) => p.status === filterStatus);
  const behindCount = producers.filter((p) => p.status === "behind").length;

  return (
    <div className="screen pb-nav">
      <Navbar title="EPR Compliance" />

      <main className="col px-4 pt-4 flex flex-col gap-5 pb-6">

        {/* ---- hero --------------------------------------------------- */}
        <motion.section
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="eyebrow">E-Waste Rules 2022 · {currentFY}</p>
          <h2 className="text-[22px] font-bold tracking-[-0.02em] leading-tight mt-1">
            Earn <span className="text-green-600">8–18% extra</span> selling e-waste
          </h2>
          <p className="text-[13px] text-muted mt-1.5 leading-snug max-w-[36ch]">
            Producers must buy back {mandatedTargetPct}% of what they sell. Your scrap fills their gap.
          </p>
        </motion.section>

        {/* ---- stats row ---------------------------------------------- */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-3 gap-2"
        >
          <div className="card p-2.5 text-center">
            <p className="text-[20px] font-bold tnum text-ink">{stats.overallCompliancePct}%</p>
            <p className="text-[10px] text-muted font-medium mt-0.5">Industry avg</p>
          </div>
          <div className="card p-2.5 text-center">
            <p className="text-[20px] font-bold tnum text-red-600">{stats.producersAtRisk}</p>
            <p className="text-[10px] text-muted font-medium mt-0.5">Behind target</p>
          </div>
          <div className="card p-2.5 text-center">
            <p className="text-[20px] font-bold tnum text-ink">{(stats.gapTonnes / 1000).toFixed(0)}K</p>
            <p className="text-[10px] text-muted font-medium mt-0.5">Tonnes gap</p>
          </div>
        </motion.div>

        {/* ---- target ramp -------------------------------------------- */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rail -mx-4 px-4"
        >
          {Object.entries(data.eprTargetHistory).map(([fy, pct]) => (
            <div
              key={fy}
              className={`shrink-0 rounded-xl px-3 py-2 text-center border ${
                fy === currentFY
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-surface border-hair"
              }`}
            >
              <p className={`text-[10px] font-semibold ${fy === currentFY ? "text-white/80" : "text-faint"}`}>{fy}</p>
              <p className={`text-[15px] font-bold tnum ${fy === currentFY ? "text-white" : "text-ink"}`}>{pct}%</p>
            </div>
          ))}
        </motion.div>

        {/* ---- filter + producer list --------------------------------- */}
        <section>
          <div className="sec-head">
            <h3 className="sec-title">Producers</h3>
            <span className="text-[12.5px] font-medium text-faint">{filtered.length} of {producers.length}</span>
          </div>

          <div className="rail -mx-4 px-4 mb-3">
            {[
              { key: "all", label: `All (${producers.length})` },
              { key: "behind", label: `Behind (${behindCount})` },
              { key: "on_track", label: "On Track" },
              { key: "compliant", label: "Compliant" }
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilterStatus(f.key)}
                data-on={filterStatus === f.key}
                className="chip tap"
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2.5">
            {filtered.map((p) => (
              <ProducerCard
                key={p.id}
                producer={p}
                expanded={expandedId === p.id}
                onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)}
                onFindBuyers={handleFindBuyers}
              />
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-muted text-[13px] py-8">No producers match this filter</p>
            )}
          </div>
        </section>

        {/* ---- footnote ----------------------------------------------- */}
        <p className="text-[10px] text-faint leading-relaxed px-1">
          * Tonnage estimated from CPCB Annual Reports. Targets per Schedule III gazette notification.
          In production, real-time sync via CPCB EPR Portal &amp; PRO feeds.
        </p>
      </main>

      <BottomNavigation />
    </div>
  );
};
