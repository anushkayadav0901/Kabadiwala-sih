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

const BrandLogo = ({ producerId }) => {
  const s = 28;
  const logos = {
    samsung: (
      <svg width={s} height={s} viewBox="0 0 28 28" fill="none">
        <rect width="28" height="28" rx="7" fill="#1428A0"/>
        <path d="M7.5 15.8c0 1.4 1.2 2.3 3.1 2.3 2.2 0 3.3-1 3.3-2.5 0-1.2-.7-1.9-2.5-2.3l-1-.3c-.9-.2-1.2-.5-1.2-.9 0-.5.5-.9 1.3-.9.9 0 1.4.4 1.5 1h1.8c-.1-1.4-1.2-2.3-3.2-2.3-1.9 0-3.1 1-3.1 2.4 0 1.2.8 1.9 2.4 2.3l1 .2c1 .3 1.3.5 1.3 1 0 .6-.5.9-1.4.9-1 0-1.6-.4-1.7-1.1H7.5z" fill="#fff"/>
        <path d="M15.2 18h1.8v-4.3l2.7 4.3h1.8V10h-1.8v4.3L17 10h-1.8v8z" fill="#fff"/>
      </svg>
    ),
    apple: (
      <svg width={s} height={s} viewBox="0 0 28 28" fill="none">
        <rect width="28" height="28" rx="7" fill="#1a1a1a"/>
        <path d="M18.3 14.7c0-2.1 1.7-3.1 1.8-3.2-1-1.4-2.5-1.6-3-1.7-1.3-.1-2.5.8-3.1.8-.7 0-1.7-.7-2.8-.7-1.4 0-2.7.8-3.5 2.1-1.5 2.6-.4 6.4 1.1 8.5.7 1 1.5 2.2 2.7 2.1 1.1 0 1.5-.7 2.8-.7 1.3 0 1.6.7 2.8.7 1.1 0 1.9-1.1 2.6-2.1.8-1.2 1.1-2.3 1.2-2.4-.1 0-2.2-.8-2.3-3.3l-.3-.1zM16.4 8.5c.6-.7 1-1.7.9-2.7-1 0-2.1.6-2.7 1.4-.6.7-1.1 1.7-.9 2.6 1 .1 2-.5 2.7-1.3z" fill="#fff"/>
      </svg>
    ),
    lg: (
      <svg width={s} height={s} viewBox="0 0 28 28" fill="none">
        <rect width="28" height="28" rx="7" fill="#A50034"/>
        <circle cx="14" cy="14" r="7.5" stroke="#fff" strokeWidth="1.5" fill="none"/>
        <path d="M11 10.5v7h3.5v-1.5H12.5v-5.5H11z" fill="#fff"/>
        <path d="M15.5 17.5v-3.5h2v-1.3h-3.3v4.8h1.3z" fill="#fff"/>
        <circle cx="17" cy="12" r=".8" fill="#fff"/>
      </svg>
    ),
    hp: (
      <svg width={s} height={s} viewBox="0 0 28 28" fill="none">
        <rect width="28" height="28" rx="7" fill="#0096D6"/>
        <path d="M6 9l2.8 10h2.2l1-3.8h2.3L13 19h2.2l2.8-10h-2.2l-1.6 6.3L13 9h-2l-1.2 6.3L8.2 9H6z" fill="#fff"/>
      </svg>
    ),
    dell: (
      <svg width={s} height={s} viewBox="0 0 28 28" fill="none">
        <rect width="28" height="28" rx="7" fill="#007DB8"/>
        <circle cx="14" cy="14" r="8" stroke="#fff" strokeWidth="1.5" fill="none"/>
        <text x="14" y="17.5" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="800" fontFamily="Arial,sans-serif">DELL</text>
      </svg>
    ),
    xiaomi: (
      <svg width={s} height={s} viewBox="0 0 28 28" fill="none">
        <rect width="28" height="28" rx="7" fill="#FF6900"/>
        <rect x="6" y="10" width="5" height="8" rx="1" fill="#fff"/>
        <rect x="13" y="6" width="5" height="12" rx="1" fill="#fff"/>
        <rect x="20" y="10" width="2.5" height="8" rx="1" fill="#fff"/>
        <circle cx="21.2" cy="7.5" r="1.3" fill="#fff"/>
      </svg>
    ),
    voltas: (
      <svg width={s} height={s} viewBox="0 0 28 28" fill="none">
        <rect width="28" height="28" rx="7" fill="#E31E24"/>
        <path d="M8 9l6 11 6-11h-2.8l-3.2 6.2L10.8 9H8z" fill="#fff"/>
      </svg>
    ),
    boat: (
      <svg width={s} height={s} viewBox="0 0 28 28" fill="none">
        <rect width="28" height="28" rx="7" fill="#1a1a1a"/>
        <text x="14" y="17.5" textAnchor="middle" fill="#fff" fontSize="9.5" fontWeight="900" fontFamily="Arial,sans-serif" letterSpacing="-0.5">boAt</text>
      </svg>
    )
  };
  return <span className="shrink-0 inline-flex rounded-lg overflow-hidden">{logos[producerId] || <span className="w-7 h-7 rounded-lg bg-sunken grid place-items-center text-[10px] font-bold text-muted">?</span>}</span>;
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
