// Gamification Service for Kabadiwala Connect
// Manages recycling tiers, weekly streaks, milestone badges, challenges, and leaderboards

const STREAK_KEY = "kabadi_recycling_streak";
const BADGES_KEY = "kabadi_earned_badges";
const CHALLENGES_KEY = "kabadi_user_challenges";

export const COLLECTOR_LEVELS = [
  {
    level: 1,
    title: "Gali Saathi",
    hindiTitle: "गली साथी",
    marathiTitle: "गल्ली साथी",
    minWeightKg: 0,
    maxWeightKg: 100,
    badgeKey: "collector",
    color: "text-brand-600 bg-brand-50 border-brand-200",
    perk: "Base tokens (1x)"
  },
  {
    level: 2,
    title: "Eco Hero",
    hindiTitle: "ग्रीन साथी",
    marathiTitle: "ग्रीन साथी",
    minWeightKg: 100,
    maxWeightKg: 500,
    badgeKey: "hero",
    color: "text-emerald-700 bg-emerald-50 border-emerald-200",
    perk: "+5% bonus tokens"
  },
  {
    level: 3,
    title: "Kabaad Ustaad",
    hindiTitle: "कबाड़ उस्ताद",
    marathiTitle: "कबाड उस्ताद",
    minWeightKg: 500,
    maxWeightKg: 1500,
    badgeKey: "ustaad",
    color: "text-gold-700 bg-gold-50 border-gold-300",
    perk: "+10% bonus tokens & priority unloading"
  },
  {
    level: 4,
    title: "Paryavaran Rakshak",
    hindiTitle: "पर्यावरण रक्षक",
    marathiTitle: "पर्यावरण रक्षक",
    minWeightKg: 1500,
    maxWeightKg: 10000,
    badgeKey: "rakshak",
    color: "text-purple-700 bg-purple-50 border-purple-300",
    perk: "+20% tokens & official CPCB Partner Certificate"
  }
];

export const BADGE_DEFINITIONS = [
  {
    id: "badge_first_handover",
    title: "First Collection",
    hindiTitle: "पहला संकलन",
    marathiTitle: "पहिले संकलन",
    iconKey: "debut",
    description: "Completed your first formal verified handover to a CPCB recycler.",
    criteria: "1 verified handover"
  },
  {
    id: "badge_zero_burn",
    title: "Zero-Burn Champion",
    hindiTitle: "धुआं-मुक्त साथी",
    marathiTitle: "धूर-मुक्त साथी",
    iconKey: "zero_burn",
    description: "Sold copper cables through formal recycling instead of open-air burning.",
    criteria: "≥25 kg cables formally diverted"
  },
  {
    id: "badge_battery_guardian",
    title: "Battery Guardian",
    hindiTitle: "बैटरी रक्षक",
    marathiTitle: "बॅटरी रक्षक",
    iconKey: "battery",
    description: "Safely handed over hazardous lead-acid or lithium batteries without acid leakage.",
    criteria: "≥3 battery handovers"
  },
  {
    id: "badge_silicon_rescuer",
    title: "Silicon Rescuer",
    hindiTitle: "पीसीबी योद्धा",
    marathiTitle: "पीसीबी योद्धा",
    iconKey: "pcb",
    description: "Diverted high-grade circuit boards from backyard acid leaching to formal hydrometallurgy.",
    criteria: "≥15 kg PCBs saved"
  },
  {
    id: "badge_perfect_dna",
    title: "Perfect Traceability",
    hindiTitle: "सटीक हिसाब",
    marathiTitle: "अचूक हिशोब",
    iconKey: "traceability",
    description: "Achieved a 90+ Scrap DNA score with complete GPS, photos, and digital weight matching.",
    criteria: "Scrap DNA score ≥90"
  }
];

export const getCollectorLevel = (totalWeightKg = 120) => {
  const weight = Number(totalWeightKg || 0);
  for (let i = COLLECTOR_LEVELS.length - 1; i >= 0; i--) {
    if (weight >= COLLECTOR_LEVELS[i].minWeightKg) {
      const current = COLLECTOR_LEVELS[i];
      const next = COLLECTOR_LEVELS[i + 1] || null;
      const progressPercent = next
        ? Math.min(100, Math.round(((weight - current.minWeightKg) / (current.maxWeightKg - current.minWeightKg)) * 100))
        : 100;
      return {
        ...current,
        currentWeightKg: weight,
        nextLevel: next,
        progressPercent,
        remainingKg: next ? Math.max(0, current.maxWeightKg - weight) : 0
      };
    }
  }
  return { ...COLLECTOR_LEVELS[0], progressPercent: 0, currentWeightKg: weight };
};

