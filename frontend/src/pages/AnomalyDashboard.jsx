import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Navbar } from "../components/Navbar";
import { BottomNavigation } from "../components/BottomNavigation";
import { Loader } from "../components/Loader";
import { scanAnomalies, getFlagMeta, DEMO_ANOMALIES } from "../services/anomalyService";
import { formatCurrency } from "../utils/helpers";
import {
  HiOutlineShieldExclamation, HiOutlineExclamationTriangle,
  HiOutlineCheckCircle, HiOutlineArrowPath,
  HiChevronDown, HiChevronUp, HiOutlineFunnel,
  HiOutlineEye, HiOutlineClock
} from "react-icons/hi2";

const SEVERITY_STYLES = {
  high:   { bg: "bg-red-50",   border: "border-red-200",   text: "text-red-700",   dot: "bg-red-500",   label: "High" },
  medium: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", dot: "bg-amber-500", label: "Medium" },
  low:    { bg: "bg-blue-50",  border: "border-blue-200",  text: "text-blue-700",  dot: "bg-blue-500",  label: "Low" },
};

const RANGE_OPTIONS = [
  { value: 7,  label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 60, label: "60 days" },
  { value: 90, label: "90 days" },
];

const SeverityBadge = ({ severity }) => {
  const s = SEVERITY_STYLES[severity] || SEVERITY_STYLES.low;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-semibold ${s.bg} ${s.text} ${s.border} border`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
};

const StatTile = ({ value, label, accent }) => (
  <div className="card p-3 text-center">
    <p className={`text-[22px] font-bold tnum leading-none ${accent || "text-ink"}`}>{value}</p>
    <p className="text-[11px] text-faint mt-1 leading-tight">{label}</p>
  </div>
);

const FlagRow = ({ flag }) => {
  const meta = getFlagMeta(flag.type);
  return (
    <div className="flex items-start gap-2.5 py-2">
      <span className="text-[16px] mt-0.5 shrink-0">{meta.icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-ink">{meta.label}</p>
        <p className="text-[12px] text-faint leading-snug mt-0.5">{flag.reason}</p>
      </div>
      <SeverityBadge severity={flag.severity} />
    </div>
  );
};

const AnomalyCard = ({ anomaly }) => {
  const [open, setOpen] = useState(false);
  const s = SEVERITY_STYLES[anomaly.severity] || SEVERITY_STYLES.low;
  const date = new Date(anomaly.createdAt);
  const dateStr = date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`card overflow-hidden border-l-[3px] ${s.border}`}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full p-4 flex items-center gap-3 text-left tap"
      >
        <span className={`w-10 h-10 shrink-0 rounded-xl grid place-items-center ${s.bg} ${s.text}`}>
          <HiOutlineShieldExclamation className="text-xl" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="text-[14px] font-semibold text-ink capitalize">{anomaly.materialCategory}</span>
            <SeverityBadge severity={anomaly.severity} />
          </span>
          <span className="flex items-center gap-3 text-[12px] text-faint mt-0.5">
            <span className="tnum">{anomaly.totalWeight} kg</span>
            <span className="tnum">{formatCurrency(anomaly.quotedPrice)}</span>
            <span>{dateStr}</span>
          </span>
        </span>
        {open ? <HiChevronUp className="text-faint shrink-0" /> : <HiChevronDown className="text-faint shrink-0" />}
      </button>

      {open && (
        <div className="px-4 pb-4 pt-0 border-t border-hair">
          <p className="text-[11px] text-faint uppercase tracking-wide font-semibold mt-3 mb-1">
            {anomaly.flags.length} flag{anomaly.flags.length > 1 ? "s" : ""} detected
          </p>
          <div className="divide-y divide-hair">
            {anomaly.flags.map((f, i) => <FlagRow key={i} flag={f} />)}
          </div>
          <p className="text-[11px] text-faint mt-3 tnum">
            ID: {anomaly.transactionId}
          </p>
        </div>
      )}
    </motion.div>
  );
};

export const AnomalyDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [days, setDays] = useState(30);
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [isDemo, setIsDemo] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await scanAnomalies(days);
      setData(res);
      setIsDemo(false);
    } catch {
      setData(DEMO_ANOMALIES);
      setIsDemo(true);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const summary = data?.summary || { scanned: 0, flagged: 0, high: 0, medium: 0, low: 0 };
  const anomalies = (data?.anomalies || []).filter(
    (a) => filterSeverity === "all" || a.severity === filterSeverity
  );

  return (
    <div className="screen pb-nav">
      <Navbar />

      <main className="col px-4 pt-4 flex flex-col gap-5">
        {/* header */}
        <section>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[22px] font-bold tracking-[-0.02em] leading-tight">
                Anomaly Detection
              </h2>
              <p className="text-[13px] text-faint mt-0.5">
                AI-powered transaction monitoring
              </p>
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="w-10 h-10 rounded-xl bg-sunken grid place-items-center tap disabled:opacity-50"
            >
              <HiOutlineArrowPath className={`text-lg ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {isDemo && (
            <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-[12.5px] text-amber-700 flex items-start gap-2">
              <HiOutlineExclamationTriangle className="text-base shrink-0 mt-0.5" />
              <span>Showing demo data — backend unavailable. Start the server to see live results.</span>
            </div>
          )}
        </section>

        {/* time range */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <HiOutlineClock className="text-faint text-sm shrink-0" />
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDays(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-[12.5px] font-semibold whitespace-nowrap tap transition-colors ${
                days === opt.value
                  ? "bg-brand-600 text-white"
                  : "bg-sunken text-faint hover:text-ink"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {loading ? (
          <Loader message="Scanning transactions" />
        ) : (
          <>
            {/* stats grid */}
            <div className="grid grid-cols-4 gap-2">
              <StatTile value={summary.scanned} label="Scanned" />
              <StatTile value={summary.flagged} label="Flagged" accent="text-amber-600" />
              <StatTile value={summary.high} label="High" accent="text-red-600" />
              <StatTile value={summary.medium + (summary.low || 0)} label="Med/Low" accent="text-blue-600" />
            </div>

            {/* health bar */}
            <div className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-semibold text-ink">Transaction Health</span>
                <span className="text-[12px] text-faint tnum">
                  {summary.scanned > 0
                    ? `${Math.round(((summary.scanned - summary.flagged) / summary.scanned) * 100)}% clean`
                    : "No data"}
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-sunken overflow-hidden flex">
                {summary.scanned > 0 && (
                  <>
                    <div
                      className="bg-green-500 transition-all"
                      style={{ width: `${((summary.scanned - summary.flagged) / summary.scanned) * 100}%` }}
                    />
                    {summary.high > 0 && (
                      <div
                        className="bg-red-500 transition-all"
                        style={{ width: `${(summary.high / summary.scanned) * 100}%` }}
                      />
                    )}
                    {summary.medium > 0 && (
                      <div
                        className="bg-amber-400 transition-all"
                        style={{ width: `${(summary.medium / summary.scanned) * 100}%` }}
                      />
                    )}
                    {(summary.low || 0) > 0 && (
                      <div
                        className="bg-blue-400 transition-all"
                        style={{ width: `${((summary.low || 0) / summary.scanned) * 100}%` }}
                      />
                    )}
                  </>
                )}
              </div>
              <div className="flex items-center gap-4 mt-2">
                {[
                  { color: "bg-green-500", label: "Clean" },
                  { color: "bg-red-500", label: "High" },
                  { color: "bg-amber-400", label: "Medium" },
                  { color: "bg-blue-400", label: "Low" },
                ].map((l) => (
                  <span key={l.label} className="flex items-center gap-1 text-[11px] text-faint">
                    <span className={`w-2 h-2 rounded-full ${l.color}`} />
                    {l.label}
                  </span>
                ))}
              </div>
            </div>

            {/* severity filter */}
            <div className="flex items-center gap-2">
              <HiOutlineFunnel className="text-faint text-sm shrink-0" />
              {["all", "high", "medium", "low"].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setFilterSeverity(sev)}
                  className={`px-3 py-1.5 rounded-lg text-[12.5px] font-semibold capitalize tap transition-colors ${
                    filterSeverity === sev
                      ? "bg-brand-600 text-white"
                      : "bg-sunken text-faint hover:text-ink"
                  }`}
                >
                  {sev === "all" ? "All" : sev}
                </button>
              ))}
            </div>

            {/* anomaly list */}
            {anomalies.length === 0 ? (
              <div className="card p-8 text-center">
                <HiOutlineCheckCircle className="text-4xl text-green-500 mx-auto" />
                <p className="text-[15px] font-semibold text-ink mt-3">All clear</p>
                <p className="text-[13px] text-faint mt-1">
                  {filterSeverity === "all"
                    ? "No anomalies detected in this period."
                    : `No ${filterSeverity}-severity anomalies found.`}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-[12px] text-faint uppercase tracking-wide font-semibold">
                  {anomalies.length} flagged transaction{anomalies.length > 1 ? "s" : ""}
                </p>
                {anomalies.map((a) => (
                  <AnomalyCard key={a.transactionId} anomaly={a} />
                ))}
              </div>
            )}

            {/* checks explainer */}
            <div className="card p-4 mb-2">
              <p className="text-[13px] font-semibold text-ink mb-2">6 Automated Checks</p>
              <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                {[
                  { icon: "📉", name: "Underpricing", desc: "Below market range" },
                  { icon: "📈", name: "Overpricing", desc: "Above fair maximum" },
                  { icon: "⚖️", name: "Weight flags", desc: "Suspiciously low/high" },
                  { icon: "⚡", name: "Speed flag", desc: "Completed too fast" },
                  { icon: "📍", name: "GPS mismatch", desc: "Location doesn't match" },
                  { icon: "🤝", name: "Repeat pairs", desc: "Same collector-buyer" },
                ].map((c) => (
                  <div key={c.name} className="flex items-center gap-2">
                    <span className="text-[14px]">{c.icon}</span>
                    <div>
                      <p className="text-[12px] font-semibold text-ink leading-tight">{c.name}</p>
                      <p className="text-[11px] text-faint leading-tight">{c.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10.5px] text-faint mt-3 leading-snug">
                Anomaly detection powered by rule-based engine cross-referencing market prices,
                transaction velocity, and geolocation patterns. Compliant with E-Waste Management Rules 2022.
              </p>
            </div>
          </>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
};
