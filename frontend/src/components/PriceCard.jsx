import React from "react";
import { StatusBadge } from "./StatusBadge";
import { MaterialIcon } from "./icons/MaterialIcon";
import { formatCurrency } from "../utils/helpers";
import { useApp } from "../context/AppContext";
import { HiOutlinePlus, HiOutlineSpeakerWave } from "react-icons/hi2";

/**
 * A rate row formatted for clear Indian scrap marketplace pricing.
 * Prioritizes: Material Name -> Live ₹/kg Price -> Fair Range -> Refresh Status -> Secondary Actions.
 */
export const PriceCard = ({ material, onClick, onQuickAdd }) => {
  const { language } = useApp();

  const getLocalizedName = () => {
    if (language === "hi" && material.hindiName) return material.hindiName;
    if (language === "mr" && material.marathiName) return material.marathiName;
    return material.name;
  };

  const handleBagClick = (e) => {
    e.stopPropagation();
    if (onQuickAdd) onQuickAdd(material);
  };

  const speakPrice = (e) => {
    e.stopPropagation();
    if (!("speechSynthesis" in window)) return;
    const name = getLocalizedName();
    const price = Math.round(Number(material.pricePerKg || 0));
    const range = material.marketRangeMin != null && material.marketRangeMax != null
      ? ` ${Math.round(material.marketRangeMin)} से ${Math.round(material.marketRangeMax)} रुपये प्रति किलो की सीमा में है।`
      : "";
    const text = language === "hi"
      ? `${name} का आज का भाव ${price} रुपये प्रति किलो है।${range}`
      : language === "mr"
        ? `${name} चा आजचा भाव ${price} रुपये प्रति किलो आहे.${range}`
        : `Today's rate for ${name} is ${price} rupees per kilogram.${range}`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === "hi" ? "hi-IN" : language === "mr" ? "mr-IN" : "en-IN";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  // Subtle category label
  const categoryLabel = material.mandiCategory
    ? `${material.mandiCategory}${material.mandiSubcategory ? ` · ${material.mandiSubcategory}` : ""}`
    : material.category ? material.category.replace("_", " ") : "";

  return (
    <div
      onClick={onClick}
      className="card p-3.5 flex items-start gap-3 cursor-pointer select-none tap active:bg-sunken/40 transition-colors"
    >
      <div className="pt-0.5 shrink-0">
        <MaterialIcon material={material} size="md" />
      </div>

      <div className="min-w-0 flex-1">
        {/* Material Name & Subtle Category Tag */}
        <h4 className="font-bold text-[15px] leading-snug text-ink">
          {getLocalizedName()}
        </h4>
        {categoryLabel && (
          <p className="text-[11px] text-muted leading-tight mt-0.5">
            {categoryLabel}
          </p>
        )}

        {/* Fair Price Range and Price-Status Badge */}
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          {material.marketRangeMin != null && material.marketRangeMax != null && (
            <span className="text-[11.5px] text-muted tnum font-medium">
              Fair: {formatCurrency(material.marketRangeMin)}–{formatCurrency(material.marketRangeMax)}/kg
            </span>
          )}
          <StatusBadge type={material.trend} text={material.change} />
        </div>

        {/* Spoken Rate Action - Clear & Accessible */}
        <div className="mt-1.5 flex items-center gap-2">
          <button
            type="button"
            onClick={speakPrice}
            className="inline-flex items-center gap-1 py-0.5 px-2 rounded-md bg-brand-50 hover:bg-brand-100/70 text-brand-700 text-[11px] font-semibold transition-colors tap"
            aria-label={`Listen to ${material.name} price`}
            title="Bol ke sunein (Listen rate)"
          >
            <HiOutlineSpeakerWave className="text-[12px] text-brand-600 shrink-0" />
            <span>Listen rate</span>
          </button>
        </div>
      </div>

      {/* Right Column: Prominent Price & Secondary Add Action */}
      <div className="text-right shrink-0 flex flex-col items-end justify-between self-stretch min-w-[76px]">
        <div>
          <div className="font-extrabold text-[18.5px] tnum leading-tight text-ink tracking-tight">
            {formatCurrency(material.pricePerKg)}
          </div>
          <div className="text-[11px] font-semibold text-muted leading-tight mt-0.5">
            per {material.unit || "kg"}
          </div>
        </div>

        {onQuickAdd && (
          <button
            type="button"
            onClick={handleBagClick}
            className="mt-3 inline-flex items-center gap-1 h-7 px-2.5 rounded-lg border border-line bg-surface hover:bg-sunken active:bg-sunken text-muted hover:text-ink text-[11.5px] font-semibold tap transition-colors"
            aria-label={`Add ${material.name} to bag`}
            title="Add to sell bag"
          >
            <HiOutlinePlus className="text-[12px]" />
            <span>Add</span>
          </button>
        )}
      </div>
    </div>
  );
};
