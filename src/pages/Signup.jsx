import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "../components/Button";
import { LanguageSelector } from "../components/LanguageSelector";
import { validatePhoneNumber } from "../utils/helpers";
import { registerCollector } from "../services/authService";
import { getCurrentLocation } from "../services/locationService";
import { useApp } from "../context/AppContext";
import { DEFAULT_COUNTRY_CODE } from "../utils/constants";
import { BrandMark } from "../components/icons/Illustrations";
import {
  HiOutlineUser, HiOutlineMapPin, HiArrowRight,
  HiOutlineExclamationCircle, HiCheck
} from "react-icons/hi2";

export const Signup = () => {
  const navigate = useNavigate();
  const { changeLanguage, language, t } = useApp();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const [locating, setLocating] = useState(false);

  const handleUseLocation = async () => {
    setLocating(true);
    try {
      const loc = await getCurrentLocation();
      setLocation(loc);
    } finally {
      setLocating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim() || name.trim().length < 2) {
      setError("Please enter your full name");
      return;
    }
    if (!validatePhoneNumber(phone)) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }

    setLoading(true);
    try {
      const res = await registerCollector({
        name: name.trim(),
        phone,
        preferredLanguage: language,
        locationLat: location?.lat ?? null,
        locationLng: location?.lng ?? null
      });
      navigate("/otp", {
        state: { phone, isNewUser: true, demoPin: res.demoPin, name: name.trim() }
      });
    } catch (err) {
      setError(err.message || "Sign up failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen flex flex-col">
      <div className="col flex-1 px-5 pt-10 pb-6">
        <motion.div
          initial={{ y: -8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.35 }}
        >
          <BrandMark className="w-12 h-12" />
          <h1 className="text-[26px] font-bold tracking-[-0.02em] leading-tight mt-4">
            Create your account
          </h1>
          <p className="text-[14.5px] text-muted mt-1.5 max-w-[32ch]">
            Only what's needed to price your scrap and record a handover.
          </p>
        </motion.div>

        <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-5">
          <div>
            <label htmlFor="name" className="eyebrow block mb-2">Full name</label>
            <div className="relative">
              <HiOutlineUser className="absolute left-4 top-1/2 -translate-y-1/2 text-faint text-lg pointer-events-none" />
              <input
                id="name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ramesh Kumar"
                className="field pl-11"
              />
            </div>
          </div>

          <div>
            <label htmlFor="su-phone" className="eyebrow block mb-2">
              {t("enterPhone") || "Mobile number"}
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-4 text-[16px] font-semibold text-muted pr-3 border-r border-line pointer-events-none tnum">
                {DEFAULT_COUNTRY_CODE}
              </span>
              <input
                id="su-phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder={t("phonePlaceholder") || "98765 43210"}
                className="field pl-[76px] tracking-wide tnum"
              />
            </div>
          </div>

          <div>
            <span className="eyebrow block mb-2">
              {t("selectLanguage") || "Preferred language"}
            </span>
            <LanguageSelector
              selectedLanguage={language}
              onSelect={(langId) => changeLanguage(langId)}
              compact
            />
          </div>

          <div>
            <span className="eyebrow block mb-2">Your area — optional</span>
            <button
              type="button"
              onClick={handleUseLocation}
              disabled={locating}
              className={`w-full h-[52px] px-4 rounded-xl border-[1.5px] flex items-center gap-3 tap
                transition-[background-color,border-color] duration-150 disabled:opacity-60 ${
                  location
                    ? "border-brand-600 bg-brand-50"
                    : "border-line bg-surface hover:bg-sunken"
                }`}
            >
              <span
                className={`w-8 h-8 shrink-0 rounded-lg grid place-items-center ${
                  location ? "bg-brand-600 text-white" : "bg-sunken text-muted"
                }`}
              >
                {location ? <HiCheck className="text-base" /> : <HiOutlineMapPin className="text-base" />}
              </span>
              <span className="min-w-0 flex-1 text-left">
                <span className="block text-[14.5px] font-semibold text-ink">
                  {locating ? "Finding you…" : location ? "Location saved" : "Use my GPS location"}
                </span>
                {location && (
                  <span className="block text-[12px] text-muted tnum mt-0.5">
                    {location.lat?.toFixed(4)}, {location.lng?.toFixed(4)}
                  </span>
                )}
              </span>
            </button>
            <p className="text-[12px] text-faint mt-2">
              Helps rank the nearest authorized recyclers. You can skip this.
            </p>
          </div>

          {error && (
            <p className="text-[13px] font-medium text-alert-600 flex items-center gap-1.5">
              <HiOutlineExclamationCircle className="text-base shrink-0" />
              {error}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            disabled={!name.trim() || phone.length !== 10}
            icon={HiArrowRight}
          >
            Send verification code
          </Button>
        </form>
      </div>

      <div className="col px-5 pb-8 safe-b text-center space-y-2">
        <p className="text-[14px] text-muted">
          Already registered?{" "}
          <Link to="/login" className="font-semibold text-brand-600">Log in</Link>
        </p>
        <p className="text-[14px] text-muted">
          Run a depot?{" "}
          <Link to="/buyer/register" className="font-semibold text-brand-600">
            Register as a buyer
          </Link>
        </p>
      </div>
    </div>
  );
};
