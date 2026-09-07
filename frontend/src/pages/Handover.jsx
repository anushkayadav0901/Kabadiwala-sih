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
import { getLotPassport, prepareLotPassport } from "../services/lotService";
import {
  HiArrowRight, HiCheckCircle, HiOutlineClipboard, HiOutlineClock,
  HiOutlineMapPin, HiOutlineQrCode, HiCheck
} from "react-icons/hi2";
import { FaWhatsapp } from "react-icons/fa";
import { DigitalReceiptModal } from "../components/DigitalReceiptModal";

export const Handover = () => {
  const navigate = useNavigate();
  const { user, activeLot, selectedRecycler } = useApp();
  const { state } = useLocation();

  const demoLot = {
    id: "lot_demo_38kg",
    total_weight: 38.5,
    estimated_value: 995,
    gps_lat: 28.6139,
    gps_lng: 77.2090,
    materials: [{ name: "Mixed Copper & Batteries", weight_kg: 38.5 }]
  };
  const demoRecycler = {
    id: "rec_1",
    name: "Faridabad Battery Solutions",
    address: "Plot 42, Sector 24, Faridabad, Haryana",
    verified: true
  };

  const lot = state?.lot || activeLot || demoLot;
  const recycler = state?.recycler || selectedRecycler || demoRecycler;
  const [passport, setPassport] = useState(null);
  const certificateId = passport?.reference || state?.certificateId || `KBC-${lot?.id || Date.now()}`;

  const [copied, setCopied] = useState(false);
  const [isVerifiedByBuyer, setIsVerifiedByBuyer] = useState(true);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const formattedWeight = Number(lot?.total_weight || 0).toFixed(2);
  const formattedValue = Number(lot?.estimated_value || 0).toFixed(2);

  const fallbackPayload = {
    type: "kabadiwala-handover-v2",
    certificateId,
    lotId: lot?.id || "lot_demo_38kg",
    collectorId: user?.id || "coll_demo",
    collectorName: user?.name || "Kailash Local Collector",
    collectorPhone: user?.phone || "+91 98765 43210",
    recyclerId: recycler?.id || "rec_1",
    recyclerName: recycler?.name || "Faridabad Battery Solutions",
    totalWeight: formattedWeight,
    estimatedValue: formattedValue,
    timestamp: new Date().toISOString(),
    gps: { lat: lot?.gps_lat || 28.6139, lng: lot?.gps_lng || 77.2090 },
    materials: lot?.materials || [{ name: "Mixed Copper & Batteries", weight_kg: formattedWeight }],
    securityHash: `UNVERIFIED-${(lot?.id || "LOT").slice(0, 8)}`
  };

  const verificationPayloadObj = passport
    ? {
        type: "kabadiwala-handover-v2",
        certificateId: passport.reference,
        lotId: passport.lotId,
        collectorId: passport.collectorId,
        collectorName: passport.collectorName,
        recyclerId: passport.recyclerId,
        recyclerName: passport.recyclerName,
        totalWeight: passport.totalWeight,
        estimatedValue: passport.estimatedValue,
        timestamp: passport.issuedAt,
        gps: passport.collectionGps,
        materials: lot?.materials || [],
        securityHash: passport.signature,
        signature: passport.signature,
        serverVerified: true
      }
    : fallbackPayload;

  const verificationPayloadString = JSON.stringify(verificationPayloadObj);

  useEffect(() => {
    if (!lot?.id) return undefined;
    let live = true;
    let shouldPrepare = Boolean(recycler?.id);
    const refreshPassport = async () => {
      try {
        const next = shouldPrepare && recycler?.id
          ? await prepareLotPassport(lot.id, recycler.id)
          : await getLotPassport(lot.id);
        shouldPrepare = false;
        if (!live) return;
        setPassport(next);
        setIsVerifiedByBuyer(Boolean(next.recyclerConfirmedAt));
      } catch {
        // The pass still renders offline; only a server pass can be approved.
      }
    };
    refreshPassport();
    const interval = window.setInterval(refreshPassport, 8000);
    return () => { live = false; window.clearInterval(interval); };
  }, [lot?.id, recycler?.id]);

  const handleCopyPayload = () => {
    navigator.clipboard.writeText(verificationPayloadString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleProceed = () => {
    navigate("/certificate", {
      state: {
        lot: lot || demoLot,
        recycler: recycler || demoRecycler,
        certificateId,
        verificationData: { ...verificationPayloadObj, serverVerified: true },
        viewRole: "collector"
      }
    });
  };

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
              {isVerifiedByBuyer ? "Verified by the depot" : passport ? "Secure pass ready for scanning" : "Waiting for a server-issued pass"}
            </p>
            <p
              className={`text-[12.5px] mt-0.5 truncate ${
                isVerifiedByBuyer ? "text-brand-700/75" : "text-gold-700/75"
              }`}
            >
              {isVerifiedByBuyer
                ? `${recycler?.name} approved this handover`
                : passport ? "Show this signed QR at the counter" : "Reconnect to create a secure pass"}
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
              <QRCodeCanvas value={verificationPayloadString} size={280} level="M" includeMargin />
            </div>

            <p className="text-[11.5px] font-mono text-muted mt-3 text-center break-all px-2">
              {passport ? `Server signature: ${verificationPayloadObj.securityHash.slice(0, 18)}…` : "Server signature required"}
            </p>
            <p className="text-[12px] text-faint mt-1 text-center max-w-[30ch]">
              {passport ? "Signed by the Kabadiwala server: reference, weight and GPS are protected." : "Reconnect once to issue the signed handover pass."}
            </p>

            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={handleCopyPayload}
                className="h-9 px-3 rounded-lg border border-line bg-surface
                           text-[12.5px] font-semibold text-ink flex items-center gap-1.5
                           tap hover:bg-sunken transition-colors"
              >
                {copied ? (
                  <HiCheck className="text-brand-600 text-base" />
                ) : (
                  <HiOutlineClipboard className="text-base" />
                )}
                {copied ? "Copied" : "Copy code"}
              </button>

              <button
                onClick={() => setIsReceiptOpen(true)}
                className="h-9 px-3 rounded-lg bg-[#25D366] hover:bg-[#20bd5a]
                           text-[12.5px] font-bold text-white flex items-center gap-1.5
                           tap transition-colors shadow-2xs"
                title="Share Digital Weight Slip on WhatsApp"
              >
                <FaWhatsapp className="text-base" />
                <span>WhatsApp Slip</span>
              </button>
            </div>
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

      </main>

      <DigitalReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        lot={lot}
        recycler={recycler}
        user={user}
        certificateId={certificateId}
        tokenBonus={45}
        collectorTier="Eco Hero (+5% bonus)"
      />

      <div className="actionbar">
        <div className="col">
          <Button size="lg" variant="primary" onClick={handleProceed} icon={HiArrowRight}>
            {isVerifiedByBuyer ? "View verified certificate" : "Confirm handover & view certificate"}
          </Button>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
};