export const getRecyclingStreak = () => {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (!raw) {
      const initial = { weeks: 3, lastHandoverDate: new Date().toISOString(), bestStreak: 4 };
      localStorage.setItem(STREAK_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return { weeks: 3, lastHandoverDate: new Date().toISOString(), bestStreak: 4 };
  }
};

export const incrementStreak = () => {
  const current = getRecyclingStreak();
  const next = {
    weeks: current.weeks + 1,
    lastHandoverDate: new Date().toISOString(),
    bestStreak: Math.max(current.weeks + 1, current.bestStreak || current.weeks + 1)
  };
  localStorage.setItem(STREAK_KEY, JSON.stringify(next));
  return next;
};

export const getEarnedBadges = () => {
  try {
    const raw = localStorage.getItem(BADGES_KEY);
    if (!raw) {
      // By default for demo realism unlock 2 badges
      const initial = ["badge_first_handover", "badge_zero_burn"];
      localStorage.setItem(BADGES_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return ["badge_first_handover", "badge_zero_burn"];
  }
};

export const unlockBadge = (badgeId) => {
  const current = getEarnedBadges();
  if (!current.includes(badgeId)) {
    const updated = [...current, badgeId];
    localStorage.setItem(BADGES_KEY, JSON.stringify(updated));
    return true;
  }
  return false;
};

export const getWeeklyChallenges = () => {
  try {
    const raw = localStorage.getItem(CHALLENGES_KEY);
    if (!raw) {
      const initial = [
        {
          id: "ch_battery",
          title: "Deposit 5kg Batteries Safely",
          hindiTitle: "5 किलो बैटरी सुरक्षित जमा करें",
          marathiTitle: "5 किलो बॅटरी सुरक्षित जमा करा",
          targetKg: 5,
          currentKg: 3.5,
          rewardTokens: 150,
          completed: false,
          daysLeft: 4,
          category: "battery"
        },
        {
          id: "ch_digital_scale",
          title: "Complete 2 Certified Digital Handover Deals",
          hindiTitle: "2 डिजिटल तौल सौदे पूरे करें",
          marathiTitle: "2 डिजिटल वजन सौदे पूर्ण करा",
          targetCount: 2,
          currentCount: 1,
          rewardTokens: 100,
          completed: false,
          daysLeft: 4,
          category: "scale"
        }
      ];
      localStorage.setItem(CHALLENGES_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

export const getCommunityLeaderboard = () => {
  return [
    {
      rank: 1,
      name: "Vikram Shinde",
      area: "Dharavi, Mumbai",
      level: "Level 3 · Champion",
      weightKg: 485,
      tokensEarned: 3420,
      tier: "Champion",
      streakWeeks: 6,
      avatarBg: "bg-brand-600 text-white"
    },
    {
      rank: 2,
      name: "Bablu Qureshi",
      area: "Seelampur, Delhi NCR",
      level: "Level 3 · Champion",
      weightKg: 410,
      tokensEarned: 2950,
      tier: "Champion",
      streakWeeks: 5,
      avatarBg: "bg-gold-500 text-ink"
    },
    {
      rank: 3,
      name: "Suraj Rathod",
      area: "Okhla, New Delhi",
      level: "Level 2 · Aggregator",
      weightKg: 340,
      tokensEarned: 2480,
      tier: "Aggregator",
      streakWeeks: 4,
      avatarBg: "bg-emerald-600 text-white"
    },
    {
      rank: 4,
      name: "Santosh Yadav (You)",
      area: "Delhi NCR",
      level: "Level 2 · Aggregator",
      weightKg: 185,
      tokensEarned: 1350,
      tier: "Aggregator",
      streakWeeks: 3,
      isCurrentUser: true,
      avatarBg: "bg-brand-500 text-white"
    },
    {
      rank: 5,
      name: "Imran Mansoori",
      area: "Kurla West, Mumbai",
      level: "Level 2 · Aggregator",
      weightKg: 160,
      tokensEarned: 1120,
      tier: "Aggregator",
      streakWeeks: 2,
      avatarBg: "bg-muted text-white"
    },
    {
      rank: 6,
      name: "Kailash Chand",
      area: "Mayapuri, New Delhi",
      level: "Level 1 · Gali Collector",
      weightKg: 95,
      tokensEarned: 780,
      tier: "Collector",
      streakWeeks: 2,
      avatarBg: "bg-faint text-white"
    }
  ];
};
