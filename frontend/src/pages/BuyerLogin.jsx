import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "../components/Button";
import { loginBuyer } from "../services/authService";
import { DepotIllustration } from "../components/icons/Illustrations";
import {
  HiOutlineEnvelope, HiOutlineLockClosed, HiArrowRight, HiOutlineExclamationCircle
} from "react-icons/hi2";

export const BuyerLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await loginBuyer(email.trim(), password);
      navigate("/buyer/dashboard");
    } catch (err) {
      setError(err.message || "Login failed");
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
          className="text-center"
        >
          <DepotIllustration className="w-44 h-32 mx-auto" />
          <h1 className="text-[26px] font-bold tracking-[-0.02em] leading-tight mt-3">
            Recycler portal
          </h1>
          <p className="text-[14.5px] text-muted mt-1.5 max-w-[32ch] mx-auto">
            Sign in to verify handovers and issue EPR certificates.
          </p>
        </motion.div>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <div>
            <label htmlFor="b-email" className="eyebrow block mb-2">Business email</label>
            <div className="relative">
              <HiOutlineEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-faint text-lg pointer-events-none" />
              <input
                id="b-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="depot@example.com"
                className="field pl-11"
              />
            </div>
          </div>

          <div>
            <label htmlFor="b-pass" className="eyebrow block mb-2">Password</label>
            <div className="relative">
              <HiOutlineLockClosed className="absolute left-4 top-1/2 -translate-y-1/2 text-faint text-lg pointer-events-none" />
              <input
                id="b-pass"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                className="field pl-11"
              />
            </div>
          </div>

          {error && (
            <p className="text-[13px] font-medium text-alert-600 flex items-center gap-1.5">
              <HiOutlineExclamationCircle className="text-base shrink-0" />
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" size="lg" loading={loading} icon={HiArrowRight}>
            Log in
          </Button>
        </form>
      </div>

      <div className="col px-5 pb-8 safe-b text-center space-y-2">
        <p className="text-[14px] text-muted">
          New depot?{" "}
          <Link to="/buyer/register" className="font-semibold text-brand-600">Register</Link>
        </p>
        <p className="text-[14px] text-muted">
          <Link to="/login" className="font-semibold text-brand-600">
            I'm a collector instead
          </Link>
        </p>
      </div>
    </div>
  );
};
