import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { BottomNavigation } from "../components/BottomNavigation";
import { Button } from "../components/Button";
import { MaterialIcon } from "../components/icons/MaterialIcon";
import { classifyWithGemini, classifyDeep, getSupportedMaterials, scanMaterial } from "../services/estimateService";
import { getCurrentMaterialPrice } from "../services/priceService";
import { useApp } from "../context/AppContext";
import { formatCurrency, calculateTotalValue } from "../utils/helpers";
import {
  HiOutlineCamera, HiOutlineArrowUpTray, HiOutlineArrowPath,
  HiOutlineShoppingBag, HiCheck, HiMinus, HiPlus, HiArrowRight,
  HiOutlineExclamationTriangle, HiArrowPath, HiOutlineSparkles
} from "react-icons/hi2";
import { LiveCamera } from "../components/LiveCamera";

export const ScanItem = () => {
  const navigate = useNavigate();
  const { setActiveItem, addToBag, bagItems, t } = useApp();

  const [imagePreview, setImagePreview] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState("");
  const [addedToBag, setAddedToBag] = useState(false);
  const [weightKg, setWeightKg] = useState(1.0);
  const [classificationConfirmed, setClassificationConfirmed] = useState(false);
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [deepScanLoading, setDeepScanLoading] = useState(false);
  const [deepScanResult, setDeepScanResult] = useState(null);

  const withCurrentPrice = async (material) => {
    try {
      const currentPrice = await getCurrentMaterialPrice(material);
      return currentPrice ? {
        ...material,
        pricePerKg: currentPrice.quotedPrice,
        marketRangeMin: currentPrice.marketRangeMin,
        marketRangeMax: currentPrice.marketRangeMax,
        priceSource: currentPrice.source,
        priceConfidence: currentPrice.confidence
      } : material;
    } catch {
      return material;
    }
  };

  const handleCapturedImage = (dataUrl) => {
    setImagePreview(dataUrl);
    setIsCameraOpen(false);
    setScanResult(null);
    setScanError("");
    setAddedToBag(false);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        setIsCameraOpen(false);
        setScanResult(null);
        setScanError("");
        setAddedToBag(false);
        setClassificationConfirmed(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTriggerScan = async () => {
    setScanError("");
    setScanning(true);
    try {
      const res = await scanMaterial(imagePreview);
      if (res.needsRetake) {
        setScanResult(null);
        setScanError(res.message);
        return;
      }
      if (res.needsConfirmation) {
        setScanResult({ ...res, detectedMaterial: res.candidateMaterial });
        setClassificationConfirmed(false);
        setScanError("");
        return;
      }
      const material = await withCurrentPrice(res.detectedMaterial);
      const resultWithPrice = { ...res, detectedMaterial: material };
      setScanResult(resultWithPrice);
      // The model can be confidently wrong when the image is outside its
      // trained classes, so every prediction must be confirmed by the user.
      setClassificationConfirmed(false);
      setAddedToBag(false);
    } catch (err) {
      console.error(err);
      setScanError("The local AI model could not load. Refresh this page while connected once, wait a few seconds, then tap Identify again.");
    } finally {
      setScanning(false);
    }
  };

  const handleGeminiFallback = async () => {
    setGeminiLoading(true);
    setScanError("");
    try {
      const result = await classifyWithGemini(imagePreview);
      const category = result.category || result.label;
      if (result.source !== "gemini" || !category) throw new Error("Online AI is not configured. Choose the category manually.");
      const aliases = { battery: "Battery", batteries: "Battery", pcb: "PCB", mobile: "Mobile", phone: "Mobile", television: "Television", lcd: "Television", microwave: "Microwave", keyboard: "Keyboard", mouse: "Mouse", printer: "Printer", player: "Player", "washing machine": "Washing Machine" };
      const matched = getSupportedMaterials().find((item) => item.label === aliases[String(category).toLowerCase()]);
      if (!matched) throw new Error("Online AI returned an unsupported category. Choose the category manually.");
      const pricedMaterial = await withCurrentPrice(matched);
      setScanResult((previous) => ({ ...previous, detectedMaterial: pricedMaterial, detectedLabel: matched.label, confidence: Math.round(Number(result.confidence || 0) * 100), source: "gemini" }));
      setClassificationConfirmed(false);
    } catch (error) {
      setScanError(error.message || "Online AI could not classify this image.");
    } finally {
      setGeminiLoading(false);
    }
  };

  const handleDeepScan = async () => {
    if (!imagePreview) return;
    setDeepScanLoading(true);
    setScanError("");
    setDeepScanResult(null);
    try {
      const result = await classifyDeep(imagePreview);
      if (!result || !result.primaryCategory) throw new Error("Deep AI could not classify. Try a clearer photo.");
      setDeepScanResult(result);
      const categoryMap = {
        CRT: "CRT", LCD: "LCD", PCB: "PCB", cables: "Cables", batteries: "Battery",
        motors: "Motors", mixed_plastic: "Mixed Plastics", copper: "PCB", metal: "PCB", e_waste: "PCB"
      };
      const matchLabel = categoryMap[result.primaryCategory] || "PCB";
      const matched = getSupportedMaterials().find((m) => m.label === matchLabel);
      if (matched) {
        const pricedMaterial = await withCurrentPrice({
          ...matched,
          name: result.materialName || matched.name,
          shortDescription: result.reasoning || matched.shortDescription,
          safetyWarning: result.safetyWarnings?.join(". ") || matched.safetyWarning,
        });
        setScanResult((prev) => ({
          ...prev,
          detectedMaterial: pricedMaterial,
          detectedLabel: matchLabel,
          confidence: Math.round((result.confidence || 0.8) * 100),
          source: "groq_deep",
        }));
        setClassificationConfirmed(false);
      }
    } catch (err) {
      setScanError(err.message || "Deep AI scan failed. Check your connection.");
    } finally {
      setDeepScanLoading(false);
    }
  };

  const confirmClassification = async () => {
    if (!scanResult?.detectedMaterial) return;
    const pricedMaterial = await withCurrentPrice(scanResult.detectedMaterial);
    setScanResult((previous) => ({ ...previous, detectedMaterial: pricedMaterial }));
    setClassificationConfirmed(true);
    setActiveItem(pricedMaterial);
  };

  const chooseManualClassification = (event) => {
    const selected = getSupportedMaterials().find((item) => item.label === event.target.value);
    if (!selected) return;
    setScanResult((previous) => ({ ...previous, detectedMaterial: selected, detectedLabel: selected.label, source: "manual" }));
    setClassificationConfirmed(false);
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
        {isCameraOpen && !imagePreview ? (
          <div className="flex flex-col gap-3">
            <LiveCamera
              onCapture={handleCapturedImage}
              onClose={() => setIsCameraOpen(false)}
              onFallbackUpload={true}
            />
          </div>
        ) : imagePreview ? (
          <div className="flex flex-col gap-3">
            <div className="relative rounded-[18px] overflow-hidden bg-ink aspect-[4/3] shadow-md border border-line">
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

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setImagePreview(null);
                  setIsCameraOpen(true);
                  setScanResult(null);
                  setScanError("");
                }}
                className="h-11 rounded-xl border border-line bg-surface text-ink font-semibold
                           text-[13px] flex items-center justify-center gap-1.5 tap
                           hover:bg-sunken active:bg-sunken transition-colors"
                title="Open live camera"
              >
                <HiOutlineCamera className="text-base text-brand-600 shrink-0" />
                <span>Camera</span>
              </button>
              <label
                className="h-11 rounded-xl border border-line bg-surface text-ink font-semibold
                           text-[13px] flex items-center justify-center gap-1.5 cursor-pointer tap
                           hover:bg-sunken active:bg-sunken transition-colors"
                title="Choose photo from device gallery"
              >
                <HiOutlineArrowUpTray className="text-base text-muted shrink-0" />
                <span>Gallery</span>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
              <Button variant="primary" size="md" onClick={handleTriggerScan} loading={scanning}>
                {scanResult ? "Re-scan" : "Identify"}
              </Button>
            </div>
            <div className="grid grid-cols-1">
              <Button variant="outline" size="md" onClick={handleDeepScan} loading={deepScanLoading} icon={HiOutlineSparkles}>
                Deep AI Scan (Groq Vision)
              </Button>
            </div>
            {scanError && (
              <p className="text-[12.5px] text-alert-600 bg-alert-50 rounded-xl px-3 py-2.5 leading-snug">
                {scanError}
              </p>
            )}
          </div>
        ) : (
          <div className="card p-6 text-center shadow-sm">
            <span className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 grid place-items-center mx-auto">
              <HiOutlineCamera className="text-3xl" />
            </span>
            <h3 className="font-bold text-[18px] tracking-[-0.01em] mt-4">
              Photograph your scrap
            </h3>
            <p className="text-[13.5px] text-muted mt-1.5 max-w-[32ch] mx-auto leading-snug">
              Circuit boards, copper wire, batteries, or appliances. Use live camera viewfinder or upload a picture.
            </p>

            <div className="flex flex-col sm:grid sm:grid-cols-2 gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => setIsCameraOpen(true)}
                className="h-12 rounded-xl bg-brand-600 text-white font-semibold text-[14px]
                           flex items-center justify-center gap-2 tap shadow-sm
                           hover:bg-brand-700 active:bg-brand-700 transition-colors"
              >
                <HiOutlineCamera className="text-lg" />
                Open Live Camera
              </button>
              <label
                className="h-12 rounded-xl border border-line bg-surface text-ink font-semibold
                           text-[14px] flex items-center justify-center gap-2 cursor-pointer tap
                           hover:bg-sunken active:bg-sunken transition-colors"
              >
                <HiOutlineArrowUpTray className="text-lg text-muted" />
                Choose from Gallery
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            </div>

            <p className="eyebrow mt-4">Offline AI · Works without internet</p>
          </div>
        )}

        {/* ---- result --------------------------------------------------- */}
        {scanResult && (
          <>
            <div className="card overflow-hidden">
              <div className="p-4 flex items-start gap-3">
                <MaterialIcon material={scanResult.detectedMaterial} size="lg" />
                <div className="min-w-0 flex-1">
                  <span className={`badge tnum ${classificationConfirmed ? "bg-brand-50 text-brand-700" : "bg-gold-50 text-gold-700"}`}>
                    {scanResult.source === "manual" ? "Manual selection" : `${scanResult.confidence}% match`}
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

              {!classificationConfirmed && (
                <div className="mx-4 mb-4 p-3 rounded-xl bg-gold-50 flex flex-col gap-2.5">
                  <p className="text-[12.5px] text-gold-700 leading-snug">
                    Confirm the category before continuing. The AI result is only a suggestion.
                  </p>
                  <select value={scanResult.detectedLabel || ""} onChange={chooseManualClassification} className="h-10 rounded-lg border border-line bg-surface px-2 text-[13px]">
                    <option value="" disabled>Choose the correct category</option>
                    {getSupportedMaterials().map((item) => <option key={item.label} value={item.label}>{item.label}</option>)}
                  </select>
                  <div className="grid grid-cols-3 gap-2">
                    <Button size="sm" variant="outline" onClick={handleGeminiFallback} loading={geminiLoading}>Online AI</Button>
                    <Button size="sm" variant="outline" onClick={handleDeepScan} loading={deepScanLoading} icon={HiOutlineSparkles}>Deep Scan</Button>
                    <Button size="sm" variant="primary" onClick={confirmClassification}>Confirm</Button>
                  </div>
                </div>
              )}

              {scanResult.detectedMaterial.safetyWarning && (
                <div className="mx-4 mb-4 p-3 rounded-xl bg-alert-50 flex items-start gap-2.5">
                  <HiOutlineExclamationTriangle className="text-alert-600 text-base shrink-0 mt-px" />
                  <p className="text-[12.5px] text-alert-700 leading-snug">
                    {scanResult.detectedMaterial.safetyWarning}
                  </p>
                </div>
              )}

              {deepScanResult && (
              <div className="mx-4 mb-4 p-3.5 rounded-xl bg-violet-50 border border-violet-100">
                <p className="text-[11px] font-bold text-violet-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <HiOutlineSparkles className="text-xs" />
                  Deep AI Material Analysis
                </p>
                {deepScanResult.allMaterials?.length > 0 && (
                  <div className="flex flex-col gap-1.5 mb-3">
                    {deepScanResult.allMaterials.map((m, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-[12px] text-violet-800 flex-1 truncate">{m.name}</span>
                        <div className="w-20 h-1.5 rounded-full bg-violet-100 overflow-hidden">
                          <div className="h-full rounded-full bg-violet-500" style={{ width: `${m.percentage}%` }} />
                        </div>
                        <span className="text-[11px] font-bold tnum text-violet-700 w-8 text-right">{m.percentage}%</span>
                      </div>
                    ))}
                  </div>
                )}
                {deepScanResult.recoverableElements?.length > 0 && (
                  <div className="mb-2">
                    <p className="text-[11px] font-semibold text-violet-600 mb-1">Recoverable elements</p>
                    <div className="flex flex-wrap gap-1">
                      {deepScanResult.recoverableElements.map((el) => (
                        <span key={el} className="text-[11px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-medium">{el}</span>
                      ))}
                    </div>
                  </div>
                )}
                {deepScanResult.reasoning && (
                  <p className="text-[11.5px] text-violet-700/80 leading-snug mt-1">{deepScanResult.reasoning}</p>
                )}
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
      {scanResult && classificationConfirmed && (
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
