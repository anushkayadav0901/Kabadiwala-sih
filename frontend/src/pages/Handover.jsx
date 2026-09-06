import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { motion } from "framer-motion";
import { Navbar } from "../components/Navbar";
import { BottomNavigation } from "../components/BottomNavigation";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { ScaleIllustration } from "../components/icons/Illustrations";
import { useApp } from "../context/AppContext";
import { formatCurrency, formatWeight } from "../utils/helpers";
import {
  HiArrowRight, HiCheckCircle, HiOutlineClipboard, HiOutlineClock,
  HiOutlineMapPin, HiOutlineQrCode, HiCheck, HiBolt
} from "react-icons/hi2";

export const Handover = () => {
  const navigate = useNavigate();
  const { user, activeLot, selectedRecycler } = useApp();
  const { state } = useLocation();

  const lot = state?.lot || activeLot;
  const recycler = state?.recycler || selectedRecycler;
  const certificateId = state?.certificateId || `KBC-${lot?.id || Date.now()}`;

  const [copied, setCopied] = useState(false);
  const [isVerifiedByBuyer, setIsVerifiedByBuyer] = useState(false);

  const formattedWeight = Number(lot?.total_weight || 0).toFixed(2);
  const formattedValue = Number(lot?.estimated_value || 0).toFixed(2);

  const verificationPayloadObj = {
    type: "kabadiwala-handover-v2",
    certificateId,
    lotId: lot?.id,
    collectorId: user?.id || "coll_demo",
    collectorName: user?.name || "Kailash Local Collector",
    collectorPhone: user?.phone || "+91 98765 43210",
    recyclerId: recycler?.id || "rec_1",
    recyclerName: recycler?.name || "EcoRecycle India Hub",
    totalWeight: formattedWeight,
    estimatedValue: formattedValue,
    timestamp: new Date().toISOString(),
    gps: { lat: lot?.gps_lat || 19.076, lng: lot?.gps_lng || 72.8777 },
    materials: lot?.materials || [{ name: "Mixed E-Waste", weight_kg: formattedWeight }],
    securityHash: `VERIF-${(lot?.id || "LOT").slice(0, 8)}-${Date.now().toString(36).toUpperCase()}`
  };

  const verificationPayloadString = JSON.stringify(verificationPayloadObj);

  // Store in localStorage so buyer portal on same machine can detect or scan
  useEffect(() => {
    if (lot) {
      localStorage.setItem("kabadi_active_handover_payload", verificationPayloadString);
      localStorage.setItem("kabadi_active_handover_id", certificateId);
    }
  }, [lot, certificateId, verificationPayloadString]);

  // Listen for buyer verification in real-time via storage event or polling
  useEffect(() => {
    const checkVerification = () => {
      const verifiedId = localStorage.getItem("kabadi_verified_certificate_id");
      if (verifiedId === certificateId) {
        setIsVerifiedByBuyer(true);
      }
    };

    checkVerification();
    const interval = setInterval(checkVerification, 1500);
    window.addEventListener("storage", checkVerification);

    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", checkVerification);
    };
  }, [certificateId]);

  const handleCopyPayload = () => {
    navigator.clipboard.writeText(verificationPayloadString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleManualSimulateVerify = () => {
    localStorage.setItem("kabadi_verified_certificate_id", certificateId);
    setIsVerifiedByBuyer(true);
  };

  const handleProceed = () => {
    navigate("/payment", {
      state: {
        lot,
        recycler,
        certificateId,
        verificationData: verificationPayloadObj
      }
    });
  };

  if (!lot) {
    return (
      <div className="screen pb-nav">
        <Navbar title="Handover" />
        <main className="col px-4 pt-6">
          <Card className="p-8 text-center">
            <ScaleIllustration className="w-32 h-28 mx-auto" />
            <h3 className="font-bold text-[18px] mt-3">No lot ready yet</h3>
            <p className="text-[13.5px] text-muted mt-1.5 max-w-[30ch] mx-auto">
              Photograph what you collected and set a weight — then you'll get a handover pass.
            </p>
            <Button className="mt-5" onClick={() => navigate("/scan")}>
              Scan a material
            </Button>
          </Card>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="screen pb-bar">
      <Navbar title="Handover pass" />

      <main className="col px-4 pt-4 flex flex-col gap-4">
        {/* ---- status ---------------------------------------------------- */}
        <motion.div
          key={isVerifiedByBuyer ? "ok" : "wait"}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl p-3.5 flex items-center gap-3 ${
            isVerifiedByBuyer ? "bg-brand-50" : "bg-gold-50"
          }`}
        >
          <span
            className={`w-9 h-9 shrink-0 rounded-lg grid place-items-center ${
              isVerifiedByBuyer ? "bg-brand-600 text-white" : "bg-gold-500 text-ink"
            }`}
          >
            {isVerifiedByBuyer ? (
              <HiCheckCircle className="text-lg" />
            ) : (
              <HiOutlineClock className="text-lg" />
            )}
          </span>
          <div className="min-w-0">
            <p
              className={`text-[13.5px] font-semibold ${
                isVerifiedByBuyer ? "text-brand-700" : "text-gold-700"
              }`}
            >
              {isVerifiedByBuyer ? "Verified by the depot" : "Waiting for the depot to scan"}
            </p>
            <p
              className={`text-[12.5px] mt-0.5 truncate ${
                isVerifiedByBuyer ? "text-brand-700/75" : "text-gold-700/75"
              }`}
            >
              {isVerifiedByBuyer
                ? `${recycler?.name} approved this handover`
                : "Show this screen at the counter"}
            </p>
          </div>
        </motion.div>

        {/* ---- pass ------------------------------------------------------- */}
        <div className="rounded-[18px] bg-surface border border-line overflow-hidden shadow-[var(--shadow-card)]">
          <div className="bg-ink text-white p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="badge bg-white/10 text-white">E-Waste EPR pass</span>
              <span className="text-[11px] font-mono text-white/50 truncate">{certificateId}</span>
            </div>
            <h2 className="text-[18px] font-bold tracking-[-0.015em] mt-2.5 leading-tight">
              Traceable scrap handover
            </h2>
            <p className="text-[12.5px] text-white/60 flex items-center gap-1.5 mt-1">
              <HiOutlineMapPin className="text-[13px] shrink-0" />
              <span className="truncate">{recycler?.name || "Authorized recycler"}</span>
            </p>
          </div>

          <div className="p-6 flex flex-col items-center bg-sunken/40">
            <div className="p-3 bg-white rounded-2xl border border-line">
              <QRCodeCanvas value={verificationPayloadString} size={196} level="H" includeMargin />
            </div>

            <p className="text-[11.5px] font-mono text-muted mt-3 text-center break-all px-2">
              {verificationPayloadObj.securityHash}
            </p>
            <p className="text-[12px] text-faint mt-1 text-center max-w-[30ch]">
              Carries the lot reference, timestamp and GPS coordinates
            </p>

            <button
              onClick={handleCopyPayload}
              className="mt-3 h-9 px-3.5 rounded-lg border border-line bg-surface
                         text-[13px] font-semibold text-ink flex items-center gap-2
                         tap hover:bg-sunken transition-colors"
            >
              {copied ? (
                <HiCheck className="text-brand-600 text-base" />
              ) : (
                <HiOutlineClipboard className="text-base" />
              )}
              {copied ? "Copied" : "Copy code"}
            </button>
          </div>

          {/* perforation */}
          <div className="relative h-0 border-t border-dashed border-line">
            <span className="absolute -left-2.5 -top-2.5 w-5 h-5 rounded-full bg-ground border-r border-line" />
            <span className="absolute -right-2.5 -top-2.5 w-5 h-5 rounded-full bg-ground border-l border-line" />
          </div>

          <div className="p-4 flex flex-col gap-2.5">
            {[
              ["Certified weight", formatWeight(formattedWeight)],
              ["Estimated payout", formatCurrency(formattedValue)],
              ["Collector", user?.name || "Verified collector"]
            ].map(([label, value], i) => (
              <div key={label} className="flex items-baseline justify-between gap-3">
                <span className="text-[13px] text-faint">{label}</span>
                <span
                  className={`font-bold tnum text-right ${
                    i === 1 ? "text-[17px] text-brand-600" : "text-[14px] text-ink"
                  }`}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {!isVerifiedByBuyer && (
          <button
            type="button"
            onClick={handleManualSimulateVerify}
            className="card p-3.5 flex items-center justify-center gap-2 text-[13px]
                       font-semibold text-muted tap active:bg-sunken/50 transition-colors"
          >
            <HiBolt className="text-gold-500 text-base" />
            Simulate the depot scanning this (demo)
          </button>
        )}
      </main>

      <div className="actionbar">
        <div className="col">
          <Button size="lg" variant="primary" onClick={handleProceed} icon={HiArrowRight}>
            {isVerifiedByBuyer ? "Settle payment" : "Continue to payment"}
          </Button>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
};
