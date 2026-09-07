// Token Service for Kabadiwala Connect
// Manages digital Kabadi Tokens, transaction ledger, and redemption

const BALANCE_KEY = "kabadi_token_balance";
const LEDGER_KEY = "kabadi_token_ledger";

// Multipliers for material categories (higher for hazardous & high-EPR value)
export const MATERIAL_TOKEN_RATES = {
  pcb: 30,         // 30 tokens/kg (E-waste precious metals)
  e_waste: 25,     // 25 tokens/kg
  battery: 40,     // 40 tokens/kg (Hazardous lead-acid & lithium)
  hazardous: 35,   // 35 tokens/kg
  copper: 25,      // 25 tokens/kg (Disincentivizes open burning)
  metal: 15,       // 15 tokens/kg
  plastic: 10,     // 10 tokens/kg
  paper: 8,        // 8 tokens/kg
  default: 10
};

export const REWARDS_CATALOG = [
  {
    id: "rew_gloves",
    name: "Heavy Cut-Resistant Gloves",
    hindiName: "मजबूत सुरक्षा दस्ताने",
    marathiName: "मजबूत सुरक्षा हातमोजे",
    category: "safety",
    costTokens: 250,
    iconType: "gloves",
    description: "Level 5 cut-resistant protective gloves for sorting sharp metals, wire, and broken glass.",
    partner: "CPCB Safe Kabadi Initiative",
    validDays: 30
  },
  {
    id: "rew_mask",
    name: "Safety Goggles & N95 Dust Mask Kit",
    hindiName: "चश्मा और N95 मास्क किट",
    marathiName: "चष्मा आणि N95 मास्क किट",
    category: "safety",
    costTokens: 300,
    iconType: "mask",
    description: "Anti-toxic dust safety mask and eye protection gear to prevent toxic fumes and particles.",
    partner: "Clean Air India",
    validDays: 30
  },
  {
    id: "rew_mobile",
    name: "₹100 Mobile Recharge Voucher",
    hindiName: "₹100 मोबाइल रिचार्ज कूपन",
    marathiName: "₹100 मोबाईल रिचार्ज कूपन",
    category: "utility",
    costTokens: 500,
    iconType: "mobile",
    description: "Instant top-up voucher valid on Jio, Airtel, and Vi.",
    partner: "Digital Bharat Pay",
    validDays: 60
  },
  {
    id: "rew_scale",
    name: "Digital Luggage Scale Discount (50% Off)",
    hindiName: "डिजिटल वजन तराजू पर 50% छूट",
    marathiName: "डिजिटल वजन काट्यावर 50% सवलत",
    category: "tools",
    costTokens: 800,
    iconType: "scale",
    description: "Heavy-duty 50kg handheld digital hanging scale with backlit display.",
    partner: "Kisan & Kabadi Tools Hub",
    validDays: 45
  },
  {
    id: "rew_ration",
    name: "₹250 Grocery / Ration Discount Voucher",
    hindiName: "₹250 किराना राशन वाउचर",
    marathiName: "₹250 किराणा राशन कूपन",
    category: "ration",
    costTokens: 1000,
    iconType: "ration",
    description: "Redeemable at local partner grocery stores and fair-price ration shops.",
    partner: "Gramin Kirana Sahyogi",
    validDays: 30
  }
];

export const getTokenBalance = () => {
  try {
    const raw = localStorage.getItem(BALANCE_KEY);
    return raw !== null ? Number(raw) : 150; // default initial welcome tokens
  } catch {
    return 150;
  }
};

