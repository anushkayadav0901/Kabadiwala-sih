import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { BottomNavigation } from "../components/BottomNavigation";
import { Button } from "../components/Button";
import { MaterialIcon } from "../components/icons/MaterialIcon";
import { useApp } from "../context/AppContext";
import { mockMaterials } from "../data/mockData";
import {
  formatCurrency,
  formatWeight,
  calculateTotalValue,
  mapFrontendMaterialToDbCategory
} from "../utils/helpers";
import { createLot } from "../services/lotService";
import { HiMinus, HiPlus, HiOutlineMapPin, HiOutlineInformationCircle } from "react-icons/hi2";

export const EstimatedValue = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeItem, user, userLocation, setActiveLot, clearBag, t } = useApp();

  const scanState = location.state || {};
  const scannedMaterial = scanState.scanResult?.detectedMaterial;
  const imagePreview = scanState.imagePreview || null;
  const bagItems = scanState.bagItems || null;
  const currentMaterial = activeItem || scannedMaterial || mockMaterials[0];
  const [weightKg, setWeightKg] = useState(
    scanState.initialWeight ? Number(Number(scanState.initialWeight).toFixed(2)) : 5.0
  );
  const [saving, setSaving] = useState(false);

  const materialsToSell = bagItems?.length ? bagItems : [{ ...currentMaterial, weightKg }];
  const totalWeight = Number(
    (bagItems?.length
      ? bagItems.reduce((sum, item) => sum + Number(item.weightKg || 0), 0)
      : weightKg).toFixed(2)
  );
  const totalEstimate = bagItems?.length
    ? bagItems.reduce((sum, item) => sum + calculateTotalValue(item.pricePerKg, item.weightKg), 0)
    : calculateTotalValue(currentMaterial.pricePerKg, weightKg);
  const fairEstimate = bagItems?.length
    ? bagItems.reduce((sum, item) => ({
        min: sum.min + Number(item.marketRangeMin ?? item.pricePerKg) * Number(item.weightKg || 0),
        max: sum.max + Number(item.marketRangeMax ?? item.pricePerKg) * Number(item.weightKg || 0)
      }), { min: 0, max: 0 })
    : {
        min: Number(currentMaterial.marketRangeMin ?? currentMaterial.pricePerKg) * weightKg,
        max: Number(currentMaterial.marketRangeMax ?? currentMaterial.pricePerKg) * weightKg
      };

  const handleIncrement = (amount) => {
    setWeightKg((prev) => Math.max(0.1, Number((prev + amount).toFixed(2))));
  };

  const handleFindBuyers = async () => {
    if (!user?.id) {
      navigate("/recyclers");
      return;
    }

    setSaving(true);
    try {
      const lot = await createLot({
        collectorId: user.id,
        materials: materialsToSell.map((material) => ({
          category: mapFrontendMaterialToDbCategory(material),
          name: material.name,
          weight_kg: Number(material.weightKg || 0),
          price_per_kg: material.pricePerKg
        })),
        totalWeight,
        estimatedValue: totalEstimate,
        photoUrls: materialsToSell.map((material) => material.imagePreview).filter(Boolean),
        gpsLat: userLocation?.lat,
        gpsLng: userLocation?.lng,
        status: "created",
        materialData: bagItems?.length ? null : {
          category: mapFrontendMaterialToDbCategory(currentMaterial),
          subCategory: currentMaterial.subCategory || null,
          description: currentMaterial.shortDescription || currentMaterial.description || currentMaterial.name,
          imageUrl: imagePreview || currentMaterial.imageUrl || null,
          weightKg: totalWeight,
          condition: currentMaterial.condition || "mixed"
        },
        traceability: {
          photoUrls: materialsToSell.map((material) => material.imagePreview).filter(Boolean),
          weight: totalWeight,
          gpsLat: userLocation?.lat,
          gpsLng: userLocation?.lng,
          handoverReferenceNumber: `LOT-${Date.now()}`,
          status: "created"
        }
      });
      setActiveLot(lot);
      if (bagItems?.length) clearBag();
      navigate("/recyclers");
    } catch (err) {
      console.error(err);
      navigate("/recyclers");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="screen pb-bar">
      <Navbar title={t("estimatedValue") || "Estimated value"} />

      <main className="col px-4 pt-4 flex flex-col gap-4">
        {/* ---- what is being sold --------------------------------------- */}
        <section>
          <p className="eyebrow mb-2">
            {bagItems?.length ? `Selling ${bagItems.length} items` : "Selling"}
          </p>

          {bagItems?.length ? (
            <div className="card divide-y divide-hair overflow-hidden">
              {bagItems.map((item) => (
                <div key={item.bagId} className="p-3.5 flex items-center gap-3">
                  <MaterialIcon material={item} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold text-ink truncate">{item.name}</p>
                    <p className="text-[12px] text-faint tnum">
                      {Number(item.weightKg).toFixed(2)} kg · {formatCurrency(item.pricePerKg)}/kg
                    </p>
                  </div>
                  <span className="font-bold text-[14.5px] tnum shrink-0">
                    {formatCurrency(calculateTotalValue(item.pricePerKg, item.weightKg))}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-4 flex items-center gap-3">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt={currentMaterial.name}
                  className="w-14 h-14 shrink-0 rounded-xl object-cover bg-ink"
                />
              ) : (
                <MaterialIcon material={currentMaterial} size="lg" />
              )}
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-[16px] leading-tight text-ink">
                  {currentMaterial.name}
                </h3>
                <p className="text-[13px] text-muted mt-0.5 tnum">
                  {formatCurrency(currentMaterial.pricePerKg)} per {currentMaterial.unit || "kg"}
                </p>
              </div>
            </div>
          )}
        </section>

        {/* ---- weight ---------------------------------------------------- */}
        <section className="card p-4">
          <p className="eyebrow">
            {bagItems?.length ? "Combined weight" : t("weightInKg") || "Weight"}
          </p>

          {bagItems?.length ? (
            <p className="font-bold text-[34px] tnum tracking-[-0.02em] mt-1">
              {totalWeight.toFixed(2)}
              <span className="text-[18px] text-faint font-semibold ml-1.5">kg</span>
            </p>
          ) : (
            <>
              <div className="flex items-center gap-3 mt-3">
                <button
                  onClick={() => handleIncrement(-1)}
                  className="w-12 h-14 shrink-0 rounded-xl bg-sunken text-ink grid place-items-center
                             tap hover:bg-line active:bg-line transition-colors"
                  aria-label="Decrease weight by one kilo"
                >
                  <HiMinus className="text-xl" />
                </button>

                <div className="flex-1 h-14 rounded-xl border-[1.5px] border-line flex items-center justify-center gap-1">
                  <input
                    type="number"
                    step="0.5"
                    min="0.1"
                    value={weightKg}
                    onChange={(e) => setWeightKg(Math.max(0.1, Number(Number(e.target.value).toFixed(2))))}
                    className="w-24 text-center font-bold text-[30px] tnum bg-transparent focus:outline-none"
                    aria-label="Weight in kilograms"
                  />
                  <span className="text-[15px] font-semibold text-faint">kg</span>
                </div>

                <button
                  onClick={() => handleIncrement(1)}
                  className="w-12 h-14 shrink-0 rounded-xl bg-brand-600 text-white grid place-items-center
                             tap hover:bg-brand-700 active:bg-brand-700 transition-colors"
                  aria-label="Increase weight by one kilo"
                >
                  <HiPlus className="text-xl" />
                </button>
              </div>

              <div className="rail mt-3">
                {[1, 5, 10, 25, 50].map((val) => (
                  <button
                    key={val}
                    onClick={() => setWeightKg(val)}
                    data-on={weightKg === val}
                    className="chip tnum tap"
                  >
                    {val} kg
                  </button>
                ))}
              </div>
            </>
          )}
        </section>

        {/* ---- estimate -------------------------------------------------- */}
        <section className="rounded-[18px] bg-ink text-white p-5">
          <p className="eyebrow text-white/50">Estimated payout</p>
          <p className="font-bold text-[40px] tnum tracking-[-0.03em] leading-none mt-2">
            {formatCurrency(totalEstimate)}
          </p>
          <p className="text-[13px] text-white/60 mt-2.5 tnum">
            {bagItems?.length
              ? `${formatWeight(totalWeight)} across ${bagItems.length} items`
              : `${formatWeight(weightKg)} × ${formatCurrency(currentMaterial.pricePerKg)}`}
          </p>
        </section>

        <section className="rounded-[18px] bg-brand-50 border border-brand-100 p-4">
          <p className="eyebrow text-brand-700">Fair-Price Shield</p>
          <p className="font-bold text-[20px] text-brand-700 tnum mt-1">
            {formatCurrency(fairEstimate.min)}–{formatCurrency(fairEstimate.max)}
          </p>
          <p className="text-[12.5px] text-brand-700/75 mt-1">Today’s Delhi NCR benchmark for this weight. Compare any counter offer before confirming.</p>
        </section>

        <p className="text-[12.5px] text-faint flex items-start gap-2 px-1">
          <HiOutlineInformationCircle className="text-base shrink-0 mt-px" />
          <span>
            An estimate at today's reference rate. The depot weighs and confirms the final
            amount at handover.
          </span>
        </p>
      </main>

      <div className="actionbar">
        <div className="col">
          <Button
            onClick={handleFindBuyers}
            variant="primary"
            size="lg"
            icon={HiOutlineMapPin}
            loading={saving}
          >
            {t("findBuyers") || "Find nearby recyclers"}
          </Button>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
};
