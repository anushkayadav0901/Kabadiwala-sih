import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { BottomNavigation } from "../components/BottomNavigation";
import { Loader } from "../components/Loader";
import { Button } from "../components/Button";
import { useApp } from "../context/AppContext";
import { getAuction, openAuction, acceptAuctionBid } from "../services/lotService";
import { formatCurrency, formatWeight } from "../utils/helpers";
import {
  HiOutlineClock, HiOutlineBolt, HiCheckCircle, HiOutlineShieldCheck,
  HiOutlineExclamationTriangle, HiArrowRight, HiOutlineArrowPath, HiStar
} from "react-icons/hi2";

const POLL_MS = 5000;

const formatClock = (seconds) => {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

export const Auction = () => {
  const { lotId } = useParams();
  const navigate = useNavigate();
  const { setActiveLot, setSelectedRecycler } = useApp();

  const [auction, setAuction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [acceptingId, setAcceptingId] = useState(null);
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    try {
      setAuction(await getAuction(lotId));
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [lotId]);

  useEffect(() => { load(); }, [load]);

  // New bids arrive by polling while the auction is live.
  useEffect(() => {
    if (auction?.status !== "open") return undefined;
    const poll = window.setInterval(load, POLL_MS);
    return () => window.clearInterval(poll);
  }, [auction?.status, load]);

  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, []);

  const remaining = auction?.closesAt ? (new Date(auction.closesAt).getTime() - now) / 1000 : 0;
  const isLive = auction?.status === "open" && remaining > 0;
  const status = auction?.status === "open" && remaining <= 0 ? "closed" : auction?.status;

  const handleStart = async () => {
    setBusy(true);
    setError("");
    try {
      setAuction(await openAuction(lotId));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleAccept = async (bid) => {
    setAcceptingId(bid.recyclerId);
    setError("");
    try {
      const { lot, recycler } = await acceptAuctionBid(lotId, bid.recyclerId);
      setActiveLot(lot);
      setSelectedRecycler(recycler);
      navigate("/handover", { state: { lot, recycler } });
    } catch (err) {
      setError(err.message);
      await load();
    } finally {
      setAcceptingId(null);
    }
  };

  if (loading) {
    return (
      <div className="screen pb-nav">
        <Navbar title="Live bidding" />
        <main className="col px-4 pt-4"><Loader message="Loading bids" /></main>
        <BottomNavigation />
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="screen pb-nav">
        <Navbar title="Live bidding" />
        <main className="col px-4 pt-4">
          <div className="card p-6 text-center">
            <HiOutlineExclamationTriangle className="text-3xl text-alert-600 mx-auto" />
            <p className="text-[14px] font-semibold text-ink mt-3">Couldn't load this auction</p>
            <p className="text-[13px] text-muted mt-1">{error || "Check your connection and try again."}</p>
            <div className="mt-4">
              <Button size="sm" variant="outline" fullWidth={false} onClick={load} icon={HiOutlineArrowPath}>Try again</Button>
            </div>
          </div>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  const materialLabel = auction.materials.map((m) => m.name).filter(Boolean).join(", ") || "Scrap lot";

  return (
    <div className="screen pb-nav">
      <Navbar title="Live bidding" />

      <main className="col px-4 pt-4 flex flex-col gap-4">
        {/* ---- lot + timer ------------------------------------------------ */}
        <section className="rounded-[18px] bg-ink text-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="eyebrow text-white/50">Your lot</p>
              <h2 className="text-[17px] font-bold leading-tight mt-1 truncate">{materialLabel}</h2>
              <p className="text-[12.5px] text-white/60 tnum mt-1">
                {formatWeight(auction.totalWeight)} · fair value {formatCurrency(auction.fairRange.min)}–{formatCurrency(auction.fairRange.max)}
              </p>
            </div>
            {isLive && (
              <span className="shrink-0 text-right">
                <span className="block text-[11px] uppercase tracking-wide text-white/50">Closes in</span>
                <span className="block font-bold text-[26px] tnum leading-none mt-1">{formatClock(remaining)}</span>
              </span>
            )}
          </div>

          <div className="mt-4 flex items-center gap-2 text-[12.5px]">
            {status === "open" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-400/15 text-emerald-300 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" /> Live · recyclers are bidding
              </span>
            )}
            {status === "closed" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-white/80 font-semibold">
                <HiOutlineClock /> Bidding closed — you can still accept a bid
              </span>
            )}
            {status === "awarded" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-400/15 text-emerald-300 font-semibold">
                <HiCheckCircle /> Bid accepted
              </span>
            )}
          </div>
        </section>

        {error && (
          <p className="text-[13px] text-alert-700 bg-alert-50 border border-alert-100 rounded-xl px-3 py-2">{error}</p>
        )}

        {/* ---- not started yet -------------------------------------------- */}
        {status === "none" && (
          <div className="card p-5 flex flex-col gap-3">
            <p className="text-[14.5px] font-semibold text-ink flex items-center gap-2">
              <HiOutlineBolt className="text-brand-600" /> Let recyclers compete for this lot
            </p>
            <p className="text-[13px] text-muted leading-snug">
              Authorized recyclers nearby get 15 minutes to bid. You see every offer and choose the one you trust.
            </p>
            <Button size="lg" variant="primary" onClick={handleStart} loading={busy} icon={HiOutlineBolt}>
              Start 15-minute bidding
            </Button>
          </div>
        )}

        {/* ---- bids --------------------------------------------------------- */}
        {status !== "none" && (
          <section>
            <div className="sec-head">
              <h3 className="sec-title">{auction.bids.length} bid{auction.bids.length === 1 ? "" : "s"}</h3>
              {isLive && <span className="text-[12.5px] font-medium text-faint">Updates automatically</span>}
            </div>

            {auction.bids.length === 0 ? (
              <div className="card p-6 text-center">
                {isLive ? (
                  <>
                    <Loader message="Waiting for the first bid" />
                    <p className="text-[12.5px] text-muted mt-2">Recyclers can see your lot now.</p>
                  </>
                ) : (
                  <>
                    <p className="text-[14px] font-semibold text-ink">No bids this time</p>
                    <p className="text-[13px] text-muted mt-1">Try again, or pick a recycler yourself.</p>
                    <div className="flex gap-2 justify-center mt-4">
                      <Button size="sm" variant="primary" fullWidth={false} onClick={handleStart} loading={busy}>Bid again</Button>
                      <Button size="sm" variant="outline" fullWidth={false} onClick={() => navigate("/recyclers")}>Choose recycler</Button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {auction.bids.map((bid) => {
                  const isWinner = auction.winner?.recyclerId === bid.recyclerId;
                  return (
                    <div key={bid.recyclerId} className={`card p-4 ${bid.isBest && status !== "awarded" ? "border-emerald-300" : ""}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[14.5px] font-semibold text-ink truncate">{bid.recyclerName}</p>
                          <p className="text-[12px] text-faint mt-0.5 flex items-center gap-2 flex-wrap">
                            {bid.authorized && (
                              <span className="inline-flex items-center gap-0.5 text-emerald-700 font-semibold">
                                <HiOutlineShieldCheck /> CPCB authorized
                              </span>
                            )}
                            {bid.rating != null && (
                              <span className="inline-flex items-center gap-0.5 tnum"><HiStar className="text-gold-500" />{Number(bid.rating).toFixed(1)}</span>
                            )}
                            {bid.distanceKm != null && <span className="tnum">{bid.distanceKm} km</span>}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-[18px] tnum text-ink">{formatCurrency(bid.amount)}</p>
                          {bid.isBest && <span className="badge bg-emerald-50 text-emerald-700 mt-1">Best offer</span>}
                        </div>
                      </div>

                      {bid.belowFairRange && (
                        <p className="mt-2 text-[12px] text-amber-800 bg-amber-50 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
                          <HiOutlineExclamationTriangle className="shrink-0" />
                          Below today's fair value of {formatCurrency(auction.fairRange.min)}
                        </p>
                      )}

                      {status !== "awarded" && (
                        <div className="mt-3">
                          <Button
                            size="sm"
                            variant={bid.isBest ? "primary" : "outline"}
                            onClick={() => handleAccept(bid)}
                            loading={acceptingId === bid.recyclerId}
                            icon={HiArrowRight}
                          >
                            Accept {formatCurrency(bid.amount)}
                          </Button>
                        </div>
                      )}
                      {isWinner && (
                        <p className="mt-2 text-[12.5px] font-semibold text-emerald-700 flex items-center gap-1.5">
                          <HiCheckCircle /> You accepted this bid
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        <p className="text-[12px] text-faint px-1 pb-4 leading-snug">
          Each new bid must beat the best offer. Accepting a bid books the handover with that recycler — your signed
          Kabadi Passport and the fraud checks work exactly as usual.
        </p>
      </main>

      <BottomNavigation />
    </div>
  );
};
