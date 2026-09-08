import React from "react";
import { motion } from "framer-motion";
import { computeTotalImpact } from "../utils/ecoMetrics";

const STATS = [
  {
    key: "co2",
    label: "CO₂ Prevented",
    unit: "kg",
    getValue: (i) => i.co2Kg,
    color: "text-green-600",
    bg: "bg-green-50",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 20c-1.2 1.2-3 1.5-5 .8-2.3-.8-4-3-4-5.5 0-1.5.5-3 1.5-4C11 9.8 13 9 15 9c1.5 0 2.8.5 3.8 1.3" />
        <path d="M12 3c1.7 0 3.2.8 4.2 2 .8 1 1.3 2.3 1.3 3.7" />
        <path d="M6.5 6.5C5 8.3 4 10.5 4 13c0 3.3 2 6 5 7.5" />
        <circle cx="12" cy="13" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    key: "water",
    label: "Water Saved",
    unit: "L",
    getValue: (i) => i.waterLiters,
    color: "text-blue-600",
    bg: "bg-blue-50",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2.7s-6 6.3-6 10.8a6 6 0 0 0 12 0C18 9 12 2.7 12 2.7z" />
      </svg>
    ),
  },
  {
    key: "energy",
    label: "Energy Saved",
    unit: "kWh",
    getValue: (i) => i.energyKwh,
    color: "text-amber-600",
    bg: "bg-amber-50",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
  },
  {
    key: "trees",
    label: "Trees Equivalent",
    unit: "",
    getValue: (i) => i.treesEquiv,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22V8" />
        <path d="M5 12l7-10 7 10H5z" />
        <path d="M7 16l5-7 5 7H7z" />
      </svg>
    ),
  },
];

const fmt = (n) => {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString("en-IN");
};

export const EcoImpact = ({ totalWeightKg = 0 }) => {
  if (totalWeightKg <= 0) return null;
  const impact = computeTotalImpact(totalWeightKg);

  return (
    <section>
      <div className="sec-head">
        <h3 className="sec-title">Your Eco Impact</h3>
        <span className="text-[11px] text-faint font-medium">{totalWeightKg} kg recycled</span>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {STATS.map((s, idx) => {
          const val = s.getValue(impact);
          return (
            <motion.div
              key={s.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.07, duration: 0.3 }}
              className="card p-3.5 flex items-start gap-3"
            >
              <span className={`w-10 h-10 shrink-0 rounded-xl ${s.bg} ${s.color} grid place-items-center`}>
                {s.icon}
              </span>
              <div className="min-w-0">
                <p className={`text-[18px] font-bold tnum leading-tight ${s.color}`}>
                  {fmt(val)}<span className="text-[11px] font-semibold ml-0.5 text-faint">{s.unit}</span>
                </p>
                <p className="text-[11.5px] text-faint font-medium leading-snug mt-0.5">{s.label}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <p className="text-[10px] text-faint/70 mt-2 leading-relaxed">
        Based on CPCB recycling benchmarks — 1.8 kg CO₂ per kg e-waste, 20 L water per kg, 3.2 kWh energy per kg.
        1 mature tree absorbs ~22 kg CO₂/year.
      </p>
    </section>
  );
};
