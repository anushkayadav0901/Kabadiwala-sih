import React from "react";
import { useNavigate } from "react-router-dom";
import { StatusBadge } from "./StatusBadge";
import { FaStar } from "react-icons/fa";
import { HiOutlinePhone, HiOutlineMapPin, HiChevronRight } from "react-icons/hi2";
import { formatDistance } from "../utils/helpers";
import { useApp } from "../context/AppContext";
import { getRecyclerRatingStats } from "../services/reviewService";

/**
 * Depot listing row. Follows the pattern a collector actually decides on:
 * who they are, whether they are authorised, how far, then how to reach them.
 * Distance is pinned to the header line because it is the first filter anyone
 * carrying 30kg of scrap applies.
 */
export const RecyclerCard = ({ recycler }) => {
  const navigate = useNavigate();
  const { setSelectedRecycler, t } = useApp();

  const stats = getRecyclerRatingStats(
    recycler.id,
    recycler.rating || 4.7,
    recycler.reviewsCount || 40
  );

  const handleSelect = () => {
    setSelectedRecycler(recycler);
    navigate(`/recycler/${recycler.id}`);
  };

  const handleCall = (e) => {
    e.stopPropagation();
    window.location.href = `tel:${recycler.phone}`;
  };

  const handleNavigate = (e) => {
    e.stopPropagation();
    const url = `https://www.google.com/maps/search/?api=1&query=${recycler.lat},${recycler.lng}`;
    window.open(url, "_blank");
  };

  const initials = recycler.name
    .split(" ")
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div
      onClick={handleSelect}
      className="card overflow-hidden cursor-pointer select-none tap active:bg-sunken/40 transition-colors"
    >
      <div className="p-4 flex items-start gap-3">
        <div
          className="w-11 h-11 shrink-0 rounded-xl bg-ink text-white grid place-items-center
                     font-bold text-[15px] tracking-tight"
          aria-hidden="true"
        >
          {initials || "KB"}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <h3 className="font-bold text-[15px] leading-snug text-ink flex-1 min-w-0">
              {recycler.name}
            </h3>
            <span className="shrink-0 flex items-center gap-1 text-[13px] font-bold text-ink tnum">
              <FaStar className="text-gold-500 text-[11px]" />
              {stats.averageRating}
            </span>
          </div>

          <p className="text-[12.5px] text-faint mt-0.5 flex items-center gap-1.5">
            <HiOutlineMapPin className="text-[13px] shrink-0" />
            <span className="truncate">{recycler.address}</span>
          </p>

          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
            {Number.isFinite(recycler.matchScore) && (
              <span className="badge bg-brand-600 text-white tnum">
                Best match {recycler.matchScore}/100
              </span>
            )}
            <span className="badge bg-ink text-white tnum">
              {formatDistance(recycler.distanceKm)}
            </span>
            {recycler.verified && <StatusBadge type="verified" />}
            {recycler.pickupAvailable && <StatusBadge type="pickup" />}
            {recycler.eprMatch && <StatusBadge type="epr" />}
          </div>
          {recycler.authorizationSource?.toLowerCase().includes("demo") && (
            <p className="text-[10.5px] text-faint mt-1.5">Authorization data: demo seed, validation pending</p>
          )}
        </div>
      </div>

      {recycler.rateBonus && (
        <div className="px-4 pb-3 -mt-1">
          <p className="text-[12.5px] font-semibold text-gold-700 bg-gold-50 rounded-lg px-2.5 py-1.5 inline-block">
            {recycler.rateBonus}
          </p>
        </div>
      )}

      {Array.isArray(recycler.matchReasons) && recycler.matchReasons.length > 0 && (
        <div className="px-4 pb-3 -mt-1 flex flex-wrap gap-1.5">
          {recycler.matchReasons.slice(0, 3).map((reason) => (
            <span key={reason} className="text-[11.5px] font-medium text-brand-700 bg-brand-50 rounded-md px-2 py-1">
              {reason}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-stretch border-t border-hair divide-x divide-hair">
        <button
          onClick={handleCall}
          className="flex-1 h-11 flex items-center justify-center gap-2 text-[13.5px] font-semibold
                     text-ink hover:bg-sunken active:bg-sunken tap transition-colors"
        >
          <HiOutlinePhone className="text-base" />
          {t("callNow") || "Call"}
        </button>
        <button
          onClick={handleNavigate}
          className="flex-1 h-11 flex items-center justify-center gap-2 text-[13.5px] font-semibold
                     text-ink hover:bg-sunken active:bg-sunken tap transition-colors"
        >
          <HiOutlineMapPin className="text-base" />
          {t("navigate") || "Directions"}
        </button>
        <div className="w-11 grid place-items-center text-faint">
          <HiChevronRight className="text-lg" />
        </div>
      </div>
    </div>
  );
};
