import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import Price from "./models/Price.js";
import Recycler from "./models/Recycler.js";

const recyclers = [
  ["Delhi E-Waste Recovery Centre", "Amit Sharma", "delhi.ewaste@example.com", "Plot 18, Okhla Industrial Area, New Delhi", 28.5355, 77.2730, ["e_waste", "metal", "hazardous"], { copper: 735, PCB: 210, batteries: 112 }, true],
  ["Gurugram Green Metals", "Neha Verma", "gurugram.green@example.com", "Udyog Vihar Phase IV, Gurugram", 28.4938, 77.0880, ["metal", "plastic"], { copper: 740, aluminum: 190, brass: 435, steel: 32 }, true],
  ["Noida Circular Recyclers", "Rohit Singh", "noida.circular@example.com", "Sector 63, Noida", 28.6289, 77.3826, ["e_waste", "plastic", "metal"], { PCB: 215, LCD: 55, mixed_plastic: 22 }, false],
  ["Faridabad Battery Solutions", "Pooja Mehta", "faridabad.battery@example.com", "Sector 24, Faridabad", 28.3852, 77.3150, ["hazardous", "e_waste"], { batteries: 118, PCB: 195 }, true],
  ["Ghaziabad Scrap Works", "Imran Khan", "ghaziabad.scrap@example.com", "Sahibabad Industrial Area, Ghaziabad", 28.6767, 77.3740, ["metal", "plastic"], { copper: 725, aluminum: 185, steel: 30 }, true],
  ["Rohini Responsible Recycling", "Sanjay Kapoor", "rohini.recycle@example.com", "Sector 11, Rohini, Delhi", 28.7242, 77.1025, ["e_waste", "hazardous"], { PCB: 205, batteries: 105, LCD: 50 }, false],
  ["Dwarka Metal Mart", "Kavita Yadav", "dwarka.metal@example.com", "Sector 7, Dwarka, New Delhi", 28.5921, 77.0460, ["metal", "plastic"], { brass: 445, aluminum: 195, mixed_plastic: 20 }, true],
  ["Greater Noida Eco Hub", "Manish Gupta", "gnoida.eco@example.com", "Surajpur Industrial Area, Greater Noida", 28.4744, 77.5030, ["e_waste", "metal", "plastic"], { PCB: 220, copper: 750, mixed_plastic: 25 }, true],
  ["Narela Steel & Plastics", "Deepak Bansal", "narela.scrap@example.com", "Narela Industrial Area, Delhi", 28.8500, 77.0950, ["metal", "plastic"], { steel: 35, aluminum: 175, mixed_plastic: 18 }, true],
  ["South Delhi Resource Recovery", "Anjali Rao", "southdelhi.rr@example.com", "Kalkaji Industrial Area, New Delhi", 28.5412, 77.2600, ["e_waste", "hazardous", "metal"], { PCB: 200, batteries: 110, copper: 730 }, true]
];
const rates = [
  ["copper", 680, 750], ["PCB", 180, 220], ["PCB_Grade_B", 60, 100], ["batteries", 80, 120], ["LCD", 40, 60],
  ["mixed_plastic", 15, 25], ["aluminum", 170, 200], ["brass", 400, 450], ["steel", 25, 35], ["motors", 35, 55], ["cables", 130, 170], ["CRT", 3, 8], ["e_waste", 40, 80]
];

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const passwordHash = await bcrypt.hash("Recycler@123", 12);
  await Recycler.deleteMany({});
  await Price.deleteMany({});
  const eprMap = [
    { eprPartners: ["samsung", "lg", "xiaomi"], proNetwork: "Karo Sambhav" },
    { eprPartners: [], proNetwork: null },
    { eprPartners: ["apple", "dell", "hp"], proNetwork: "Ecoreco" },
    { eprPartners: ["samsung", "xiaomi", "boat"], proNetwork: "Karo Sambhav" },
    { eprPartners: [], proNetwork: null },
    { eprPartners: ["hp", "dell", "apple"], proNetwork: "E-Waste Recyclers India" },
    { eprPartners: [], proNetwork: null },
    { eprPartners: ["samsung", "lg", "voltas", "xiaomi"], proNetwork: "Karo Sambhav" },
    { eprPartners: [], proNetwork: null },
    { eprPartners: ["apple", "samsung", "boat", "hp"], proNetwork: "Ecoreco" }
  ];
  await Recycler.insertMany(recyclers.map(([name, ownerName, email, address, locationLat, locationLng, materialsAccepted, offeredRates, pickupAvailable], index) => ({ name, ownerName, email, address, locationLat, locationLng, materialsAccepted, offeredRates, pickupAvailable, contact: `+91 98${String(10000000 + index).slice(-8)}`, authorized: true, criticalMineralCertified: [0, 2, 7].includes(index), criticalMineralsCertified: [0, 2, 7].includes(index) ? ["lithium", "cobalt", "neodymium", "tantalum", "gallium", "indium"] : [], criticalMineralCertificationAuthority: [0, 2, 7].includes(index) ? "Ministry of Mines partner certification (demo)" : undefined, cpcbRegistrationNumber: `CPCB/EW/DEL/${2026 - (index % 3)}/${1040 + index}`, cpcbAuthorizationValidUntil: new Date("2028-12-31"), authorizationSource: "Demo seed data — verify against CPCB E-Waste EPR portal before production", authorizationLastVerifiedAt: new Date(), serviceArea: ["Delhi NCR", address.split(",").at(-1)?.trim()].filter(Boolean), openHours: "09:00 AM - 07:00 PM", minPickupWeightKg: pickupAvailable ? 25 : 0, rating: 4.4 + (index % 5) / 10, reviewsCount: 26 + index * 9, eprPartners: eprMap[index].eprPartners, proNetwork: eprMap[index].proNetwork, passwordHash })));
  const priceRows = [];
  for (const [materialCategory, low, high] of rates) {
    for (let day = 29; day >= 0; day -= 1) {
      const midpoint = (low + high) / 2;
      const variation = ((day * 7 + materialCategory.length) % 9) - 4;
      priceRows.push({ materialCategory, location: "Delhi NCR", priceDate: new Date(Date.now() - day * 86400000), buyingPrice: Math.max(low, midpoint + variation - 3), quotedPrice: Math.min(high, midpoint + variation), marketRangeMin: low, marketRangeMax: high, unit: "kg", source: "Demo seed data — replace with verified recycler/market submissions", confidence: "low" });
    }
  }
  await Price.insertMany(priceRows);
  console.log(`Seeded 10 demo recyclers and ${priceRows.length} price records. Recycler login password: Recycler@123`);
  await mongoose.disconnect();
};
run().catch((error) => { console.error(error); mongoose.disconnect(); process.exit(1); });
