import React from "react";
import { HiShieldCheck, HiExclamationTriangle, HiArrowTrendingUp } from "react-icons/hi2";

const LEVELS = {
  below: { icon: HiExclamationTriangle, bg: "bg-alert-50", border: "border-alert-200", text: "text-alert-600", label: "Below fair range" },
  fair: { icon: HiShieldCheck, bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", label: "Fair price" },
  above: { icon: HiArrowTrendingUp, bg: "bg-brand-50", border: "border-brand-200", text: "text-brand-600", label: "Above fair range" }
};

export const FairPriceShield = ({ evaluation, offerPrice, fairMin, fairMax, materialName, compact = false }) => {
  if (!evaluation) return null;
  const config = LEVELS[evaluation.level] || LEVELS.fair;
  const Icon = config.icon;

  if (compact) {
    return (
      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <Icon className="w-3.5 h-3.5" />
        <span>{evaluation.message}</span>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border ${config.border} ${config.bg} p-4`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${config.text} bg-white/80`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-sm ${config.text}`}>Fair-Price Shield</p>
          <p className="text-xs text-ink/60 mt-0.5">{materialName || "This material"}</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="bg-white/60 rounded-xl p-2">
          <p className="text-[10px] text-ink/50 uppercase tracking-wider">Fair min</p>
          <p className="font-bold text-sm tnum mt-0.5">₹{Math.round(fairMin || 0)}</p>
        </div>
        <div className={`rounded-xl p-2 ${evaluation.level === "fair" ? "bg-emerald-100" : evaluation.level === "below" ? "bg-alert-100" : "bg-brand-100"}`}>
          <p className="text-[10px] text-ink/50 uppercase tracking-wider">Offer</p>
          <p className="font-bold text-sm tnum mt-0.5">₹{Math.round(offerPrice || 0)}</p>
        </div>
        <div className="bg-white/60 rounded-xl p-2">
          <p className="text-[10px] text-ink/50 uppercase tracking-wider">Fair max</p>
          <p className="font-bold text-sm tnum mt-0.5">₹{Math.round(fairMax || 0)}</p>
        </div>
      </div>

      {evaluation.level === "below" && (
        <div className="mt-3 bg-white/60 rounded-xl p-3 flex items-start gap-2">
          <HiExclamationTriangle className="w-4 h-4 text-alert-500 mt-0.5 shrink-0" />
          <p className="text-xs text-ink/70">
            This offer is <strong className="text-alert-600">{evaluation.difference}% below</strong> the fair range. Compare nearby authorized recyclers before accepting.
          </p>
        </div>
      )}

      {evaluation.level === "fair" && (
        <p className="mt-3 text-xs text-emerald-700/70 text-center">
          This offer is within today's fair market range.
        </p>
      )}
    </div>
  );
};