export const getTokenLedger = () => {
  try {
    const raw = localStorage.getItem(LEDGER_KEY);
    if (!raw) {
      const initial = [
        {
          id: "tx_welcome",
          type: "earned",
          amount: 150,
          reason: "Platform Onboarding Welcome Bonus",
          hindiReason: "स्वागत बोनस टोकन",
          marathiReason: "प्लॅटफॉर्म स्वागत बोनस",
          timestamp: new Date(Date.now() - 7 * 86400000).toISOString()
        }
      ];
      localStorage.setItem(LEDGER_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

export const calculateTokensForLot = (lot, scrapDnaScore = null) => {
  if (!lot) return { totalTokens: 0, breakdown: [] };
  const materials = lot.materials || [];
  let total = 0;
  const breakdown = [];

  materials.forEach((m) => {
    const cat = (m.category || m.name || "").toLowerCase();
    let rate = MATERIAL_TOKEN_RATES.default;
    if (cat.includes("pcb") || cat.includes("circuit")) rate = MATERIAL_TOKEN_RATES.pcb;
    else if (cat.includes("battery")) rate = MATERIAL_TOKEN_RATES.battery;
    else if (cat.includes("copper") || cat.includes("cable") || cat.includes("wire")) rate = MATERIAL_TOKEN_RATES.copper;
    else if (cat.includes("hazard") || cat.includes("motor")) rate = MATERIAL_TOKEN_RATES.hazardous;
    else if (cat.includes("metal")) rate = MATERIAL_TOKEN_RATES.metal;
    else if (cat.includes("plastic")) rate = MATERIAL_TOKEN_RATES.plastic;
    else if (cat.includes("paper") || cat.includes("cardboard")) rate = MATERIAL_TOKEN_RATES.paper;

    const weight = Number(m.weight_kg ?? m.weightKg ?? 1);
    const earned = Math.round(weight * rate);
    total += earned;
    breakdown.push({
      material: m.name || "Scrap item",
      weightKg: weight,
      ratePerKg: rate,
      tokens: earned
    });
  });

  // Scrap DNA high-traceability bonus
  let bonus = 0;
  if (scrapDnaScore && scrapDnaScore >= 80) {
    bonus = 30;
    total += bonus;
    breakdown.push({
      material: "High Traceability Verified (Scrap DNA ≥80)",
      tokens: bonus
    });
  }

  return { totalTokens: Math.max(total, 25), breakdown, bonus };
};

export const awardTokens = (amount, reason, details = {}) => {
  const current = getTokenBalance();
  const next = current + Number(amount);
  localStorage.setItem(BALANCE_KEY, String(next));

  const ledger = getTokenLedger();
  const entry = {
    id: `tok_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type: "earned",
    amount: Number(amount),
    reason,
    details,
    timestamp: new Date().toISOString()
  };
  localStorage.setItem(LEDGER_KEY, JSON.stringify([entry, ...ledger]));
  return { newBalance: next, entry };
};

export const redeemReward = (reward) => {
  const current = getTokenBalance();
  if (current < reward.costTokens) {
    throw new Error(`Insufficient tokens. You need ${reward.costTokens} tokens but have ${current}.`);
  }

  const next = current - reward.costTokens;
  localStorage.setItem(BALANCE_KEY, String(next));

  const voucherCode = `KBC-RWD-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const redemptionRecord = {
    id: `red_${Date.now()}`,
    type: "redeemed",
    amount: -reward.costTokens,
    reason: `Redeemed: ${reward.name}`,
    voucherCode,
    rewardId: reward.id,
    rewardName: reward.name,
    timestamp: new Date().toISOString()
  };

  const ledger = getTokenLedger();
  localStorage.setItem(LEDGER_KEY, JSON.stringify([redemptionRecord, ...ledger]));

  // Save active voucher
  const activeVouchers = getActiveVouchers();
  activeVouchers.unshift({
    ...redemptionRecord,
    iconType: reward.iconType || "voucher",
    partner: reward.partner,
    validUntil: new Date(Date.now() + (reward.validDays || 30) * 86400000).toISOString()
  });
  localStorage.setItem("kabadi_active_vouchers", JSON.stringify(activeVouchers));

  return { newBalance: next, voucherCode, redemptionRecord };
};

export const getActiveVouchers = () => {
  try {
    return JSON.parse(localStorage.getItem("kabadi_active_vouchers") || "[]");
  } catch {
    return [];
  }
};
