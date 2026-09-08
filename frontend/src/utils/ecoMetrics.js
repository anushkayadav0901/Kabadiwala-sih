const MATERIAL_FACTORS = {
  e_waste:       { co2: 2.1,  water: 25,  energy: 4.0 },
  copper:        { co2: 3.6,  water: 40,  energy: 6.3 },
  aluminium:     { co2: 9.1,  water: 35,  energy: 14.0 },
  iron:          { co2: 1.5,  water: 15,  energy: 2.8 },
  plastic:       { co2: 1.4,  water: 18,  energy: 2.3 },
  paper:         { co2: 0.9,  water: 26,  energy: 1.5 },
  glass:         { co2: 0.6,  water: 10,  energy: 1.2 },
  cables:        { co2: 2.8,  water: 30,  energy: 5.1 },
  CRT:           { co2: 1.8,  water: 20,  energy: 3.0 },
  LCD:           { co2: 2.4,  water: 22,  energy: 3.8 },
  motors:        { co2: 1.6,  water: 14,  energy: 2.5 },
  mixed_plastic: { co2: 1.4,  water: 18,  energy: 2.3 },
};

const DEFAULT_FACTOR = { co2: 1.8, water: 20, energy: 3.2 };

export const computeImpact = (totalKg, category) => {
  const f = MATERIAL_FACTORS[category] || DEFAULT_FACTOR;
  return {
    co2Kg:      +(totalKg * f.co2).toFixed(1),
    waterLiters: Math.round(totalKg * f.water),
    energyKwh:  +(totalKg * f.energy).toFixed(1),
    landfillKg:  +totalKg.toFixed(1),
  };
};

export const computeTotalImpact = (totalKg) => {
  const f = DEFAULT_FACTOR;
  const co2Kg = +(totalKg * f.co2).toFixed(1);
  return {
    co2Kg,
    waterLiters: Math.round(totalKg * f.water),
    energyKwh:   +(totalKg * f.energy).toFixed(1),
    landfillKg:  +totalKg.toFixed(1),
    treesEquiv:  Math.round(co2Kg / 22),
  };
};
