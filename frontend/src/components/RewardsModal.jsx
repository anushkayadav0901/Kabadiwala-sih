import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeCanvas } from "qrcode.react";
import confetti from "canvas-confetti";
import { REWARDS_CATALOG, getTokenBalance, redeemReward, getActiveVouchers } from "../services/tokenService";
import { useApp } from "../context/AppContext";
import { Button } from "./Button";
import {
  HiXMark, HiOutlineGift, HiOutlineCheckCircle, HiOutlineClock,
  HiOutlineSparkles, HiOutlineTicket, HiOutlineShieldCheck,
  HiOutlineHandRaised, HiOutlineEye, HiOutlineDevicePhoneMobile,
  HiOutlineScale, HiOutlineShoppingBag
} from "react-icons/hi2";

const renderRewardIcon = (iconType, className = "text-xl text-brand-600") => {
  switch (iconType) {
    case "gloves":
      return <HiOutlineHandRaised className={className} />;
    case "mask":
      return <HiOutlineEye className={className} />;
    case "mobile":
      return <HiOutlineDevicePhoneMobile className={className} />;
    case "scale":
      return <HiOutlineScale className={className} />;
    case "ration":
      return <HiOutlineShoppingBag className={className} />;
    default:
      return <HiOutlineGift className={className} />;
  }
};

