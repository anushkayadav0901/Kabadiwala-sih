const BOUNTY_RULES = [
  { mineral: "lithium", trigger: "lithium battery", ratePct: 12, patterns: [/lithium/i, /li[-\s]?ion/i] },
  { mineral: "cobalt", trigger: "cobalt battery", ratePct: 12, patterns: [/cobalt/i] },
  { mineral: "neodymium", trigger: "magnet assembly", ratePct: 12, patterns: [/magnet\s*(assembly|motor)?/i, /neodymium/i] },
  { mineral: "tantalum", trigger: "tantalum capacitor", ratePct: 15, patterns: [/tantalum\s+capacitor/i, /tantalum/i] },
  { mineral: "gallium", trigger: "LCD/LED backlight", ratePct: 10, patterns: [/lcd|led|backlight|display|screen/i, /gallium/i] },
  { mineral: "indium", trigger: "LCD/LED backlight", ratePct: 10, patterns: [/lcd|led|backlight|display|screen/i, /indium/i] }
];

const materialText = (material) => [
  material.name,
  material.category,
  material.subCategory,
  material.description
].filter(Boolean).join(" ").toLowerCase();

export const calculateCriticalMineralBounty = (materials = [], estimatedValue = 0) => {
  const minerals = new Set();
  const triggers = new Set();
  let bonusRatePct = 0;

  for (const material of materials) {
    const text = materialText(material);
    for (const rule of BOUNTY_RULES) {
      if (rule.patterns.some((pattern) => pattern.test(text))) {
        minerals.add(rule.mineral);
        triggers.add(rule.trigger);
        bonusRatePct = Math.max(bonusRatePct, rule.ratePct);
      }
    }
  }

  const eligible = minerals.size > 0;
  const bonusValue = Number((Number(estimatedValue || 0) * bonusRatePct / 100).toFixed(2));
  return {
    eligible,
    minerals: [...minerals],
    triggers: [...triggers],
    bonusRatePct: eligible ? bonusRatePct : 0,
    bonusValue,
    label: eligible ? `Critical mineral bounty: +${bonusRatePct}%` : null
  };
};

export const bountyQuote = (lot, recycler) => {
  const bounty = lot.criticalMineralBounty;
  const certifiedMinerals = recycler?.criticalMineralsCertified || [];
  const isCertified = Boolean(
    bounty?.eligible && recycler?.criticalMineralCertified &&
    bounty.minerals.some((mineral) => certifiedMinerals.includes(mineral))
  );
  return {
    isCertified,
    amount: Number(lot.estimatedValue || 0) + (isCertified ? Number(bounty.bonusValue || 0) : 0)
  };
};