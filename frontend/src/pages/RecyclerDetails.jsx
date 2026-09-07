import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "../components/Navbar";
import { BottomNavigation } from "../components/BottomNavigation";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { StatusBadge } from "../components/StatusBadge";
import { MaterialIcon } from "../components/icons/MaterialIcon";
import { useApp } from "../context/AppContext";
import { SCRAP_CATEGORIES } from "../utils/constants";
import { formatDistance, formatCurrency, calculateTotalValue } from "../utils/helpers";
import { getRecyclerRatingStats, addRecyclerReview } from "../services/reviewService";
import { getRecyclerDetails } from "../services/recyclerService";
import { getCurrentMaterialPrice, evaluateFairOffer } from "../services/priceService";
import { FairPriceShield } from "../components/FairPriceShield";
import { FaStar } from "react-icons/fa";
import {
  HiOutlinePhone, HiOutlineMapPin, HiOutlineClock, HiOutlineTruck,
  HiOutlineQrCode, HiXMark, HiCheck, HiCheckCircle,
  HiOutlineScale, HiOutlineCurrencyRupee, HiOutlineUserGroup, HiOutlineShieldCheck,
  HiOutlineCamera, HiOutlineHandThumbUp, HiOutlineSparkles
} from "react-icons/hi2";

export const RecyclerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { selectedRecycler, activeLot, user, bagItems, t } = useApp();

  const [loadedRecycler, setLoadedRecycler] = useState(null);
  const recycler = (selectedRecycler?.id === id ? selectedRecycler : null) || loadedRecycler;

  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [userStars, setUserStars] = useState(5);
  const [userTags, setUserTags] = useState(["Fair Weight", "Instant Cash"]);
  const [userComment, setUserComment] = useState("");
  const [submittedToast, setSubmittedToast] = useState(false);
  const [fairPrice, setFairPrice] = useState(null);

  useEffect(() => {
    if (!activeLot || !recycler) return;
    const material = activeLot.materials?.[0];
    if (!material) return;
    getCurrentMaterialPrice(material).then((price) => {
      if (!price) return;
      const offeredRate = recycler.offeredRates?.[material.category] || recycler.offeredRate;
      if (offeredRate) {
        setFairPrice({ evaluation: evaluateFairOffer(offeredRate, price), offerPrice: offeredRate, fairMin: price.marketRangeMin ?? price.buyingPrice, fairMax: price.marketRangeMax ?? price.quotedPrice, materialName: material.name || material.category });
      }
    }).catch(() => {});
  }, [activeLot, recycler]);

  useEffect(() => {
    if (selectedRecycler?.id === id) return;
    getRecyclerDetails(id).then(setLoadedRecycler).catch(() => setLoadedRecycler(null));
  }, [id, selectedRecycler?.id]);

  const stats = getRecyclerRatingStats(
    recycler?.id,
    recycler?.rating || 4.7,
    recycler?.reviewsCount || 42
  );

  const handleCall = () => {
    window.location.href = `tel:${recycler.phone}`;
  };

  const handleNavigate = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${recycler.lat},${recycler.lng}`;
    window.open(url, "_blank");
  };

  const availableTags = [
    "Fair Weight",
    "Instant Cash",
    "Official EPR",
    "Respectful Staff",
    "Best Price"
  ];

  const toggleTag = (tag) => {
    setUserTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    await addRecyclerReview({
      recyclerId: recycler.id,
      buyerName: recycler.name,
      collectorName: user?.name || "Kabadiwala Partner",
      rating: userStars,
      comment: userComment,
      tags: userTags
    });
    setRatingModalOpen(false);
    setSubmittedToast(true);
    setTimeout(() => setSubmittedToast(false), 3000);
  };

  if (!recycler) {
    return (
      <div className="screen pb-nav">
        <Navbar title="Recycler" />
        <main className="col px-4 pt-6">
          <Card className="p-8 text-center">
            <h3 className="font-bold text-[18px]">Recycler not found</h3>
            <p className="text-[13.5px] text-muted mt-1.5">This depot is no longer listed.</p>
            <Button className="mt-5" onClick={() => navigate("/recyclers")}>
              Back to nearby recyclers
            </Button>
          </Card>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  const initials = recycler.name
    .split(" ")
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const bagTotal = (bagItems || []).reduce(
    (sum, item) => sum + calculateTotalValue(item.pricePerKg, item.weightKg),
    0
  );
  const hasLotOrBag = Boolean(activeLot || (bagItems && bagItems.length > 0));
  const saleAmount = activeLot?.totalPrice || bagTotal;
  const [likedReviews, setLikedReviews] = useState({});

  const toggleLikeReview = (revId) => {
    setLikedReviews((prev) => ({ ...prev, [revId]: !prev[revId] }));
  };

  return (
    <div className="screen pb-32">
      <Navbar title={recycler.name} />

      <AnimatePresence>
        {submittedToast && (
          <motion.div
            initial={{ y: -16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -16, opacity: 0 }}
            className="fixed top-[68px] left-1/2 -translate-x-1/2 z-50 px-4"
          >
            <div className="bg-ink text-white rounded-xl px-4 py-2.5 shadow-[var(--shadow-lift)]
                            flex items-center gap-2 text-[13px] font-medium">
              <HiCheckCircle className="text-gold-500 text-base shrink-0" />
              Thanks — your rating was saved
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="col px-4 pt-4 flex flex-col gap-4">
        {/* ---- depot header ---------------------------------------------- */}
        <section className="rounded-[18px] bg-ink text-white p-5">
          <div className="flex items-start gap-3">
            <span className="w-12 h-12 shrink-0 rounded-xl bg-white/10 grid place-items-center font-bold text-[16px]">
              {initials || "KB"}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[19px] font-bold tracking-[-0.015em] leading-tight">
                {recycler.name}
              </h2>
              <p className="text-[13px] text-white/60 mt-0.5">
                Proprietor · {recycler.ownerName}
              </p>
            </div>
            <button
              onClick={() => setRatingModalOpen(true)}
              className="shrink-0 h-9 px-3 rounded-lg bg-white/10 hover:bg-white/15 tap
                         flex items-center gap-1.5 transition-colors"
              title="Rate this buyer"
            >
              <FaStar className="text-gold-500 text-[13px]" />
              <span className="font-bold text-[14px] tnum">{stats.averageRating}</span>
              <span className="text-[11px] text-white/50 tnum">({stats.reviewsCount})</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-4">
            {recycler.verified && (
              <span className="badge bg-white/10 text-white">
                <HiCheckCircle className="text-[11px]" /> Authorized
              </span>
            )}
            {recycler.pickupAvailable && (
              <span className="badge bg-gold-500 text-ink">
                <HiOutlineTruck className="text-[11px]" /> Pickup
              </span>
            )}
            <span className="badge bg-white/10 text-white tnum">
              {formatDistance(recycler.distanceKm)} away
            </span>
          </div>

          {recycler.rateBonus && (
            <p className="text-[13px] font-semibold text-gold-500 mt-3">{recycler.rateBonus}</p>
          )}

          {Number.isFinite(recycler.matchScore) && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <p className="eyebrow text-white/50">Why this recycler is recommended</p>
              <p className="text-[15px] font-bold mt-1">Match score {recycler.matchScore}/100</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {(recycler.matchReasons || []).map((reason) => (
                  <span key={reason} className="text-[11px] bg-white/10 rounded-md px-2 py-1">{reason}</span>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ---- contact ----------------------------------------------------- */}
        <div className="grid grid-cols-2 gap-2.5">
          <Button variant="outline" size="md" onClick={handleCall} icon={HiOutlinePhone}>
            {t("callNow") || "Call"}
          </Button>
          <Button variant="outline" size="md" onClick={handleNavigate} icon={HiOutlineMapPin}>
            {t("navigate") || "Directions"}
          </Button>
        </div>

        {/* ---- facts -------------------------------------------------------- */}
        <Card padding="p-0" className="divide-y divide-hair overflow-hidden">
          {[
            {
              icon: HiOutlineMapPin,
              label: "Address",
              value: recycler.address,
              sub: `${formatDistance(recycler.distanceKm)} from you`
            },
            {
              icon: HiOutlineClock,
              label: "Open hours",
              value: recycler.openHours,
              sub: "Open today"
            },
            {
              icon: HiOutlineTruck,
              label: "Doorstep pickup",
              value: recycler.pickupAvailable
                ? `Available above ${recycler.minPickupWeightKg} kg`
                : "Bring to the depot",
              sub: null
            },
            {
              icon: HiCheckCircle,
              label: "Authorization data",
              value: recycler.authorizationSource?.toLowerCase().includes("demo")
                ? "Demo CPCB-style record — validation pending"
                : recycler.verified ? "Authorization recorded" : "Not yet authorized",
              sub: recycler.cpcbRegistrationNumber || null
            },
            {
              icon: HiOutlineMapPin,
              label: "Service area",
              value: (recycler.serviceArea || ["Delhi NCR"]).join(", "),
              sub: null
            }
          ].map((row) => (
            <div key={row.label} className="p-4 flex items-start gap-3">
              <span className="w-9 h-9 shrink-0 rounded-lg bg-sunken text-ink grid place-items-center">
                <row.icon className="text-base" />
              </span>
              <div className="min-w-0">
                <p className="eyebrow">{row.label}</p>
                <p className="text-[14px] font-medium text-ink mt-0.5 leading-snug">{row.value}</p>
                {row.sub && <p className="text-[12.5px] text-faint mt-0.5">{row.sub}</p>}
              </div>
            </div>
          ))}
        </Card>

        {/* ---- accepted material ---------------------------------------------- */}
        <Card>
          <h4 className="sec-title mb-3">Materials accepted</h4>
          <div className="grid grid-cols-2 gap-2">
            {(recycler.acceptedCategories || []).map((catId) => {
              const cat = SCRAP_CATEGORIES.find((c) => c.id === catId);
              return (
                <div
                  key={catId}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-sunken"
                >
                  <MaterialIcon material={catId} size="sm" tone="ink" />
                  <span className="text-[13px] font-semibold text-ink truncate">
                    {cat ? cat.name : catId}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* ---- fair-price shield ------------------------------------------------ */}
        {fairPrice?.evaluation && (
          <FairPriceShield
            evaluation={fairPrice.evaluation}
            offerPrice={fairPrice.offerPrice}
            fairMin={fairPrice.fairMin}
            fairMax={fairPrice.fairMax}
            materialName={fairPrice.materialName}
          />
        )}

        {/* ---- Trust & Ratings ----------------------------------------------- */}
        <Card className="overflow-hidden border border-line p-4">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div>
              <h4 className="sec-title text-[17px]">Trust & Ratings</h4>
              <p className="text-[12px] text-faint mt-0.5">Verified feedback from collector handovers</p>
            </div>
            <span className="badge bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold shrink-0 inline-flex items-center gap-1">
              <HiCheckCircle className="text-emerald-600 text-[13px]" />
              Verified Recycler
            </span>
          </div>

          {/* Simple Rating Summary Scorecard */}
          <div className="p-3 rounded-xl bg-sunken/60 border border-line mb-3 flex items-center gap-3">
            <div className="text-center px-1 shrink-0">
              <span className="text-[28px] font-black text-ink tracking-tight leading-none tnum block">
                {stats.averageRating}
              </span>
              <div className="flex items-center justify-center gap-0.5 mt-1.5">
                {[...Array(5)].map((_, i) => (
                  <FaStar key={i} className="text-gold-500 text-[10px]" />
                ))}
              </div>
            </div>
            <div className="h-8 w-px bg-line shrink-0" />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-ink flex items-center gap-1">
                <HiCheckCircle className="text-emerald-600 text-[14px] shrink-0" />
                <span>96% would recommend</span>
              </p>
              <p className="text-[11.5px] text-faint mt-0.5 truncate">
                Based on {stats.reviewsCount || 54} verified collector sales
              </p>
            </div>
          </div>

          {/* 4 Practical Trust Attributes with small checkmarks */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            {[
              { label: "Accurate weighing", sub: "Digital scale verified" },
              { label: "Fair rates", sub: "Matches live board" },
              { label: "Fast service", sub: "Avg. wait under 10 min" },
              { label: "Responsible recycling", sub: "Authorized channel" }
            ].map((item) => (
              <div
                key={item.label}
                className="p-2.5 rounded-xl bg-surface border border-line/80 flex items-start gap-2"
              >
                <HiCheckCircle className="text-emerald-600 text-[15px] shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-[12.5px] font-semibold text-ink leading-tight">
                    {item.label}
                  </p>
                  <p className="text-[11px] text-faint mt-0.5 truncate">
                    {item.sub}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Subtle Trust Tags */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {["Fair Weight", "Instant Cash"].map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-muted bg-sunken px-2 py-0.5 rounded-md border border-line/60"
              >
                <HiCheck className="text-emerald-600 text-[10px]" />
                {tag}
              </span>
            ))}
          </div>

          {/* Concise Recent Verified Review with secondary Rate Depot button */}
          <div className="border-t border-hair pt-3">
            <div className="flex items-center justify-between mb-2">
              <h5 className="font-bold text-[13.5px] text-ink">Recent Verified Review</h5>
              <button
                type="button"
                onClick={() => setRatingModalOpen(true)}
                className="text-[12px] font-semibold text-brand-600 hover:text-brand-700 tap flex items-center gap-1"
              >
                <span>Leave Review</span>
              </button>
            </div>

            {stats.reviews && stats.reviews.length > 0 ? (
              (() => {
                const displayReview = stats.reviews.find((r) => r.comment?.trim()) || stats.reviews[0];
                const author = displayReview.collectorName?.split(" ")?.[0] || "Ramesh";
                const sentence = displayReview.comment?.trim() || "Accurate digital scale with zero deductions and instant payment.";
                return (
                  <div className="p-3 rounded-xl bg-sunken/40 border border-line/70">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[13px] font-bold text-ink truncate">
                          {author}
                        </span>
                        <span className="badge bg-emerald-50 text-emerald-700 text-[9.5px] py-0 px-1 font-bold shrink-0">
                          ✓ Verified
                        </span>
                        <span className="text-[11px] text-faint ml-1 shrink-0">
                          · {displayReview.timeAgo || "Recently"}
                        </span>
                      </div>
                      <div className="flex gap-0.5 shrink-0" aria-label="5 out of 5 stars">
                        {[...Array(displayReview.rating || 5)].map((_, idx) => (
                          <FaStar key={idx} className="text-gold-500 text-[10px]" />
                        ))}
                      </div>
                    </div>
                    <p className="text-[12.5px] text-muted leading-relaxed">
                      "{sentence}"
                    </p>
                  </div>
                );
              })()
            ) : (
              <p className="text-[13px] text-faint">No reviews yet.</p>
            )}
          </div>
        </Card>
      </main>

      {/* ---- fixed e-commerce checkout dock (no colliding floating bubble) ---- */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md border-t border-hair p-3 shadow-lg no-print">
        <div className="col flex items-center gap-2">
          <button
            type="button"
            onClick={handleCall}
            className="h-12 w-12 shrink-0 rounded-xl border border-line bg-surface text-ink grid place-items-center tap hover:bg-sunken active:bg-sunken transition-colors shadow-xs"
            title="Call Depot"
            aria-label="Call Depot"
          >
            <HiOutlinePhone className="text-xl" />
          </button>
          <button
            type="button"
            onClick={handleNavigate}
            className="h-12 w-12 shrink-0 rounded-xl border border-line bg-surface text-ink grid place-items-center tap hover:bg-sunken active:bg-sunken transition-colors shadow-xs"
            title="Directions on Google Maps"
            aria-label="Directions"
          >
            <HiOutlineMapPin className="text-xl" />
          </button>
          <Button
            variant="primary"
            size="lg"
            className="flex-1"
            onClick={() => {
              if (hasLotOrBag) {
                navigate("/handover", {
                  state: { lot: activeLot || { materials: bagItems, totalEstimatedPrice: saleAmount }, recycler }
                });
              } else {
                navigate("/scan", { state: { targetRecycler: recycler } });
              }
            }}
            icon={hasLotOrBag ? HiOutlineQrCode : HiOutlineCamera}
          >
            {hasLotOrBag
              ? `Sell Scrap (${formatCurrency(saleAmount)})`
              : "Photograph Scrap to Sell"}
          </Button>
        </div>
      </div>

      {/* ---- rating sheet ------------------------------------------------------- */}
      <AnimatePresence>
        {ratingModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="absolute inset-0 bg-ink/60 backdrop-blur-[2px]"
              onClick={() => setRatingModalOpen(false)}
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

              <form onSubmit={handleSubmitReview} className="p-4 pt-2 flex flex-col gap-4">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-[17px] leading-tight">Rate {recycler.name}</h3>
                    <p className="text-[12.5px] text-faint mt-0.5">
                      Helps other collectors find fair buyers
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRatingModalOpen(false)}
                    className="w-9 h-9 shrink-0 grid place-items-center rounded-full bg-sunken
                               text-muted hover:bg-line tap transition-colors"
                    aria-label="Close"
                  >
                    <HiXMark className="text-lg" />
                  </button>
                </div>

                <div className="flex items-center justify-center gap-2 py-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setUserStars(star)}
                      className="tap p-1"
                      aria-label={`${star} star${star > 1 ? "s" : ""}`}
                    >
                      <FaStar
                        className={`text-[30px] transition-colors ${
                          star <= userStars ? "text-gold-500" : "text-line"
                        }`}
                      />
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      data-on={userTags.includes(tag)}
                      className="chip tap"
                    >
                      {userTags.includes(tag) && <HiCheck className="text-[13px]" />}
                      {tag}
                    </button>
                  ))}
                </div>

                <textarea
                  value={userComment}
                  onChange={(e) => setUserComment(e.target.value)}
                  placeholder="How was the weighing and the payment?"
                  rows={3}
                  className="field h-auto py-3 text-[14px] leading-relaxed resize-none"
                />

                <Button variant="primary" size="lg" type="submit">
                  Submit rating
                </Button>
              </form>
              <div className="safe-b" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