export const RewardsModal = ({ isOpen, onClose, onBalanceChange }) => {
  const { language } = useApp();
  const [balance, setBalance] = useState(() => getTokenBalance());
  const [vouchers, setVouchers] = useState(() => getActiveVouchers());
  const [activeTab, setActiveTab] = useState("catalog"); // "catalog" | "vouchers"
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [redeemedToast, setRedeemedToast] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleRedeem = (reward) => {
    setErrorMsg("");
    try {
      const res = redeemReward(reward);
      setBalance(res.newBalance);
      setVouchers(getActiveVouchers());
      if (onBalanceChange) onBalanceChange(res.newBalance);

      // Trigger celebratory confetti
      try {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (_) {}

      setRedeemedToast(`Redeemed ${reward.name}!`);
      setTimeout(() => setRedeemedToast(""), 4000);
      setActiveTab("vouchers");
      setSelectedVoucher(getActiveVouchers()[0]);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const getLocalizedName = (item) => {
    if (language === "hi" && item.hindiName) return item.hindiName;
    if (language === "mr" && item.marathiName) return item.marathiName;
    return item.name;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-ink/65 backdrop-blur-[3px]"
        onClick={onClose}
      />

      {/* Sheet / Dialog */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        className="relative w-full max-w-[480px] max-h-[90vh] bg-surface rounded-t-[28px] sm:rounded-[28px] overflow-hidden flex flex-col shadow-[var(--shadow-sheet)]"
      >
        {/* Header */}
        <div className="bg-ink text-white p-5 pb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-10 h-10 rounded-xl bg-gold-500/20 text-gold-400 grid place-items-center">
                <HiOutlineSparkles className="text-xl" />
              </span>
              <div>
                <h3 className="font-bold text-[18px] leading-tight">
                  {language === "hi" ? "कबाड़ी रिवार्ड्स स्टोर" : language === "mr" ? "कबाडी रिवॉर्ड्स स्टोअर" : "Kabadi Rewards Store"}
                </h3>
                <p className="text-[12px] text-white/60 mt-0.5">
                  {language === "hi" ? "रीसाइक्लिंग टोकन से इनाम पाएं" : language === "mr" ? "टोकन वापरून बक्षीस मिळवा" : "Redeem tokens earned from recycling"}
                </p>
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

          {/* Balance Pill */}
          <div className="mt-4 p-3 rounded-2xl bg-white/[0.08] border border-white/10 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
                {language === "hi" ? "उपलब्ध बैलेंस" : language === "mr" ? "शिल्लक टोकन्स" : "Available Balance"}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <HiOutlineSparkles className="text-gold-400 text-lg" />
                <span className="font-extrabold text-[24px] tnum text-gold-400 leading-none">
                  {balance}
                </span>
                <span className="text-[13px] text-white/60 font-medium">Tokens</span>
              </div>
            </div>
            <span className="badge bg-gold-500/20 text-gold-300 font-bold border border-gold-500/30">
              {vouchers.length} Vouchers Active
            </span>
          </div>

          {/* Tab Selector */}
          <div className="grid grid-cols-2 gap-2 mt-3.5 bg-white/[0.06] p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("catalog")}
              className={`py-1.5 text-[13px] font-bold rounded-lg transition-colors ${
                activeTab === "catalog" ? "bg-white text-ink shadow-sm" : "text-white/70 hover:text-white"
              }`}
            >
              <HiOutlineGift className="inline text-base mr-1 -mt-0.5" />
              {language === "hi" ? "इनाम देखें" : language === "mr" ? "बक्षीस सूची" : "Rewards"}
            </button>
            <button
              onClick={() => setActiveTab("vouchers")}
              className={`py-1.5 text-[13px] font-bold rounded-lg transition-colors ${
                activeTab === "vouchers" ? "bg-white text-ink shadow-sm" : "text-white/70 hover:text-white"
              }`}
            >
              <HiOutlineTicket className="inline text-base mr-1 -mt-0.5" />
              {language === "hi" ? "मेरे कूपन" : language === "mr" ? "माझे कूपन" : `My Vouchers (${vouchers.length})`}
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-4 flex flex-col gap-3 max-h-[58vh]">
          {errorMsg && (
            <p className="p-2.5 rounded-xl bg-alert-50 text-alert-700 text-[12.5px] font-medium leading-snug">
              {errorMsg}
            </p>
          )}
          {redeemedToast && (
            <p className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 text-[12.5px] font-semibold leading-snug flex items-center gap-1.5">
              <HiOutlineCheckCircle className="text-base shrink-0" />
              {redeemedToast}
            </p>
          )}

          {activeTab === "catalog" ? (
            REWARDS_CATALOG.map((item) => {
              const canAfford = balance >= item.costTokens;
              return (
                <div
                  key={item.id}
                  className="card p-3.5 flex items-start gap-3 border border-line hover:border-brand-200 transition-colors"
                >
                  <span className="w-12 h-12 shrink-0 rounded-2xl bg-sunken grid place-items-center">
                    {renderRewardIcon(item.iconType, "text-2xl text-brand-600")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-[14.5px] text-ink leading-tight">
                        {getLocalizedName(item)}
                      </h4>
                      <span className="font-bold text-[13.5px] text-gold-700 shrink-0 tnum flex items-center gap-1">
                        <HiOutlineSparkles className="text-gold-600 text-xs" />
                        {item.costTokens}
                      </span>
                    </div>
                    <p className="text-[12px] text-muted mt-1 leading-snug">
                      {item.description}
                    </p>
                    <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-hair">
                      <span className="text-[11px] text-faint truncate">
                        Partner: {item.partner}
                      </span>
                      <Button
                        size="sm"
                        variant={canAfford ? "primary" : "outline"}
                        disabled={!canAfford}
                        onClick={() => handleRedeem(item)}
                      >
                        {canAfford ? (language === "hi" ? "रिडीम करें" : language === "mr" ? "रिडीम करा" : "Redeem") : (language === "hi" ? "कम टोकन" : "Need more")}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : vouchers.length === 0 ? (
            <div className="card p-8 text-center">
              <HiOutlineTicket className="text-4xl text-faint mx-auto mb-2" />
              <p className="font-bold text-[15px] text-ink">No vouchers yet</p>
              <p className="text-[13px] text-muted mt-1 max-w-[28ch] mx-auto">
                Recycle scrap to earn tokens, then redeem safety gloves, masks, and discounts here.
              </p>
              <Button size="sm" variant="primary" className="mt-4" onClick={() => setActiveTab("catalog")}>
                View rewards catalog
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {vouchers.map((v) => (
                <div
                  key={v.id}
                  onClick={() => setSelectedVoucher(v)}
                  className="card p-3.5 flex items-center gap-3 cursor-pointer hover:bg-sunken/40 tap transition-colors border border-line"
                >
                  <span className="w-11 h-11 shrink-0 rounded-xl bg-gold-50 text-gold-700 grid place-items-center">
                    {renderRewardIcon(v.iconType, "text-xl text-gold-700")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-[14px] text-ink truncate">{v.rewardName}</p>
                    <p className="text-[11.5px] font-mono text-brand-700 font-bold mt-0.5">{v.voucherCode}</p>
                    <p className="text-[11px] text-faint mt-0.5 flex items-center gap-1">
                      <HiOutlineClock className="text-xs" />
                      Valid until {new Date(v.validUntil).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <span className="badge bg-emerald-50 text-emerald-700 font-bold shrink-0">
                    Ready
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Voucher QR Modal Sheet if selected */}
        <AnimatePresence>
          {selectedVoucher && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-0 z-20 bg-surface flex flex-col p-5 overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <span className="badge bg-gold-50 text-gold-700 font-bold">Reward Voucher</span>
                <button
                  onClick={() => setSelectedVoucher(null)}
                  className="w-8 h-8 rounded-full bg-sunken text-ink grid place-items-center tap"
                >
                  <HiXMark className="text-lg" />
                </button>
              </div>

              <div className="p-6 flex flex-col items-center text-center mt-2">
                <span className="w-14 h-14 rounded-2xl bg-gold-50 grid place-items-center mb-2">
                  {renderRewardIcon(selectedVoucher.iconType, "text-3xl text-gold-700")}
                </span>
                <h3 className="font-bold text-[18px] text-ink">{selectedVoucher.rewardName}</h3>
                <p className="text-[12px] text-faint mt-0.5">{selectedVoucher.partner}</p>

                <div className="p-3 bg-white border border-line rounded-2xl shadow-sm mt-4">
                  <QRCodeCanvas value={`KABADIWALA-REWARD:${selectedVoucher.voucherCode}`} size={160} />
                </div>

                <div className="mt-4 p-2.5 rounded-xl bg-sunken w-full max-w-[280px]">
                  <span className="text-[11px] text-faint block uppercase tracking-wider">Coupon Code</span>
                  <span className="text-[18px] font-mono font-extrabold text-ink tracking-widest block mt-0.5 select-all">
                    {selectedVoucher.voucherCode}
                  </span>
                </div>

                <p className="text-[12px] text-muted mt-3 max-w-[28ch]">
                  Show this QR code at partner CPCB collection centers or shops to redeem.
                </p>
              </div>

              <Button
                variant="primary"
                size="md"
                className="mt-auto"
                onClick={() => setSelectedVoucher(null)}
              >
                Back to Rewards
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
