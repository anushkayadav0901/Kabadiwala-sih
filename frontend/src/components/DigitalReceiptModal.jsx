import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeCanvas } from "qrcode.react";
import { FaWhatsapp } from "react-icons/fa";
import {
  HiOutlineXMark, HiCheckCircle, HiOutlineMapPin,
  HiOutlineClock, HiOutlineScale, HiOutlineSparkles,
  HiOutlineArrowDownTray, HiOutlineShare, HiCheck
} from "react-icons/hi2";
import jsPDF from "jspdf";
import "jspdf-autotable";

export const DigitalReceiptModal = ({
  isOpen,
  onClose,
  lot,
  recycler,
  user,
  certificateId,
  tokenBonus = 45,
  collectorTier = "Eco Hero (+5% bonus)"
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const refId = certificateId || `KBC-${lot?.id ? String(lot.id).slice(0, 8) : Date.now()}`;
  const now = new Date();
  const formattedDate = now.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
  const formattedTime = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });

  const weightKg = Number(lot?.total_weight || lot?.totalWeight || 38.5).toFixed(2);
  const totalAmount = Number(lot?.estimated_value || lot?.estimatedValue || 995).toFixed(2);
  const materialName = lot?.materials?.map((m) => m.name || m.category).join(", ") || "Mixed Copper & Batteries";

  const gpsCoords = lot?.gps_lat && lot?.gps_lng
    ? `${Number(lot.gps_lat).toFixed(4)}° N, ${Number(lot.gps_lng).toFixed(4)}° E`
    : "28.6139° N, 77.2090° E";

  const recyclerName = recycler?.name || "Faridabad Battery Solutions";
  const collectorName = user?.name || "Kailash Local Collector";

  // WhatsApp share message
  const shareText = `*KABADIWALA CONNECT — DIGITAL WEIGHT SLIP*
Ref: ${refId}
---------------------------------
📍 *GPS Location:* ${gpsCoords}
⏰ *Time:* ${formattedDate}, ${formattedTime}
📦 *Scrap Category:* ${materialName}
⚖️ *Digital Weight:* ${weightKg} kg (Certified)
💰 *Settlement Payout:* ₹${totalAmount}
🪙 *Token Bonus:* +${tokenBonus} Tokens (${collectorTier})
🏢 *Authorized Depot:* ${recyclerName}
👤 *Collector:* ${collectorName}
---------------------------------
✓ Officially verified formal recycling under E-Waste Rules 2022.`;

  const handleWhatsAppShare = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [100, 160] // Slip format
    });

    // Dark Header
    doc.setFillColor(15, 20, 36); // #0F1424
    doc.rect(0, 0, 100, 26, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("KABADIWALA CONNECT", 50, 10, { align: "center" });

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("DIGITAL WEIGHT SLIP • CPCB VERIFIED", 50, 17, { align: "center" });
    doc.text(`Ref: ${refId}`, 50, 22, { align: "center" });

    // Body Info
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(8);

    let y = 34;
    doc.text(`Date & Time: ${formattedDate}, ${formattedTime}`, 8, y);
    doc.text(`GPS: ${gpsCoords}`, 8, y + 6);
    doc.text(`Collector: ${collectorName}`, 8, y + 12);
    doc.text(`Recycler: ${recyclerName}`, 8, y + 18);

    // Separator
    doc.setDrawColor(226, 232, 240);
    doc.line(8, y + 23, 92, y + 23);

    // Weight & Material box
    y += 30;
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(8, y, 84, 22, 2, 2, "F");

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("CERTIFIED DIGITAL WEIGHT", 12, y + 6);

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 20, 36);
    doc.text(`${weightKg} kg`, 12, y + 14);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Category: ${materialName.slice(0, 24)}`, 12, y + 19);

    // Settlement & Bonus
    y += 28;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`Total Payout: Rs. ${totalAmount}`, 8, y);

    doc.setTextColor(5, 150, 105); // Emerald
    doc.text(`Token Bonus: +${tokenBonus} Tokens (${collectorTier})`, 8, y + 6);

    // Footer
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text("Verified formal scrap handover record.", 50, 150, { align: "center" });

    doc.save(`Weight_Slip_${refId}.pdf`);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-[390px] bg-surface rounded-2xl shadow-2xl border border-line overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Slip Top Brand Bar */}
          <div className="bg-ink text-white p-4 pb-3 flex items-start justify-between relative">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-bold tracking-widest uppercase text-emerald-400">
                  Digital Weight Slip
                </span>
              </div>
              <h3 className="text-[17px] font-extrabold tracking-tight mt-0.5">
                Kabadiwala Connect
              </h3>
              <p className="text-[11px] text-white/60 font-mono mt-0.5">
                Ref: {refId}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white grid place-items-center tap transition-colors"
              aria-label="Close"
            >
              <HiOutlineXMark className="text-lg" />
            </button>
          </div>

          {/* Slip Content Body */}
          <div className="p-4 overflow-y-auto space-y-3.5 text-ink flex-1">
            {/* GPS & Timestamp Row */}
            <div className="p-2.5 rounded-xl bg-sunken/60 border border-line text-[12px] space-y-1">
              <div className="flex items-center justify-between text-muted">
                <span className="flex items-center gap-1">
                  <HiOutlineClock className="text-brand-600 text-sm shrink-0" />
                  <span>{formattedDate} · {formattedTime}</span>
                </span>
                <span className="badge bg-emerald-50 text-emerald-700 text-[9.5px] font-bold py-0.5 px-1.5">
                  ✓ Verified GPS
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-faint font-mono">
                <HiOutlineMapPin className="text-sm shrink-0 text-faint" />
                <span>{gpsCoords}</span>
              </div>
            </div>

            {/* Scrap Category & Digital Weight Hero */}
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-surface to-emerald-50/40 border border-line">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="eyebrow text-faint">Scrap Category</span>
                  <p className="text-[14px] font-bold text-ink mt-0.5 leading-snug">
                    {materialName}
                  </p>
                </div>
                <span className="w-8 h-8 rounded-lg bg-emerald-100/70 text-emerald-800 grid place-items-center shrink-0">
                  <HiOutlineScale className="text-base" />
                </span>
              </div>

              <div className="mt-3 pt-2.5 border-t border-line/80 flex items-baseline justify-between">
                <div>
                  <span className="text-[11px] text-faint block">Certified Digital Weight</span>
                  <span className="text-[26px] font-black text-ink tnum leading-tight">
                    {weightKg} <span className="text-[14px] font-bold text-muted">kg</span>
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-faint block">Gross Settlement</span>
                  <span className="text-[20px] font-extrabold text-brand-700 tnum leading-tight">
                    ₹{totalAmount}
                  </span>
                </div>
              </div>
            </div>

            {/* Token Bonus Banner */}
            <div className="p-2.5 rounded-xl bg-gold-50 border border-gold-200/80 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-gold-500 text-ink grid place-items-center shrink-0">
                  <HiOutlineSparkles className="text-sm" />
                </span>
                <div>
                  <p className="text-[12.5px] font-bold text-gold-900 leading-tight">
                    +{tokenBonus} Tokens Earned
                  </p>
                  <p className="text-[11px] text-gold-700 mt-0.5">
                    Tier bonus: {collectorTier}
                  </p>
                </div>
              </div>
              <span className="badge bg-gold-200/90 text-gold-900 text-[10px] font-extrabold">
                Wallet Credited
              </span>
            </div>

            {/* Depot & Collector Metadata */}
            <div className="grid grid-cols-2 gap-2 text-[11.5px] pt-1 border-t border-hair">
              <div className="p-2 rounded-lg bg-sunken/40 border border-line/60">
                <span className="text-faint block text-[10.5px]">Collector (Seller)</span>
                <span className="font-semibold text-ink truncate block mt-0.5">{collectorName}</span>
              </div>
              <div className="p-2 rounded-lg bg-sunken/40 border border-line/60">
                <span className="text-faint block text-[10.5px]">Authorized Recycler</span>
                <span className="font-semibold text-ink truncate block mt-0.5">{recyclerName}</span>
              </div>
            </div>

            {/* Verification QR Preview */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-sunken/60 border border-line text-[11px]">
              <div className="space-y-0.5">
                <p className="font-bold text-ink flex items-center gap-1">
                  <HiCheckCircle className="text-emerald-600 text-sm" />
                  <span>Tamper-Proof Receipt</span>
                </p>
                <p className="text-faint">Scan QR to verify CPCB compliance</p>
              </div>
              <div className="p-1 bg-white rounded-md border border-line shrink-0">
                <QRCodeCanvas value={`https://kabadiwala-connect.org/verify/${refId}`} size={44} />
              </div>
            </div>
          </div>

          {/* Action Buttons: WhatsApp + Download + Copy */}
          <div className="p-4 pt-3 bg-surface border-t border-line space-y-2">
            <button
              onClick={handleWhatsAppShare}
              className="w-full h-11 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-[14px] flex items-center justify-center gap-2 tap transition-colors shadow-xs"
            >
              <FaWhatsapp className="text-lg" />
              <span>Share via WhatsApp</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleDownloadPDF}
                className="h-10 rounded-xl border border-line bg-surface hover:bg-sunken text-ink font-semibold text-[12.5px] flex items-center justify-center gap-1.5 tap transition-colors"
              >
                <HiOutlineArrowDownTray className="text-base text-muted" />
                <span>Download PDF</span>
              </button>
              <button
                onClick={handleCopy}
                className="h-10 rounded-xl border border-line bg-surface hover:bg-sunken text-ink font-semibold text-[12.5px] flex items-center justify-center gap-1.5 tap transition-colors"
              >
                {copied ? (
                  <>
                    <HiCheck className="text-emerald-600 text-base" />
                    <span className="text-emerald-700">Copied!</span>
                  </>
                ) : (
                  <>
                    <HiOutlineShare className="text-base text-muted" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
