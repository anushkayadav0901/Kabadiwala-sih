import React from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { BottomNavigation } from "../components/BottomNavigation";
import { Button } from "../components/Button";
import { MaterialIcon } from "../components/icons/MaterialIcon";
import { EmptySackIllustration } from "../components/icons/Illustrations";
import { useApp } from "../context/AppContext";
import { calculateTotalValue, formatCurrency, formatWeight } from "../utils/helpers";
import {
  HiMinus, HiPlus, HiOutlineTrash, HiOutlineCamera, HiArrowRight, HiOutlineTag
} from "react-icons/hi2";

export const Bag = () => {
  const navigate = useNavigate();
  const { bagItems, updateBagItem, removeFromBag, clearBag } = useApp();

  const totalWeight = bagItems.reduce((sum, item) => sum + Number(item.weightKg || 0), 0);
  const totalValue = bagItems.reduce(
    (sum, item) => sum + calculateTotalValue(item.pricePerKg, item.weightKg),
    0
  );

  const adjustWeight = (item, amount) => {
    updateBagItem(item.bagId, {
      weightKg: Math.max(0.1, Number((Number(item.weightKg || 0) + amount).toFixed(2)))
    });
  };

  return (
    <div className={`screen ${bagItems.length ? "pb-bar" : "pb-nav"}`}>
      <Navbar title="My scrap bag" />

      <main className="col px-4 pt-4 flex flex-col gap-3">
        {bagItems.length === 0 ? (
          <div className="card p-8 text-center mt-6">
            <EmptySackIllustration className="w-32 h-28 mx-auto" />
            <h2 className="font-bold text-[19px] tracking-[-0.01em] mt-4">Your bag is empty</h2>
            <p className="text-[13.5px] text-muted mt-1.5 max-w-[30ch] mx-auto leading-snug">
              Add what you collected. Selling a full bag at once gets you a better rate than
              one item at a time.
            </p>
            <div className="flex flex-col gap-2.5 mt-6">
              <Button size="md" onClick={() => navigate("/scan")} icon={HiOutlineCamera}>
                Scan a material
              </Button>
              <Button
                size="md"
                variant="outline"
                onClick={() => navigate("/prices")}
                icon={HiOutlineTag}
              >
                Pick from the rate board
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h2 className="sec-title">
                {bagItems.length} {bagItems.length === 1 ? "item" : "items"}
              </h2>
              <button
                onClick={clearBag}
                className="text-[13px] font-semibold text-alert-600 h-8 px-3 rounded-lg
                           hover:bg-alert-50 active:bg-alert-50 tap transition-colors"
              >
                Clear all
              </button>
            </div>

            <div className="flex flex-col gap-2.5">
              {bagItems.map((item) => {
                const subtotal = calculateTotalValue(item.pricePerKg, item.weightKg);
                return (
                  <div key={item.bagId} className="card overflow-hidden">
                    <div className="p-3.5 flex items-start gap-3">
                      {item.imagePreview ? (
                        <img
                          src={item.imagePreview}
                          alt={item.name}
                          className="w-12 h-12 shrink-0 rounded-xl object-cover bg-ink"
                        />
                      ) : (
                        <MaterialIcon material={item} size="md" />
                      )}

                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-[14.5px] leading-snug text-ink">
                          {item.name}
                        </h3>
                        <p className="text-[12.5px] text-faint mt-0.5 tnum">
                          {formatCurrency(item.pricePerKg)} per kg
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="block font-bold text-[16px] tnum">
                          {formatCurrency(subtotal)}
                        </span>
                      </div>
                    </div>

                    <div className="px-3.5 pb-3 flex items-center gap-2">
                      <div className="flex items-center rounded-lg border border-line overflow-hidden">
                        <button
                          onClick={() => adjustWeight(item, -0.5)}
                          className="w-9 h-9 grid place-items-center text-ink hover:bg-sunken
                                     active:bg-sunken tap transition-colors"
                          aria-label={`Reduce ${item.name} by half a kilo`}
                        >
                          <HiMinus className="text-sm" />
                        </button>
                        <span className="w-[68px] text-center font-bold text-[14px] tnum">
                          {Number(item.weightKg).toFixed(2)} kg
                        </span>
                        <button
                          onClick={() => adjustWeight(item, 0.5)}
                          className="w-9 h-9 grid place-items-center text-ink hover:bg-sunken
                                     active:bg-sunken tap transition-colors"
                          aria-label={`Add half a kilo to ${item.name}`}
                        >
                          <HiPlus className="text-sm" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromBag(item.bagId)}
                        className="ml-auto w-9 h-9 grid place-items-center rounded-lg text-faint
                                   hover:bg-alert-50 hover:text-alert-600 active:bg-alert-50
                                   tap transition-colors"
                        aria-label={`Remove ${item.name}`}
                      >
                        <HiOutlineTrash className="text-base" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => navigate("/scan")}
              className="card p-3.5 flex items-center justify-center gap-2 text-[14px]
                         font-semibold text-brand-600 tap active:bg-sunken/50 transition-colors"
            >
              <HiOutlineCamera className="text-lg" />
              Scan another item
            </button>
          </>
        )}
      </main>

      {bagItems.length > 0 && (
        <div className="actionbar">
          <div className="col">
            <div className="card p-3.5 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="eyebrow">Total · {formatWeight(totalWeight)}</p>
                <p className="font-bold text-[22px] tnum leading-tight mt-0.5">
                  {formatCurrency(totalValue)}
                </p>
              </div>
              <Button
                fullWidth={false}
                size="lg"
                variant="primary"
                icon={HiArrowRight}
                onClick={() => navigate("/estimated-value", { state: { bagItems } })}
                className="shrink-0 px-6"
              >
                Sell bag
              </Button>
            </div>
          </div>
        </div>
      )}

      <BottomNavigation />
    </div>
  );
};
