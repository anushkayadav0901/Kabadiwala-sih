import React, { useState } from "react";
import { motion } from "framer-motion";
import { FaStar } from "react-icons/fa";
import { addRecyclerReview } from "../services/reviewService";
import { awardTokens } from "../services/tokenService";
import { useApp } from "../context/AppContext";
import { Button } from "./Button";
import {
  HiXMark, HiCheckCircle, HiOutlineSparkles, HiStar,
  HiOutlineScale, HiOutlineCurrencyRupee, HiOutlineClock,
  HiOutlineUserGroup, HiOutlineShieldCheck
} from "react-icons/hi2";

export const RatingModal = ({ isOpen, onClose, recycler, lot, onReviewSubmitted }) => {
  const { user, language } = useApp();

  const [criteria, setCriteria] = useState({
    weighingAccuracy: 5,
    fairPricing: 5,
    speedPunctuality: 5,
    staffBehaviour: 5,
    ecoSafety: 5
  });

  const [selectedTags, setSelectedTags] = useState(["Fair Digital Scale", "Instant Cash"]);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen || !recycler) return null;

  const criteriaList = [
    {
      key: "weighingAccuracy",
      label: "Weighing Accuracy",
      hindiLabel: "सही डिजिटल तौल",
      marathiLabel: "अचूक डिजिटल वजन",
      icon: HiOutlineScale,
      help: "Certified digital scale without cuts"
    },
    {
      key: "fairPricing",
      label: "Fair Pricing",
      hindiLabel: "पूरा सही भाव",
      marathiLabel: "योग्य व पूर्ण भाव",
      icon: HiOutlineCurrencyRupee,
      help: "Agreed guide price without surprise deductions"
    },
    {
      key: "speedPunctuality",
      label: "Turnaround Speed",
      hindiLabel: "तेजी और समय की बचत",
      marathiLabel: "जलद सेवा",
      icon: HiOutlineClock,
      help: "Fast unloading without long queues"
    },
    {
      key: "staffBehaviour",
      label: "Staff Respect",
      hindiLabel: "सम्मानजनक व्यवहार",
      marathiLabel: "आदरयुक्त वागणूक",
      icon: HiOutlineUserGroup,
      help: "Polite, fair, and dignified treatment"
    },
    {
      key: "ecoSafety",
      label: "Safe Handling & EPR",
      hindiLabel: "सुरक्षित पर्यावरण निपटान",
      marathiLabel: "सुरक्षित विल्हेवाट",
      icon: HiOutlineShieldCheck,
      help: "Safe battery and chemical handling"
    }
  ];

  const availableTags = [
    "Fair Digital Scale",
    "Instant Cash",
    "Respectful Staff",
    "No Arbitrary Cuts",
    "Clean Yard",
    "Official EPR Stamped"
  ];

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleStarChange = (key, value) => {
    setCriteria((prev) => ({ ...prev, [key]: value }));
  };

  const overallScore = Math.round(
    Object.values(criteria).reduce((a, b) => a + b, 0) / Object.keys(criteria).length
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const review = await addRecyclerReview({
        recyclerId: recycler.id || recycler._id || "rec_1",
        buyerName: recycler.name || "Authorized Depot",
        collectorName: user?.name || "Kabadiwala Partner",
        rating: overallScore,
        criteria,
        comment,
        tags: selectedTags
      });

      // Bonus tokens for leaving an honest rating!
      awardTokens(20, "Recycler Rating Bonus", { recyclerId: recycler.id });

      setSubmitted(true);
      if (onReviewSubmitted) onReviewSubmitted(review);
      setTimeout(() => {
        onClose();
        setSubmitted(false);
      }, 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-ink/65 backdrop-blur-[3px]"
        onClick={onClose}
      />

      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        className="relative w-full max-w-[480px] max-h-[92vh] bg-surface rounded-t-[28px] sm:rounded-[28px] overflow-hidden flex flex-col shadow-[var(--shadow-sheet)]"
      >
        {/* Header */}
        <div className="bg-ink text-white p-5 pb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-10 h-10 rounded-xl bg-gold-500/20 text-gold-400 grid place-items-center text-xl">
                <HiStar className="text-xl text-gold-400" />
              </span>
              <div className="min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-white/50 block">
                  {language === "hi" ? "कैब-स्टाइल रीसाइक्लर रेटिंग" : "Rate Recycler Depot"}
                </span>
                <h3 className="font-bold text-[17px] leading-tight truncate">
                  {recycler.name || "Authorized Depot"}
                </h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 text-white/80 grid place-items-center hover:bg-white/20 tap"
              aria-label="Close"
            >
              <HiXMark className="text-lg" />
            </button>
          </div>

          <p className="text-[12px] text-white/60 mt-2 flex items-center gap-1.5">
            <HiOutlineSparkles className="text-gold-400 shrink-0" />
            {language === "hi" ? "सच्ची रेटिंग देने पर +20 कबाड़ी टोकन पाएं" : "Earn +20 Kabadi Tokens for honest feedback"}
          </p>
        </div>

        {/* Form Body */}
        <div className="overflow-y-auto p-4 flex flex-col gap-4 max-h-[62vh]">
          {submitted ? (
            <div className="p-8 text-center flex flex-col items-center">
              <span className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 grid place-items-center text-3xl mb-3">
                <HiCheckCircle />
              </span>
              <h4 className="font-bold text-[18px] text-ink">Rating Submitted!</h4>
              <p className="text-[13px] text-muted mt-1 max-w-[28ch]">
                Thank you! Your feedback helps all collectors get honest weights and fair prices.
              </p>
              <span className="badge bg-gold-50 text-gold-700 font-bold mt-4 flex items-center gap-1.5">
                <HiOutlineSparkles className="text-gold-600 text-sm" />
                +20 Kabadi Tokens Awarded
              </span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* 5-Criterion Interactive Star Rating */}
              <div className="card p-3.5 divide-y divide-hair bg-sunken/40">
                {criteriaList.map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <div key={item.key} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-[13.5px] text-ink flex items-center gap-1.5">
                          <IconComponent className="text-brand-600 text-base shrink-0" />
                          <span>{language === "hi" ? item.hindiLabel : language === "mr" ? item.marathiLabel : item.label}</span>
                        </p>
                        <p className="text-[11px] text-faint mt-0.5 truncate">{item.help}</p>
                      </div>

                      {/* Star row */}
                      <div className="flex items-center gap-1 shrink-0">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => handleStarChange(item.key, star)}
                            className="p-1 tap transition-transform active:scale-125"
                            aria-label={`${star} stars`}
                          >
                            <FaStar
                              className={`text-base ${
                                star <= criteria[item.key] ? "text-gold-500" : "text-line"
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quick Tags */}
              <div>
                <p className="text-[12px] font-bold text-muted uppercase tracking-wider mb-2">
                  {language === "hi" ? "मुख्य खूबियां चुनें" : "Select Highlights"}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {availableTags.map((tag) => {
                    const active = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`h-8 px-2.5 rounded-lg text-[12px] font-semibold transition-colors tap ${
                          active
                            ? "bg-brand-600 text-white shadow-sm"
                            : "bg-surface border border-line text-muted hover:bg-sunken"
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Comment Box */}
              <div>
                <textarea
                  rows={2}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={language === "hi" ? "कोई टिप्पणी या अनुभव लिखें (वैकल्पिक)..." : "Write a brief comment (optional)..."}
                  className="field text-[13.5px] w-full resize-none p-3"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={submitting}
                icon={HiCheckCircle}
              >
                {language === "hi" ? "रेटिंग जमा करें (+20 टोकन)" : "Submit Rating (+20 Tokens)"}
              </Button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};
