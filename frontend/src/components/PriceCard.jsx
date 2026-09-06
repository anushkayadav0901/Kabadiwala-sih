import React from "react";
import { StatusBadge } from "./StatusBadge";
import { MaterialIcon } from "./icons/MaterialIcon";
import { formatCurrency } from "../utils/helpers";
import { useApp } from "../context/AppContext";
import { HiOutlinePlus, HiOutlineSpeakerWave } from "react-icons/hi2";

/**
 * A rate row. The number is the reason anyone opens this screen, so it gets
 * the largest type on the row and sits hard right where the eye lands after
 * the name. Add-to-bag is a separate target so tapping the row itself still
 * opens the calculator.
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
      ? `${name} का आज का गाइड रेट ${price} रुपये प्रति किलो है।${range}`
      : language === "mr"
        ? `${name} चा आजचा मार्गदर्शक दर ${price} रुपये प्रति किलो आहे.${range}`
        : `Today's guide rate for ${name} is ${price} rupees per kilogram.${range}`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === "hi" ? "hi-IN" : language === "mr" ? "mr-IN" : "en-IN";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div
      onClick={onClick}
      className="card p-3.5 flex items-center gap-3 cursor-pointer select-none tap
                 active:bg-sunken/50 transition-colors"
    >
      <MaterialIcon material={material} size="md" />

      <div className="min-w-0 flex-1">
        {/* Material names are long and translated — let them run to two lines
            rather than clipping the word that identifies the material. */}
        <h4 className="font-semibold text-[15px] leading-snug text-ink line-clamp-2">
          {getLocalizedName()}
        </h4>
        <div className="flex items-center gap-1.5 mt-1">
          <StatusBadge type={material.trend} text={material.change} />
        </div>
        {material.marketRangeMin != null && material.marketRangeMax != null && (
          <p className="text-[11.5px] text-faint tnum mt-1">
            Fair range: {formatCurrency(material.marketRangeMin)}–{formatCurrency(material.marketRangeMax)}/kg
          </p>
        )}
      </div>

      <div className="text-right shrink-0">
        <div className="font-bold text-[17px] tnum leading-tight text-ink">
          {formatCurrency(material.pricePerKg)}
        </div>
        <div className="text-[11px] font-medium text-faint leading-tight">
          per {material.unit || "kg"}
        </div>
      </div>

      <button
        type="button"
        onClick={speakPrice}
        className="w-9 h-9 shrink-0 rounded-lg grid place-items-center border border-line text-brand-600 hover:bg-brand-50 tap"
        aria-label={`Speak the ${material.name} price`}
        title="Bol ke batao"
      >
        <HiOutlineSpeakerWave className="text-lg" />
      </button>

      {onQuickAdd && (
        <button
          type="button"
          onClick={handleBagClick}
          className="w-9 h-9 shrink-0 rounded-lg grid place-items-center border border-line
                     text-brand-600 hover:bg-brand-50 active:bg-brand-100 tap transition-colors"
          aria-label={`Add ${material.name} to bag`}
        >
          <HiOutlinePlus className="text-lg" />
        </button>
      )}
    </div>
  );
};
