// ---------------------------------------------------------------------------
// LIVE BIDDING ("reverse auction") ON A LOT
//
// A collector opens a lot for 15 minutes. Authorized recyclers bid a total
// price; each new bid must beat the current best. The collector can accept any
// bid, which matches the lot to that recycler exactly like a normal match.
//
// Every write is a single conditional update, so two recyclers bidding at the
// same moment cannot overwrite each other and nobody can bid after the lot is
// awarded or the timer runs out.
// ---------------------------------------------------------------------------
import Lot from "../models/Lot.js";

export const AUCTION_MINUTES = 15;
export const MIN_INCREMENT = 10; // ₹ a new bid must add over the current best

export class AuctionError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** "none" | "open" | "closed" | "awarded" — "closed" means the timer ran out without an award. */
export const auctionState = (lot, now = new Date()) => {
  const status = lot?.auction?.status || "none";
  if (status === "open" && lot.auction.closesAt && now >= lot.auction.closesAt) return "closed";
  return status;
};

/** Fair value of the whole lot, from each material's market range. */
export const fairRangeFor = (lot) => {
  let min = 0;
  let max = 0;
  for (const m of lot.materials || []) {
    const weight = Number(m.weightKg || 0);
    const rate = Number(m.pricePerKg || 0);
    min += weight * Number(m.marketRangeMin ?? rate);
    max += weight * Number(m.marketRangeMax ?? rate);
  }
  if (!min && !max) {
    const value = Number(lot.estimatedValue || 0);
    return { min: Math.round(value * 0.9), max: Math.round(value * 1.1) };
  }
  return { min: Math.round(min), max: Math.round(max) };
};

const secondsLeft = (lot, now) => {
  if (auctionState(lot, now) !== "open") return 0;
  return Math.max(0, Math.round((lot.auction.closesAt - now) / 1000));
};

const refId = (value) => value?._id?.toString() || value?.toString();

export const openAuction = async (lotId, collectorId, now = new Date()) => {
  const lot = await Lot.findById(lotId);
  if (!lot) throw new AuctionError(404, "Lot not found");
  if (lot.collector.toString() !== collectorId) throw new AuctionError(403, "You can only auction your own lot");
  if (lot.status !== "created") throw new AuctionError(409, "This lot is already matched to a recycler");
  const state = auctionState(lot, now);
  if (state === "open") return lot; // already running — reopening would wipe live bids
  if (state === "awarded") throw new AuctionError(409, "This auction has already been awarded");

  const closesAt = new Date(now.getTime() + AUCTION_MINUTES * 60 * 1000);
  const updated = await Lot.findOneAndUpdate(
    { _id: lotId, collector: collectorId, status: "created", "auction.status": { $ne: "awarded" } },
    {
      $set: {
        "auction.status": "open",
        "auction.openedAt": now,
        "auction.closesAt": closesAt,
        "auction.reservePrice": fairRangeFor(lot).min,
        "auction.bestAmount": 0,
        "auction.bids": [],
        "auction.winner": {},
      },
    },
    { new: true }
  );
  if (!updated) throw new AuctionError(409, "This lot can no longer be auctioned");
  return updated;
};

export const placeBid = async (lotId, recyclerId, rawAmount, now = new Date()) => {
  const amount = Math.round(Number(rawAmount));
  if (!Number.isFinite(amount) || amount <= 0) throw new AuctionError(400, "Enter a bid amount in rupees");

  const lot = await Lot.findById(lotId);
  if (!lot) throw new AuctionError(404, "Lot not found");
  const state = auctionState(lot, now);
  if (state !== "open") throw new AuctionError(409, state === "closed" ? "Bidding has closed for this lot" : "This lot is not open for bidding");

  // Catches an extra zero typed by mistake before it becomes the winning bid.
  const ceiling = Math.max(fairRangeFor(lot).max, Number(lot.estimatedValue || 0)) * 10;
  if (ceiling > 0 && amount > ceiling) throw new AuctionError(400, "That bid looks far too high — check the amount");

  const needed = (lot.auction.bestAmount || 0) + (lot.auction.bestAmount ? MIN_INCREMENT : 0);
  if (amount < needed) throw new AuctionError(409, `Bid at least ${formatRupees(needed)} to lead`);

  const openAndBeatable = {
    _id: lotId,
    "auction.status": "open",
    "auction.closesAt": { $gt: now },
    "auction.bestAmount": { $lte: lot.auction.bestAmount ? amount - MIN_INCREMENT : amount },
  };
  const hasBid = lot.auction.bids.some((b) => b.recycler.toString() === recyclerId);

  const updated = hasBid
    ? await Lot.findOneAndUpdate(
        { ...openAndBeatable, "auction.bids.recycler": recyclerId },
        { $set: { "auction.bids.$[mine].amount": amount, "auction.bids.$[mine].createdAt": now, "auction.bestAmount": amount } },
        { new: true, arrayFilters: [{ "mine.recycler": recyclerId }] }
      )
    : await Lot.findOneAndUpdate(
        { ...openAndBeatable, "auction.bids.recycler": { $ne: recyclerId } },
        { $push: { "auction.bids": { recycler: recyclerId, amount, createdAt: now } }, $set: { "auction.bestAmount": amount } },
        { new: true }
      );

  if (!updated) {
    // Someone else bid or the timer ran out between our read and write.
    const fresh = await Lot.findById(lotId);
    if (auctionState(fresh, new Date()) !== "open") throw new AuctionError(409, "Bidding has closed for this lot");
    throw new AuctionError(409, `You were outbid — the best bid is now ${formatRupees(fresh.auction.bestAmount)}`);
  }
  return updated;
};

