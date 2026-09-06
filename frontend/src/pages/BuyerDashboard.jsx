import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "../components/Navbar";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { Loader } from "../components/Loader";
import { QRScannerModal } from "../components/QRScannerModal";
import { DepotIllustration } from "../components/icons/Illustrations";
import { getCurrentBuyer, logoutBuyer } from "../services/authService";
import { getOpenLots, matchLot, completeHandover } from "../services/lotService";
import { getAllRecyclers } from "../services/recyclerService";
import { getRecyclerRatingStats } from "../services/reviewService";
import { formatCurrency, formatWeight } from "../utils/helpers";
import { FaStar } from "react-icons/fa";
import {
  HiOutlineQrCode, HiCheckCircle, HiOutlineDocumentText, HiXMark,
  HiArrowRight, HiOutlineShieldCheck, HiArrowRightOnRectangle,
  HiOutlineBuildingStorefront
} from "react-icons/hi2";

export const BuyerDashboard = () => {
  const navigate = useNavigate();
  const buyer = getCurrentBuyer();

  const [lots, setLots] = useState([]);
  const [recyclers, setRecyclers] = useState([]);
  const [loading, setLoading] = useState(true);

  // QR Scanner & Verification States
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [verificationSuccess, setVerificationSuccess] = useState(null);
  const [issuedCertificates, setIssuedCertificates] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("kabadi_issued_certificates") || "[]");
    } catch {
      return [];
    }
  });

  const ratingStats = getRecyclerRatingStats(buyer.id || "rec_1", 4.8, 38);

  const loadData = async () => {
    setLoading(true);
    try {
      const [openLots, allRecyclers] = await Promise.all([getOpenLots(), getAllRecyclers()]);
      setLots(openLots);
      setRecyclers(allRecyclers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleScanSuccess = (payload) => {
    setIsScannerOpen(false);
    setScannedData(payload);
  };

  const handleApproveHandover = async () => {
    if (!scannedData) return;

    try {
      if (!scannedData.lotId || !scannedData.signature || !scannedData.serverVerified) {
        throw new Error("This QR is not a server-issued Kabadi Passport. Ask the collector to reconnect and reopen the handover pass.");
      }
      const certId = scannedData.certificateId || `KBC-${Date.now()}`;
      const certWeight = Number(scannedData.totalWeight || 10).toFixed(2);
      const certValue = Number(scannedData.estimatedValue || 1500).toFixed(2);
      const handover = await completeHandover(scannedData.lotId, {
        finalPrice: Number(scannedData.estimatedValue || 0),
        paymentMethod: "cash",
        signature: scannedData.signature,
        handoverGps: scannedData.gps
      });

      const newCert = {
        certificateId: certId,
        lotId: scannedData.lotId || `LOT-${Date.now()}`,
        collectorName: scannedData.collectorName || "Local Scrap Collector",
        collectorPhone: scannedData.collectorPhone || "+91 98765 43210",
        buyerName: buyer.name,
        buyerId: buyer.id,
        totalWeight: certWeight,
        estimatedValue: certValue,
        materials: scannedData.materials || [{ name: "Mixed E-Waste Scrap", weight_kg: certWeight }],
        securityHash: handover.verification?.signature || scannedData.signature,
        verifiedAt: handover.transaction?.recyclerConfirmedAt || new Date().toISOString(),
        serverVerified: Boolean(handover.verification?.verified)
      };

      const updatedCerts = [newCert, ...issuedCertificates];
      setIssuedCertificates(updatedCerts);
      localStorage.setItem("kabadi_issued_certificates", JSON.stringify(updatedCerts));

      setVerificationSuccess(newCert);
      setScannedData(null);
      await loadData();
    } catch (err) {
      alert("Verification failed: " + err.message);
    }
  };

  const handleViewBuyerCertificate = (cert) => {
    navigate("/certificate", {
      state: {
        lot: {
          id: cert.lotId,
          total_weight: cert.totalWeight,
          estimated_value: cert.estimatedValue,
          materials: cert.materials
        },
        recycler: {
          id: buyer.id,
          name: buyer.name
        },
        certificateId: cert.certificateId,
        viewRole: "buyer"
      }
    });
  };

  const handleAcceptLot = async (lot) => {
    if (!buyer.id) return;
    try {
      await matchLot(lot.id, lot.estimated_value);
      await loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleLogout = async () => {
    await logoutBuyer();
    navigate("/buyer/login");
  };

  const initials = (buyer.name || "Depot")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className="screen pb-10">
      <Navbar title="Recycler portal" />

      <main className="col px-4 pt-4 flex flex-col gap-4">
        {/* ---- depot header --------------------------------------------- */}
        <section className="rounded-[18px] bg-ink text-white p-5">
          <div className="flex items-start gap-3">
            <span className="w-12 h-12 shrink-0 rounded-xl bg-white/10 grid place-items-center font-bold text-[16px]">
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <span className="badge bg-white/10 text-white">
                <HiOutlineShieldCheck className="text-[11px]" /> EPR depot
              </span>
              <h2 className="text-[19px] font-bold tracking-[-0.015em] leading-tight mt-1.5 truncate">
                {buyer.name}
              </h2>
              <p className="text-[12.5px] text-white/55 truncate">{buyer.email}</p>
            </div>
            <span className="shrink-0 h-8 px-2.5 rounded-lg bg-white/10 flex items-center gap-1.5">
              <FaStar className="text-gold-500 text-[12px]" />
              <span className="font-bold text-[13px] tnum">{ratingStats.averageRating}</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 mt-4">
            <div className="bg-white/[0.07] rounded-xl p-3">
              <p className="eyebrow text-white/45">Open lots</p>
              <p className="font-bold text-[22px] tnum mt-0.5">{lots.length}</p>
            </div>
            <div className="bg-white/[0.07] rounded-xl p-3">
              <p className="eyebrow text-white/45">Certificates</p>
              <p className="font-bold text-[22px] tnum mt-0.5 text-gold-500">
                {issuedCertificates.length}
              </p>
            </div>
          </div>
        </section>

        {/* ---- scan ------------------------------------------------------- */}
        <button
          onClick={() => setIsScannerOpen(true)}
          className="w-full text-left rounded-[18px] bg-brand-600 text-white overflow-hidden
                     relative tap active:bg-brand-700 transition-colors"
        >
          <div className="relative z-10 p-5 pr-32">
            <h3 className="text-[19px] font-bold tracking-[-0.015em] leading-tight">
              Scan a handover pass
            </h3>
            <p className="text-[13px] text-white/70 mt-1 max-w-[24ch] leading-snug">
              Verify the lot and issue the certificate in one step.
            </p>
            <span className="inline-flex items-center gap-1.5 mt-4 h-9 px-4 rounded-lg
                             bg-white text-brand-700 text-[13.5px] font-semibold">
              <HiOutlineQrCode className="text-base" />
              Open scanner
            </span>
          </div>
          <DepotIllustration className="absolute right-1 bottom-1 w-32 h-24 opacity-90 z-0" />
        </button>

        {/* ---- verification result ---------------------------------------- */}
        <AnimatePresence>
          {verificationSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="card p-4 border-brand-200 bg-brand-50"
            >
              <div className="flex items-start gap-3">
                <span className="w-9 h-9 shrink-0 rounded-lg bg-brand-600 text-white grid place-items-center">
                  <HiCheckCircle className="text-lg" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-brand-700">
                    Handover verified
                  </p>
                  <p className="text-[12.5px] text-brand-700/75 mt-0.5 truncate tnum">
                    {verificationSuccess.certificateId} ·{" "}
                    {formatWeight(verificationSuccess.totalWeight)}
                  </p>
                </div>
                <button
                  onClick={() => setVerificationSuccess(null)}
                  className="w-8 h-8 shrink-0 grid place-items-center rounded-full text-brand-700/60
                             hover:bg-brand-100 tap transition-colors"
                  aria-label="Dismiss"
                >
                  <HiXMark className="text-base" />
                </button>
              </div>
              <Button
                size="md"
                variant="primary"
                className="mt-3"
                onClick={() => handleViewBuyerCertificate(verificationSuccess)}
                icon={HiOutlineDocumentText}
              >
                View certificate
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---- issued certificates ----------------------------------------- */}
        {issuedCertificates.length > 0 && (
          <section>
            <div className="sec-head">
              <h3 className="sec-title">Issued certificates</h3>
              <span className="text-[12.5px] font-medium text-faint tnum">
                {issuedCertificates.length}
              </span>
            </div>
            <div className="card divide-y divide-hair overflow-hidden">
              {issuedCertificates.slice(0, 3).map((cert, i) => (
                <button
                  key={i}
                  onClick={() => handleViewBuyerCertificate(cert)}
                  className="w-full p-4 flex items-center gap-3 text-left tap
                             hover:bg-sunken/50 active:bg-sunken transition-colors"
                >
                  <span className="w-10 h-10 shrink-0 rounded-xl bg-brand-50 text-brand-600 grid place-items-center">
                    <HiOutlineDocumentText className="text-lg" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-mono font-semibold text-ink truncate">
                      {cert.certificateId}
                    </span>
                    <span className="block text-[12.5px] text-faint truncate tnum">
                      {cert.collectorName} · {formatWeight(cert.totalWeight)}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-bold text-[14.5px] tnum">
                      {formatCurrency(cert.estimatedValue)}
                    </span>
                  </span>
                  <HiArrowRight className="text-faint shrink-0" />
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ---- incoming lots ------------------------------------------------ */}
        <section>
          <div className="sec-head">
            <h3 className="sec-title">Incoming lots</h3>
          </div>

          {loading ? (
            <Loader message="Loading incoming lots" />
          ) : lots.length === 0 ? (
            <Card className="text-center py-8">
              <HiOutlineBuildingStorefront className="text-3xl text-faint mx-auto" />
              <p className="text-[14px] font-semibold text-ink mt-3">No lots waiting</p>
              <p className="text-[13px] text-muted mt-1 max-w-[32ch] mx-auto leading-snug">
                Collector lots need a shared store to reach you. For now, scan the pass at
                the counter instead.
              </p>
            </Card>
          ) : (
            <div className="flex flex-col gap-2.5">
              {lots.map((lot) => (
                <Card key={lot.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="font-semibold text-[14.5px] text-ink truncate">
                        {lot.collectors?.name || "Collector"}
                      </h4>
                      <p className="text-[12.5px] text-faint tnum mt-0.5">
                        {formatWeight(lot.total_weight)} · {new Date(lot.created_at).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-[16px] tnum">
                        {formatCurrency(lot.estimated_value)}
                      </p>
                      <span className="badge bg-sunken text-muted mt-1">{lot.status}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3">
                    {lot.status === "created" && (
                      <Button size="sm" variant="primary" fullWidth={false} onClick={() => handleAcceptLot(lot)}>
                        Accept lot
                      </Button>
                    )}
                    {lot.status === "matched" && (
                      <Button size="sm" variant="outline" fullWidth={false} onClick={() => setIsScannerOpen(true)}>
                        Scan handover pass
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* ---- reviews -------------------------------------------------------- */}
        <section>
          <div className="sec-head">
            <h3 className="sec-title">What collectors say</h3>
            <span className="flex items-center gap-1.5 text-[13px] font-bold tnum">
              <FaStar className="text-gold-500 text-[12px]" />
              {ratingStats.averageRating}
            </span>
          </div>

          {ratingStats.reviews.length === 0 ? (
            <Card className="text-center py-6">
              <p className="text-[13.5px] text-faint">No reviews yet.</p>
            </Card>
          ) : (
            <div className="flex flex-col gap-2.5">
              {ratingStats.reviews.map((rev) => (
                <Card key={rev.id} padding="p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13.5px] font-semibold text-ink truncate">
                      {rev.collectorName}
                    </span>
                    <span className="flex gap-0.5 shrink-0" aria-label={`${rev.rating} out of 5`}>
                      {[...Array(rev.rating)].map((_, idx) => (
                        <FaStar key={idx} className="text-gold-500 text-[10px]" />
                      ))}
                    </span>
                  </div>
                  {rev.comment && (
                    <p className="text-[13px] text-muted mt-1 leading-snug">{rev.comment}</p>
                  )}
                  {rev.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {rev.tags.map((tag, idx) => (
                        <span key={idx} className="badge bg-sunken text-muted normal-case tracking-normal">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* ---- account -------------------------------------------------------- */}
        <div className="grid grid-cols-2 gap-2.5 mt-2">
          <Button variant="outline" size="md" onClick={() => navigate("/buyer/register")}>
            Add a depot
          </Button>
          <Button variant="danger" size="md" onClick={handleLogout} icon={HiArrowRightOnRectangle}>
            Log out
          </Button>
        </div>
      </main>

      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />

      {/* ---- verification sheet ---------------------------------------------- */}
      <AnimatePresence>
        {scannedData && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="absolute inset-0 bg-ink/60 backdrop-blur-[2px]"
              onClick={() => setScannedData(null)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 340 }}
              className="relative w-full max-w-[440px] bg-surface rounded-t-[24px] shadow-[var(--shadow-sheet)]"
            >
              <div className="pt-3 pb-1 grid place-items-center">
                <span className="w-10 h-1 rounded-full bg-line" />
              </div>

              <div className="p-4 pt-2 flex items-start gap-3">
                <span className="w-10 h-10 shrink-0 rounded-xl bg-brand-50 text-brand-600 grid place-items-center">
                  <HiOutlineShieldCheck className="text-xl" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-[17px] leading-tight">Confirm this handover</h3>
                  <p className="text-[12.5px] text-faint mt-0.5">Check the weight before you pay</p>
                </div>
                <button
                  onClick={() => setScannedData(null)}
                  className="w-9 h-9 shrink-0 grid place-items-center rounded-full bg-sunken
                             text-muted hover:bg-line tap transition-colors"
                  aria-label="Close"
                >
                  <HiXMark className="text-lg" />
                </button>
              </div>

              <div className="px-4">
                <div className="rounded-xl bg-sunken p-4 flex flex-col gap-2.5">
                  {[
                    ["Reference", scannedData.certificateId || "KBC-DEMO", true],
                    ["Collector", scannedData.collectorName || "Local collector", false],
                    ["Phone", scannedData.collectorPhone || "—", true]
                  ].map(([label, value, mono]) => (
                    <div key={label} className="flex items-baseline justify-between gap-3">
                      <span className="text-[13px] text-faint shrink-0">{label}</span>
                      <span
                        className={`text-[13px] font-semibold text-ink text-right truncate ${
                          mono ? "font-mono tnum" : ""
                        }`}
                      >
                        {value}
                      </span>
                    </div>
                  ))}

                  <div className="flex items-baseline justify-between gap-3 pt-2.5 border-t border-line">
                    <span className="text-[13px] text-faint">Net weight</span>
                    <span className="text-[17px] font-bold text-ink tnum">
                      {formatWeight(scannedData.totalWeight || 10)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[13px] text-faint">Payable</span>
                    <span className="text-[22px] font-bold text-brand-600 tnum">
                      {formatCurrency(scannedData.estimatedValue || 1500)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 grid grid-cols-2 gap-2.5">
                <Button variant="outline" size="lg" onClick={() => setScannedData(null)}>
                  Reject
                </Button>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleApproveHandover}
                  icon={HiCheckCircle}
                >
                  Approve
                </Button>
              </div>
              <div className="safe-b" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
