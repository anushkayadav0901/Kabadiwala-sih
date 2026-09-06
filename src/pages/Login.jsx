import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "../components/Button";
import { validatePhoneNumber } from "../utils/helpers";
import { sendOTP } from "../services/authService";
import { useApp } from "../context/AppContext";
import { DEFAULT_COUNTRY_CODE } from "../utils/constants";
import { BrandMark } from "../components/icons/Illustrations";
import { HiArrowRight, HiOutlineExclamationCircle } from "react-icons/hi2";

export const Login = () => {
  const navigate = useNavigate();
  const { t } = useApp();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!validatePhoneNumber(phone)) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }

    setLoading(true);
    try {
      const res = await sendOTP(phone);
      navigate("/otp", { state: { phone, demoPin: res.demoPin } });
    } catch (err) {
      setError(err.message || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen flex flex-col">
      <div className="col flex-1 px-5 pt-14 pb-6">
        <motion.div
          initial={{ y: -8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.35 }}
        >
          <BrandMark variant="full" className="w-[150px] h-auto -ml-1" />
          <h1 className="text-[28px] font-bold tracking-[-0.02em] leading-tight mt-5">
            {t("login") || "Log in"}
          </h1>
          <p className="text-[15px] text-muted mt-1.5 max-w-[30ch]">
            Enter your mobile number to see today's rates and start selling.
          </p>
        </motion.div>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <div>
            <label htmlFor="phone" className="eyebrow block mb-2">
              {t("enterPhone") || "Mobile number"}
            </label>
            <div className="relative flex items-center">
              <span
                className="absolute left-4 text-[16px] font-semibold text-muted
                           pr-3 border-r border-line pointer-events-none tnum"
              >
                {DEFAULT_COUNTRY_CODE}
              </span>
              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder={t("phonePlaceholder") || "98765 43210"}
                value={phone}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setPhone(cleaned);
                  if (error) setError("");
                }}
                className={`field pl-[76px] tracking-wide tnum ${
                  error ? "border-alert-500" : ""
                }`}
                autoFocus
              />
            </div>
            {error && (
              <p className="text-[13px] font-medium text-alert-600 mt-2 flex items-center gap-1.5">
                <HiOutlineExclamationCircle className="text-base shrink-0" />
                {error}
              </p>
            )}
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            disabled={phone.length !== 10}
            icon={HiArrowRight}
          >
            {t("sendOTP") || "Continue"}
          </Button>
        </form>

        <div className="mt-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-line" />
          <span className="eyebrow">or</span>
          <span className="h-px flex-1 bg-line" />
        </div>

        <Link
          to="/buyer/login"
          className="mt-6 card p-4 flex items-center gap-3 tap active:bg-sunken/50 transition-colors"
        >
          <span className="w-10 h-10 shrink-0 rounded-xl bg-ink text-white grid place-items-center font-bold text-[13px]">
            KB
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-[14.5px] text-ink">I run a scrap depot</span>
            <span className="block text-[12.5px] text-faint">Open the recycler portal</span>
          </span>
          <HiArrowRight className="text-muted shrink-0" />
        </Link>
      </div>

      <div className="col px-5 pb-8 safe-b text-center">
        <p className="text-[14px] text-muted">
          New collector?{" "}
          <Link to="/signup" className="font-semibold text-brand-600">
            Create an account
          </Link>
        </p>
        <p className="text-[12px] text-faint mt-3 leading-relaxed max-w-[34ch] mx-auto">
          By continuing you agree to the Kabadiwala Connect terms and safety protocols.
        </p>
      </div>
    </div>
  );
};
