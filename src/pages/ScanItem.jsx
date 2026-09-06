import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { BottomNavigation } from "../components/BottomNavigation";
import { Button } from "../components/Button";
import { MaterialIcon } from "../components/icons/MaterialIcon";
import { scanMaterial } from "../services/estimateService";
import { useApp } from "../context/AppContext";
import { formatCurrency, calculateTotalValue } from "../utils/helpers";
import {
  HiOutlineCamera, HiOutlineArrowUpTray, HiOutlineArrowPath,
  HiOutlineShoppingBag, HiCheck, HiMinus, HiPlus, HiArrowRight,
  HiOutlineExclamationTriangle
} from "react-icons/hi2";

export const ScanItem = () => {
  const navigate = useNavigate();
  const { setActiveItem, addToBag, bagItems, t } = useApp();

  const [imagePreview, setImagePreview] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [addedToBag, setAddedToBag] = useState(false);
  const [weightKg, setWeightKg] = useState(1.0);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        setScanResult(null);
        setAddedToBag(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTriggerScan = async () => {
    setScanning(true);
    try {
      const res = await scanMaterial(imagePreview);
      setScanResult(res);
      setActiveItem(res.detectedMaterial);
      setAddedToBag(false);
    } catch (err) {
      console.error(err);
    } finally {
      setScanning(false);
    }
  };

  const handleProceedToValue = () => {
    if (scanResult) {
      navigate("/estimated-value", {
        state: {
          scanResult,
          imagePreview,
          initialWeight: weightKg
        }
      });
    }
  };

  const handleAddToBag = () => {
    if (!scanResult?.detectedMaterial) return;
    addToBag(scanResult.detectedMaterial, imagePreview, weightKg);
    setAddedToBag(true);
    setTimeout(() => setAddedToBag(false), 3000);
  };

  const itemSubtotal = scanResult
    ? calculateTotalValue(scanResult.detectedMaterial.pricePerKg, weightKg)
    : 0;

  return (
    <div className="screen pb-nav">
      <Navbar title={t("scanItem") || "Scan material"} />

      <main className="col px-4 pt-4 flex flex-col gap-4">
        {/* ---- capture -------------------------------------------------- */}
        {imagePreview ? (
          <div className="flex flex-col gap-3">
            <div className="relative rounded-[18px] overflow-hidden bg-ink aspect-[4/3]">
              <img
                src={imagePreview}
                alt="The scrap you photographed"
                className="w-full h-full object-cover"
              />
              {scanning && (
                <div className="absolute inset-0 bg-ink/75 backdrop-blur-[2px] grid place-items-center">
                  <div className="flex flex-col items-center gap-3">
                    <span className="w-10 h-10 rounded-full border-[3px] border-white/25 border-t-gold-500 animate-spin" />
                    <span className="eyebrow text-white/80">Identifying material</span>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <label
                className="h-11 rounded-xl border border-line bg-surface text-ink font-semibold
                           text-[14px] flex items-center justify-center gap-2 cursor-pointer tap
                           hover:bg-sunken active:bg-sunken transition-colors"
              >
                <HiOutlineArrowPath className="text-base" />
                Retake
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
              <Button variant="primary" size="md" onClick={handleTriggerScan} loading={scanning}>
                {scanResult ? "Scan again" : "Identify"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="card p-6 text-center">
            <span className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 grid place-items-center mx-auto">
              <HiOutlineCamera className="text-3xl" />
            </span>
            <h3 className="font-bold text-[18px] tracking-[-0.01em] mt-4">
              Take a photo of your scrap
            </h3>
            <p className="text-[13.5px] text-muted mt-1.5 max-w-[30ch] mx-auto leading-snug">
              Circuit boards, batteries, wire, appliances — one item at a time works best.
            </p>

            <div className="grid grid-cols-2 gap-2.5 mt-5">
              <label
                className="h-12 rounded-xl bg-brand-600 text-white font-semibold text-[14px]
                           flex items-center justify-center gap-2 cursor-pointer tap
                           hover:bg-brand-700 active:bg-brand-700 transition-colors"
              >
                <HiOutlineCamera className="text-lg" />
                Camera
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
              <label
                className="h-12 rounded-xl border border-line bg-surface text-ink font-semibold
                           text-[14px] flex items-center justify-center gap-2 cursor-pointer tap
                           hover:bg-sunken active:bg-sunken transition-colors"
              >
                <HiOutlineArrowUpTray className="text-lg" />
                Gallery
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            </div>

            <p className="eyebrow mt-5">Works without internet</p>
          </div>
        )}

        {/* ---- result --------------------------------------------------- */}
        {scanResult && (
          <>
            <div className="card overflow-hidden">
              <div className="p-4 flex items-start gap-3">
                <MaterialIcon material={scanResult.detectedMaterial} size="lg" />
                <div className="min-w-0 flex-1">
                  <span className="badge bg-brand-50 text-brand-700 tnum">
                    {scanResult.confidence}% match
                  </span>
                  <h3 className="font-bold text-[18px] tracking-[-0.01em] leading-tight mt-1.5">
                    {scanResult.detectedMaterial.name}
                  </h3>
                  <p className="text-[14px] text-muted mt-0.5">
                    <span className="font-bold text-ink tnum">
                      {formatCurrency(scanResult.detectedMaterial.pricePerKg)}
                    </span>{" "}
                    per {scanResult.detectedMaterial.unit || "kg"}
                  </p>
                </div>
              </div>

              {scanResult.detectedMaterial.safetyWarning && (
                <div className="mx-4 mb-4 p-3 rounded-xl bg-alert-50 flex items-start gap-2.5">
                  <HiOutlineExclamationTriangle className="text-alert-600 text-base shrink-0 mt-px" />
                  <p className="text-[12.5px] text-alert-700 leading-snug">
                    {scanResult.detectedMaterial.safetyWarning}
                  </p>
                </div>
              )}

              {scanResult.predictions?.length > 1 && (
                <div className="border-t border-hair px-4 py-3">
                  <p className="eyebrow mb-2">Other possible matches</p>
                  <div className="flex flex-col gap-1.5">
                    {scanResult.predictions.slice(1).map((prediction) => (
                      <div
                        key={prediction.label}
                        className="flex items-center gap-2 text-[13px] text-muted"
                      >
                        <span className="flex-1 truncate">{prediction.label}</span>
                        <span className="w-20 h-1.5 rounded-full bg-sunken overflow-hidden">
                          <span
                            className="block h-full rounded-full bg-line"
                            style={{ width: `${Math.max(prediction.confidence, 2)}%` }}
                          />
                        </span>
                        <span className="w-9 text-right font-semibold tnum">
                          {prediction.confidence}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ---- weight --------------------------------------------- */}
            <div className="card p-4">
              <div className="flex items-baseline justify-between">
                <span className="eyebrow">Weight</span>
                <span className="text-[13px] text-muted">
                  Subtotal{" "}
                  <span className="font-bold text-ink tnum text-[15px]">
                    {formatCurrency(itemSubtotal)}
                  </span>
                </span>
              </div>

              <div className="flex items-center gap-3 mt-3">
                <button
                  type="button"
                  onClick={() => setWeightKg((prev) => Math.max(0.1, Number((prev - 0.5).toFixed(2))))}
                  className="w-12 h-12 shrink-0 rounded-xl bg-sunken text-ink grid place-items-center
                             tap hover:bg-line active:bg-line transition-colors"
                  aria-label="Decrease weight"
                >
                  <HiMinus className="text-lg" />
                </button>

                <div className="flex-1 h-12 rounded-xl border-[1.5px] border-line flex items-center justify-center gap-1">
                  <input
                    type="number"
                    step="0.5"
                    min="0.1"
                    value={weightKg}
                    onChange={(e) => setWeightKg(Math.max(0.1, Number(Number(e.target.value).toFixed(2))))}
                    className="w-20 text-center font-bold text-[22px] tnum bg-transparent focus:outline-none"
                    aria-label="Weight in kilograms"
                  />
                  <span className="text-[14px] font-semibold text-faint">kg</span>
                </div>

                <button
                  type="button"
                  onClick={() => setWeightKg((prev) => Number((prev + 0.5).toFixed(2)))}
                  className="w-12 h-12 shrink-0 rounded-xl bg-brand-600 text-white grid place-items-center
                             tap hover:bg-brand-700 active:bg-brand-700 transition-colors"
                  aria-label="Increase weight"
                >
                  <HiPlus className="text-lg" />
                </button>
              </div>

              <div className="rail mt-3">
                {[0.5, 1.0, 2.0, 5.0, 10.0].map((quick) => (
                  <button
                    key={quick}
                    type="button"
                    onClick={() => setWeightKg(quick)}
                    data-on={weightKg === quick}
                    className="chip tnum tap"
                  >
                    {quick} kg
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => navigate("/bag")}
              className="text-[13.5px] font-semibold text-brand-600 text-center py-1 tap"
            >
              View bag ({bagItems.length})
            </button>
          </>
        )}
      </main>

      {/* ---- sticky actions -------------------------------------------- */}
      {scanResult && (
        <div className="actionbar">
          <div className="col grid grid-cols-2 gap-2.5">
            <Button
              onClick={handleAddToBag}
              variant={addedToBag ? "secondary" : "outline"}
              size="lg"
              icon={addedToBag ? HiCheck : HiOutlineShoppingBag}
            >
              {addedToBag ? "Added" : "Add to bag"}
            </Button>
            <Button onClick={handleProceedToValue} variant="primary" size="lg" icon={HiArrowRight}>
              Sell this
            </Button>
          </div>
        </div>
      )}

      <BottomNavigation />
    </div>
  );
};
