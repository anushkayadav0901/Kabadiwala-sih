import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiOutlineCamera, HiOutlineArrowUpTray, HiOutlineCommandLine,
  HiXMark, HiBolt, HiCheck
} from "react-icons/hi2";

/**
 * Handover scanner, presented as a bottom sheet rather than a centred dialog —
 * a depot manager is holding the phone one-handed with a sack in the other,
 * so the controls belong in the thumb zone.
 */
export const QRScannerModal = ({ isOpen, onClose, onScanSuccess }) => {
  const [activeTab, setActiveTab] = useState("camera"); // "camera" | "upload" | "manual"
  const [errorMsg, setErrorMsg] = useState("");
  const [manualText, setManualText] = useState("");
  const [hasCamera, setHasCamera] = useState(true);
  const scannerRef = useRef(null);
  const isScanningRef = useRef(false);

  useEffect(() => {
    if (!isOpen || activeTab !== "camera") {
      stopCamera();
      return;
    }

    const startCamera = async () => {
      setErrorMsg("");
      try {
        const html5QrCode = new Html5Qrcode("buyer-qr-reader");
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 }
          },
          (decodedText) => {
            handleSuccessfulScan(decodedText);
          },
          () => {
            // Frame scan failure ignored
          }
        );
        isScanningRef.current = true;
      } catch (err) {
        console.warn("Camera start failed, falling back to upload/demo mode", err);
        setHasCamera(false);
        setErrorMsg("Camera unavailable or permission denied. Upload a QR photo or paste the code instead.");
      }
    };

    const timer = setTimeout(startCamera, 300);

    return () => {
      clearTimeout(timer);
      stopCamera();
    };
  }, [isOpen, activeTab]);

  const stopCamera = () => {
    if (scannerRef.current && isScanningRef.current) {
      scannerRef.current
        .stop()
        .catch(() => {})
        .finally(() => {
          scannerRef.current?.clear();
          scannerRef.current = null;
          isScanningRef.current = false;
        });
    }
  };

  const handleSuccessfulScan = (rawText) => {
    stopCamera();
    try {
      const parsed = JSON.parse(rawText);
      onScanSuccess(parsed);
    } catch {
      onScanSuccess({ raw: rawText, type: "kabadiwala-handover" });
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg("");
    try {
      const html5QrCode = new Html5Qrcode("buyer-file-reader");
      const decoded = await html5QrCode.scanFile(file, true);
      handleSuccessfulScan(decoded);
    } catch (err) {
      setErrorMsg("No QR code found in that image. Try another photo.");
    }
  };

  const handleManualSubmit = () => {
    if (!manualText.trim()) return;
    handleSuccessfulScan(manualText);
  };

  const handleFastDemoScan = () => {
    const activePayload = localStorage.getItem("kabadi_active_handover_payload");
    if (activePayload) {
      handleSuccessfulScan(activePayload);
    } else {
      // Generate standard mock handover payload
      const mockPayload = JSON.stringify({
        type: "kabadiwala-handover-v2",
        certificateId: `KBC-DEMO-${Date.now()}`,
        lotId: `lot_${Date.now()}`,
        collectorName: "Sanjay Pawar (Local Collector)",
        collectorPhone: "+91 98201 23456",
        totalWeight: "12.50",
        estimatedValue: "1875.00",
        materials: [
          { name: "Printed Circuit Boards (PCBs)", weight_kg: 7.5 },
          { name: "Copper Wire Scrap", weight_kg: 5.0 }
        ],
        timestamp: new Date().toISOString(),
        securityHash: `VERIF-SEC-${Date.now().toString(36).toUpperCase()}`
      });
      handleSuccessfulScan(mockPayload);
    }
  };

  const tabs = [
    { id: "camera", label: "Camera", icon: HiOutlineCamera },
    { id: "upload", label: "Photo", icon: HiOutlineArrowUpTray },
    { id: "manual", label: "Code", icon: HiOutlineCommandLine }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-ink/60 backdrop-blur-[2px]"
            onClick={() => { stopCamera(); onClose(); }}
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 340 }}
            className="relative w-full max-w-[440px] bg-surface rounded-t-[24px]
                       shadow-[var(--shadow-sheet)] max-h-[92dvh] flex flex-col"
          >
            <div className="pt-3 pb-1 grid place-items-center shrink-0">
              <span className="w-10 h-1 rounded-full bg-line" />
            </div>

            <div className="px-4 pb-3 flex items-center gap-3 shrink-0">
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-[17px] leading-tight">Scan handover pass</h3>
                <p className="text-[12.5px] text-faint mt-0.5">
                  Verify the collector's lot before you pay
                </p>
              </div>
              <button
                onClick={() => { stopCamera(); onClose(); }}
                className="w-9 h-9 shrink-0 grid place-items-center rounded-full bg-sunken
                           text-muted hover:bg-line active:bg-line tap transition-colors"
                aria-label="Close scanner"
              >
                <HiXMark className="text-lg" />
              </button>
            </div>

            <div className="px-4 shrink-0">
              <div className="flex gap-1 p-1 bg-sunken rounded-xl">
                {tabs.map((tab) => {
                  const on = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 h-9 rounded-lg text-[13px] font-semibold tap
                        flex items-center justify-center gap-1.5 transition-colors ${
                          on ? "bg-surface text-ink shadow-[var(--shadow-card)]" : "text-faint"
                        }`}
                    >
                      <tab.icon className="text-[15px]" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="px-4 py-4 overflow-y-auto flex flex-col gap-3">
              {errorMsg && (
                <p className="text-[12.5px] font-medium text-gold-700 bg-gold-50 border border-gold-100 rounded-xl px-3 py-2.5">
                  {errorMsg}
                </p>
              )}

              {activeTab === "camera" && (
                <div className="flex flex-col gap-2.5">
                  <div className="relative rounded-2xl overflow-hidden bg-ink aspect-square">
                    <div id="buyer-qr-reader" className="w-full h-full" />
                    {/* corner brackets so the frame reads even before the feed starts */}
                    <div className="pointer-events-none absolute inset-8">
                      {["top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-lg",
                        "top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-lg",
                        "bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-lg",
                        "bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-lg"
                      ].map((pos) => (
                        <span key={pos} className={`absolute w-8 h-8 border-gold-500 ${pos}`} />
                      ))}
                    </div>
                  </div>
                  <p className="text-[12.5px] text-faint text-center">
                    Hold the collector's QR code inside the frame
                  </p>
                </div>
              )}

              {activeTab === "upload" && (
                <div>
                  <div id="buyer-file-reader" className="hidden" />
                  <label
                    className="block p-8 rounded-2xl border-[1.5px] border-dashed border-line
                               bg-sunken text-center cursor-pointer tap hover:bg-line/40 transition-colors"
                  >
                    <HiOutlineArrowUpTray className="text-3xl text-brand-600 mx-auto" />
                    <span className="block text-[14px] font-semibold text-ink mt-2.5">
                      Choose a QR photo
                    </span>
                    <span className="block text-[12px] text-faint mt-0.5">
                      PNG, JPG or a screenshot
                    </span>
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>
              )}

              {activeTab === "manual" && (
                <div className="flex flex-col gap-2.5">
                  <label className="eyebrow" htmlFor="qr-manual">
                    Paste the handover code
                  </label>
                  <textarea
                    id="qr-manual"
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    placeholder='{"type":"kabadiwala-handover-v2","certificateId":"KBC-..."}'
                    rows={4}
                    className="field h-auto py-3 font-mono text-[12px] leading-relaxed resize-none"
                  />
                  <button
                    onClick={handleManualSubmit}
                    className="h-11 rounded-xl bg-brand-600 text-white font-semibold text-[14px]
                               flex items-center justify-center gap-2 tap hover:bg-brand-700 transition-colors"
                  >
                    <HiCheck className="text-base" />
                    Verify code
                  </button>
                </div>
              )}

              <button
                onClick={handleFastDemoScan}
                type="button"
                className="h-11 rounded-xl border border-line bg-surface text-ink font-semibold text-[13px]
                           flex items-center justify-center gap-2 tap hover:bg-sunken transition-colors"
              >
                <HiBolt className="text-gold-500 text-base" />
                Read the active handover (demo)
              </button>
            </div>

            <div className="safe-b" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