export const acceptBid = async (lotId, collectorId, recyclerId, now = new Date()) => {
  const lot = await Lot.findById(lotId);
  if (!lot) throw new AuctionError(404, "Lot not found");
  if (lot.collector.toString() !== collectorId) throw new AuctionError(403, "You can only accept bids on your own lot");
  const state = auctionState(lot, now);
  if (state === "awarded") throw new AuctionError(409, "You have already accepted a bid on this lot");
  if (state === "none") throw new AuctionError(409, "This lot has no auction");
  const bid = lot.auction.bids.find((b) => b.recycler.toString() === recyclerId);
  if (!bid) throw new AuctionError(404, "That recycler has not bid on this lot");

  const updated = await Lot.findOneAndUpdate(
    { _id: lotId, collector: collectorId, status: "created", "auction.status": "open", "auction.bids.recycler": recyclerId },
    { $set: { "auction.status": "awarded", "auction.winner": { recycler: recyclerId, amount: bid.amount, acceptedAt: now } } },
    { new: true }
  );
  if (!updated) throw new AuctionError(409, "This lot changed while you were choosing — refresh and try again");
  return { lot: updated, amount: bid.amount };
};

const formatRupees = (n) => `₹${Math.round(n).toLocaleString("en-IN")}`;

const lotSummary = (lot) => ({
  lotId: lot._id.toString(),
  materials: (lot.materials || []).map((m) => ({ name: m.name, category: m.category, weightKg: m.weightKg })),
  totalWeight: lot.totalWeight,
  estimatedValue: lot.estimatedValue,
  fairRange: fairRangeFor(lot),
  collectionLocation: lot.collectionLocation || null,
});

/** Collector sees every bidder, so they can weigh price against trust and distance. */
export const collectorAuctionView = (lot, recyclersById = new Map(), now = new Date()) => {
  const fair = fairRangeFor(lot);
  const bids = [...(lot.auction?.bids || [])]
    .sort((a, b) => b.amount - a.amount || a.createdAt - b.createdAt)
    .map((b, index) => {
      const recycler = recyclersById.get(b.recycler.toString());
      return {
        recyclerId: b.recycler.toString(),
        recyclerName: recycler?.name || "Authorized recycler",
        rating: recycler?.rating ?? null,
        authorized: Boolean(recycler?.authorized),
        distanceKm: recycler?.distanceKm ?? null,
        amount: b.amount,
        placedAt: b.createdAt,
        isBest: index === 0,
        belowFairRange: b.amount < fair.min,
      };
    });
  return {
    ...lotSummary(lot),
    status: auctionState(lot, now),
    openedAt: lot.auction?.openedAt || null,
    closesAt: lot.auction?.closesAt || null,
    secondsLeft: secondsLeft(lot, now),
    reservePrice: lot.auction?.reservePrice || 0,
    bestAmount: lot.auction?.bestAmount || 0,
    bids,
    winner: lot.auction?.winner?.recycler
      ? { recyclerId: refId(lot.auction.winner.recycler), amount: lot.auction.winner.amount, acceptedAt: lot.auction.winner.acceptedAt }
      : null,
  };
};

/** A recycler sees the best price to beat and their own bid — never who the rivals are. */
export const recyclerAuctionView = (lot, recyclerId, now = new Date()) => {
  const bids = lot.auction?.bids || [];
  const mine = bids.find((b) => b.recycler.toString() === recyclerId);
  const best = lot.auction?.bestAmount || 0;
  const status = auctionState(lot, now);
  return {
    ...lotSummary(lot),
    status,
    closesAt: lot.auction?.closesAt || null,
    secondsLeft: secondsLeft(lot, now),
    bidCount: bids.length,
    bestAmount: best,
    minimumNextBid: best ? best + MIN_INCREMENT : Math.max(1, fairRangeFor(lot).min),
    myBid: mine ? mine.amount : null,
    leading: Boolean(mine && mine.amount === best),
    won: status === "awarded" && refId(lot.auction?.winner?.recycler) === recyclerId,
  };
};
