import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { registerBuyer } from "../services/authService";
import { getCurrentLocation } from "../services/locationService";
import { SCRAP_CATEGORIES } from "../utils/constants";
import { MaterialIcon } from "../components/icons/MaterialIcon";
import {
  HiOutlineEnvelope, HiOutlineLockClosed, HiOutlineMapPin, HiOutlinePhone,
  HiOutlineIdentification, HiOutlineBuildingStorefront, HiCheck,
  HiOutlineExclamationCircle
} from "react-icons/hi2";

const BUYER_CATEGORIES = SCRAP_CATEGORIES.filter((c) => c.id !== "all");

export const BuyerRegister = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    contact: "",
    registrationId: "",
    pickupAvailable: false,
    materialsAccepted: []
  });
  const [location, setLocation] = useState(null);
  const [offeredRates, setOfferedRates] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const toggleCategory = (catId) => {
    setForm((f) => ({
      ...f,
      materialsAccepted: f.materialsAccepted.includes(catId)
        ? f.materialsAccepted.filter((c) => c !== catId)
        : [...f.materialsAccepted, catId]
    }));
  };

  const handleLocation = async () => {
    const loc = await getCurrentLocation();
    setLocation(loc);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) return setError("Business name is required");
    if (!form.email.includes("@")) return setError("Valid email is required");
    if (form.password.length < 6) return setError("Password must be at least 6 characters");
    if (!form.materialsAccepted.length) return setError("Select at least one material category");

    setLoading(true);
    try {
      await registerBuyer({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        contact: form.contact || form.email,
        registrationId: form.registrationId,
        locationLat: location?.lat ?? 19.076,
        locationLng: location?.lng ?? 72.8777,
        materialsAccepted: form.materialsAccepted,
        offeredRates,
        pickupAvailable: form.pickupAvailable
      });
      navigate("/buyer/dashboard");
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen">
      <div className="col px-4 pt-8 pb-10">
        <motion.div
          initial={{ y: -8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.35 }}
          className="px-1"
        >
          <span className="w-12 h-12 rounded-2xl bg-ink text-white grid place-items-center">
            <HiOutlineBuildingStorefront className="text-2xl" />
          </span>
          <h1 className="text-[26px] font-bold tracking-[-0.02em] leading-tight mt-4">
            List your depot
          </h1>
          <p className="text-[14.5px] text-muted mt-1.5 max-w-[34ch]">
            Collectors nearby will see your rates, your hours and whether you're authorized.
          </p>
        </motion.div>

        <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-4">
          {/* ---- business ------------------------------------------------ */}
          <Card>
            <p className="eyebrow mb-3">Business</p>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Depot name"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                className="field"
              />
              <div className="relative">
                <HiOutlineEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-faint text-lg pointer-events-none" />
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="Business email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  className="field pl-11"
                />
              </div>
              <div className="relative">
                <HiOutlineLockClosed className="absolute left-4 top-1/2 -translate-y-1/2 text-faint text-lg pointer-events-none" />
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="Password — at least 6 characters"
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  className="field pl-11"
                />
              </div>
              <div className="relative">
                <HiOutlinePhone className="absolute left-4 top-1/2 -translate-y-1/2 text-faint text-lg pointer-events-none" />
                <input
                  type="tel"
                  placeholder="Contact phone — optional"
                  value={form.contact}
                  onChange={(e) => update("contact", e.target.value)}
                  className="field pl-11 tnum"
                />
              </div>
              <div className="relative">
                <HiOutlineIdentification className="absolute left-4 top-1/2 -translate-y-1/2 text-faint text-lg pointer-events-none" />
                <input
                  type="text"
                  placeholder="MPCB registration ID — optional"
                  value={form.registrationId}
                  onChange={(e) => update("registrationId", e.target.value)}
                  className="field pl-11"
                />
              </div>
            </div>
          </Card>

          {/* ---- location ------------------------------------------------- */}
          <Card>
            <p className="eyebrow mb-3">Depot location</p>
            <button
              type="button"
              onClick={handleLocation}
              className={`w-full h-[52px] px-4 rounded-xl border-[1.5px] flex items-center gap-3 tap
                transition-[background-color,border-color] duration-150 ${
                  location ? "border-brand-600 bg-brand-50" : "border-line bg-surface hover:bg-sunken"
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
                  {location ? "Location saved" : "Set GPS location"}
                </span>
                {location && (
                  <span className="block text-[12px] text-muted tnum mt-0.5">
                    {location.lat?.toFixed(4)}, {location.lng?.toFixed(4)}
                  </span>
                )}
              </span>
            </button>
          </Card>

          {/* ---- materials ------------------------------------------------- */}
          <Card>
            <p className="eyebrow mb-3">Materials you accept</p>
            <div className="grid grid-cols-2 gap-2">
              {BUYER_CATEGORIES.map((cat) => {
                const on = form.materialsAccepted.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className={`p-3 rounded-xl border-[1.5px] flex items-center gap-2.5 text-left tap
                      transition-[background-color,border-color] duration-150 ${
                        on ? "border-brand-600 bg-brand-50" : "border-line bg-surface hover:bg-sunken"
                      }`}
                  >
                    <MaterialIcon
                      material={cat.id}
                      size="sm"
                      tone={on ? "brand" : "ink"}
                    />
                    <span className="text-[13px] font-semibold text-ink truncate">{cat.name}</span>
                  </button>
                );
              })}
            </div>

            {form.materialsAccepted.length > 0 && (
              <div className="mt-4 pt-4 border-t border-hair">
                <p className="eyebrow mb-2.5">Your rate — ₹ per kg</p>
                <div className="flex flex-col gap-2">
                  {form.materialsAccepted.map((cat) => {
                    const label = BUYER_CATEGORIES.find((c) => c.id === cat)?.name || cat;
                    return (
                      <div key={cat} className="flex items-center gap-3">
                        <span className="w-28 shrink-0 text-[13px] font-semibold text-muted truncate">
                          {label}
                        </span>
                        <div className="relative flex-1">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint text-[15px] pointer-events-none">
                            ₹
                          </span>
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={offeredRates[cat] || ""}
                            onChange={(e) =>
                              setOfferedRates((r) => ({ ...r, [cat]: Number(e.target.value) }))
                            }
                            className="field h-11 pl-8 text-[15px] tnum"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>

          {/* ---- pickup ---------------------------------------------------- */}
          <Card className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[14.5px] font-semibold text-ink">Doorstep pickup</p>
              <p className="text-[12.5px] text-faint mt-0.5">
                Collect from the collector instead of them carrying it in
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.pickupAvailable}
              onClick={() => update("pickupAvailable", !form.pickupAvailable)}
              className={`w-12 h-7 shrink-0 rounded-full p-0.5 tap transition-colors ${
                form.pickupAvailable ? "bg-brand-600" : "bg-line"
              }`}
            >
              <span
                className={`block w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${
                  form.pickupAvailable ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </Card>

          {error && (
            <p className="text-[13px] font-medium text-alert-600 flex items-center gap-1.5 px-1">
              <HiOutlineExclamationCircle className="text-base shrink-0" />
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" size="lg" loading={loading}>
            Register depot
          </Button>
        </form>

        <div className="text-center mt-6 space-y-2">
          <p className="text-[14px] text-muted">
            Already registered?{" "}
            <Link to="/buyer/login" className="font-semibold text-brand-600">Log in</Link>
          </p>
          <p className="text-[14px] text-muted">
            <Link to="/signup" className="font-semibold text-brand-600">
              I'm a collector instead
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
