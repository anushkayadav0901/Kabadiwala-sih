import React from "react";
import { HiShieldExclamation, HiExclamationTriangle, HiInformationCircle } from "react-icons/hi2";

const SEVERITY = {
  high: { icon: HiShieldExclamation, bg: "bg-alert-50", border: "border-alert-200", text: "text-alert-600", label: "High risk" },
  medium: { icon: HiExclamationTriangle, bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", label: "Moderate risk" },
  low: { icon: HiInformationCircle, bg: "bg-sky-50", border: "border-sky-200", text: "text-sky-700", label: "Low risk" }
};

export const AnomalyAlert = ({ anomaly, compact = false }) => {
  if (!anomaly?.isAnomalous || !anomaly.flags?.length) return null;
  const config = SEVERITY[anomaly.severity] || SEVERITY.low;
  const Icon = config.icon;

  if (compact) {
    return (
      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <Icon className="w-3.5 h-3.5" />
        <span>{config.label}: {anomaly.flags.length} flag{anomaly.flags.length > 1 ? "s" : ""}</span>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border ${config.border} ${config.bg} p-4`}>
      <div className="flex items-center gap-2.5">
        <Icon className={`w-5 h-5 ${config.text}`} />
        <p className={`font-semibold text-sm ${config.text}`}>Transaction Anomaly Shield</p>
        <span className={`ml-auto text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${config.text} bg-white/60`}>{config.label}</span>
      </div>
      <ul className="mt-3 space-y-2">
        {anomaly.flags.map((flag, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-ink/70">
            <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${config.text === "text-alert-600" ? "bg-alert-400" : config.text === "text-amber-700" ? "bg-amber-400" : "bg-sky-400"}`} />
            {flag.reason}
          </li>
        ))}
      </ul>
    </div>
  );
};
