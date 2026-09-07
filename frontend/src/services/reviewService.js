// Reviews & Ratings Service for Kabadiwala Connect
// Cab-style multi-criteria rating (Weighing Accuracy, Fair Pricing, Speed, Behaviour, Eco-Safety)

const STORAGE_KEY = "kabadi_buyer_reviews";

// Seed default reviews with multi-criteria scores
const DEFAULT_REVIEWS = [
  {
    id: "rev_1",
    recyclerId: "rec_1",
    buyerName: "Delhi E-Waste Recovery Centre",
    collectorName: "Ramesh Pawar",
    rating: 5,
    criteria: {
      weighingAccuracy: 5,
      fairPricing: 5,
      speedPunctuality: 4,
      staffBehaviour: 5,
      ecoSafety: 5
    },
    comment: "Accurate digital scale without arbitrary deductions. Instant payment via cash at counter.",
    tags: ["Fair Digital Scale", "Instant Cash", "Official EPR"],
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "rev_2",
    recyclerId: "rec_1",
    buyerName: "Delhi E-Waste Recovery Centre",
    collectorName: "Sanjay Gupta",
    rating: 5,
    criteria: {
      weighingAccuracy: 5,
      fairPricing: 4,
      speedPunctuality: 5,
      staffBehaviour: 5,
      ecoSafety: 5
    },
    comment: "Very respectful staff. Accepted all PCB boards without hassle and gave stamped certificate.",
    tags: ["Polite Staff", "Official EPR"],
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "rev_3",
    recyclerId: "rec_2",
    buyerName: "Gurugram Green Metals",
    collectorName: "Abdul Khan",
    rating: 4,
    criteria: {
      weighingAccuracy: 4,
      fairPricing: 5,
      speedPunctuality: 4,
      staffBehaviour: 4,
      ecoSafety: 4
    },
    comment: "Best wholesale prices for copper wire scrap.",
    tags: ["Best Price", "Fast Unloading"],
    createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString()
  }
];

export const getStoredReviews = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_REVIEWS));
      return DEFAULT_REVIEWS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_REVIEWS;
  }
};

export const getReviewsForRecycler = (recyclerId) => {
  const all = getStoredReviews();
  return all.filter((r) => String(r.recyclerId) === String(recyclerId));
};

const DEFAULT_VERIFIED_FEEDBACK = [
  {
    id: "v_rev_1",
    collectorName: "Ramesh",
    collectorRole: "Kabadi Partner",
    rating: 5,
    verifiedHandover: "24 kg Copper Wire",
    comment: "Accurate digital scale with zero deductions and instant payment.",
    tags: ["Fair Weight", "Instant Cash"],
    helpfulCount: 16,
    timeAgo: "Recently"
  },
  {
    id: "v_rev_2",
    collectorName: "Sunil",
    collectorRole: "Collector",
    rating: 5,
    verifiedHandover: "38 kg Lead Batteries",
    comment: "Fast unloading and honest rates matching the live board.",
    tags: ["Fast Service", "Fair Rates"],
    helpfulCount: 12,
    timeAgo: "2 days ago"
  }
];

export const getRecyclerRatingStats = (recyclerId, defaultRating = 4.8, defaultCount = 42) => {
  const reviews = getReviewsForRecycler(recyclerId);
  if (reviews.length === 0) {
    return {
      averageRating: Number(defaultRating).toFixed(1),
      reviewsCount: defaultCount,
      positivePercent: 98,
      criteriaBreakdown: {
        weighingAccuracy: 98,
        fairPricing: 96,
        speedPunctuality: 94,
        staffBehaviour: 97,
        ecoSafety: 99
      },
      topTags: ["Fair Digital Scale", "Instant Cash", "Official EPR", "Zero Deduction"],
      reviews: DEFAULT_VERIFIED_FEEDBACK
    };
  }

  const sum = reviews.reduce((acc, r) => acc + Number(r.rating || 5), 0);
  const avg = (sum / reviews.length).toFixed(1);

  const cSum = { weighingAccuracy: 0, fairPricing: 0, speedPunctuality: 0, staffBehaviour: 0, ecoSafety: 0 };
  let cCount = 0;

  reviews.forEach((r) => {
    if (r.criteria) {
      cSum.weighingAccuracy += (r.criteria.weighingAccuracy || r.rating || 5);
      cSum.fairPricing += (r.criteria.fairPricing || r.rating || 5);
      cSum.speedPunctuality += (r.criteria.speedPunctuality || r.rating || 4);
      cSum.staffBehaviour += (r.criteria.staffBehaviour || r.rating || 5);
      cSum.ecoSafety += (r.criteria.ecoSafety || r.rating || 5);
      cCount++;
    }
  });

  const criteriaBreakdown = cCount > 0 ? {
    weighingAccuracy: Math.round((cSum.weighingAccuracy / (cCount * 5)) * 100),
    fairPricing: Math.round((cSum.fairPricing / (cCount * 5)) * 100),
    speedPunctuality: Math.round((cSum.speedPunctuality / (cCount * 5)) * 100),
    staffBehaviour: Math.round((cSum.staffBehaviour / (cCount * 5)) * 100),
    ecoSafety: Math.round((cSum.ecoSafety / (cCount * 5)) * 100)
  } : {
    weighingAccuracy: 96,
    fairPricing: 94,
    speedPunctuality: 90,
    staffBehaviour: 95,
    ecoSafety: 97
  };

  const tagCounts = {};
  reviews.forEach((r) => (r.tags || []).forEach((t) => { tagCounts[t] = (tagCounts[t] || 0) + 1; }));
  const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).map(([t]) => t);

  return {
    averageRating: avg,
    reviewsCount: defaultCount + reviews.length,
    criteriaBreakdown,
    topTags: topTags.length ? topTags : ["Fair Digital Scale", "Instant Cash", "Official EPR"],
    reviews
  };
};

export const addRecyclerReview = async ({
  recyclerId,
  buyerName = "Authorized Recycler",
  collectorName = "Kabadiwala Partner",
  rating = 5,
  criteria = {
    weighingAccuracy: 5,
    fairPricing: 5,
    speedPunctuality: 4,
    staffBehaviour: 5,
    ecoSafety: 5
  },
  comment = "",
  tags = []
}) => {
  const newReview = {
    id: `rev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    recyclerId: String(recyclerId),
    buyerName,
    collectorName,
    rating: Number(rating),
    criteria,
    comment: comment.trim() || "Accurate digital scale with zero deductions and prompt payment.",
    tags: tags.length ? tags : ["Fair Weight", "Instant Cash"],
    createdAt: new Date().toISOString()
  };

  const all = getStoredReviews();
  const updated = [newReview, ...all];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

  return newReview;
};
