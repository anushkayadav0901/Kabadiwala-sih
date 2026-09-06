import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "../components/Button";
import { OTPInput } from "../components/OTPInput";
import { verifyOTP, resendOTP, getDemoPin } from "../services/authService";
import { useApp } from "../context/AppContext";
import { OTP_EXPIRY_SECONDS, DEFAULT_COUNTRY_CODE } from "../utils/constants";
import { HiOutlineDevicePhoneMobile, HiOutlineExclamationCircle, HiOutlineKey } from "react-icons/hi2";

export const OTPVerification = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { setUser, t } = useApp();

  const phone = location.state?.phone || "9876543210";
  const [demoPin, setDemoPin] = useState(
    location.state?.demoPin || getDemoPin()
  );
  const isNewUser = location.state?.isNewUser;
  const [otpCode, setOtpCode] = useState("");
  const [timer, setTimer] = useState(OTP_EXPIRY_SECONDS);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const countdown = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(countdown);
  }, []);

  const handleVerify = async () => {
    setError("");
    if (otpCode.length !== 6) {
      setError("Please enter the full 6-digit code");
      return;
    }

    setLoading(true);
    try {
      const res = await verifyOTP(otpCode, phone);
      setUser(res.user);
      navigate(isNewUser ? "/dashboard" : "/dashboard");
    } catch (err) {
      setError(err.message || "Invalid code");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      const res = await resendOTP(phone);
      setDemoPin(res.demoPin || getDemoPin());
      setTimer(OTP_EXPIRY_SECONDS);
      setOtpCode("");
    } catch (err) {
      setError(err.message || "Could not resend the verification code");
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
          <span className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 grid place-items-center">
            <HiOutlineDevicePhoneMobile className="text-2xl" />
          </span>
          <h1 className="text-[26px] font-bold tracking-[-0.02em] leading-tight mt-5">
            {t("verifyOTP") || "Verify your number"}
          </h1>
          <p className="text-[14.5px] text-muted mt-1.5">
            6-digit code for{" "}
            <span className="font-semibold text-ink tnum whitespace-nowrap">
              {DEFAULT_COUNTRY_CODE} {phone}
            </span>
          </p>
        </motion.div>

        <div className="mt-8">
          <OTPInput length={6} onChangeOTP={(val) => setOtpCode(val)} />

          {error && (
            <p className="text-[13px] font-medium text-alert-600 mt-3 flex items-center justify-center gap-1.5">
              <HiOutlineExclamationCircle className="text-base shrink-0" />
              {error}
            </p>
          )}

          <div className="text-center mt-5">
            {timer > 0 ? (
              <p className="text-[13px] text-faint">
                Resend in <span className="font-semibold text-ink tnum">{timer}s</span>
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                className="text-[13.5px] font-semibold text-brand-600 tap"
              >
                {t("resendOTP") || "Send a new code"}
              </button>
            )}
          </div>
        </div>

        <div className="mt-7">
          <Button
            onClick={handleVerify}
            variant="primary"
            size="lg"
            loading={loading}
            disabled={otpCode.length !== 6}
          >
            {t("verifyOTP") || "Verify and continue"}
          </Button>
        </div>

        {demoPin && (
          <div className="mt-6 card p-4 flex items-start gap-3 border-gold-100 bg-gold-50">
            <span className="w-9 h-9 shrink-0 rounded-lg bg-gold-500 text-ink grid place-items-center">
              <HiOutlineKey className="text-lg" />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-gold-700">
                No SMS provider is connected yet
              </p>
              <p className="text-[13px] text-gold-700/85 mt-0.5">
                Use this code:{" "}
                <span className="font-bold text-[15px] tracking-[0.18em] tnum text-ink">
                  {demoPin}
                </span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
