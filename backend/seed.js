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
  ["copper", 700, 750], ["PCB", 180, 220], ["batteries", 80, 120], ["LCD", 40, 60],
  ["mixed_plastic", 15, 25], ["aluminum", 170, 200], ["brass", 400, 450], ["steel", 25, 35]
];

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const passwordHash = await bcrypt.hash("Recycler@123", 12);
  await Recycler.deleteMany({});
  await Price.deleteMany({});
  await Recycler.insertMany(recyclers.map(([name, ownerName, email, address, locationLat, locationLng, materialsAccepted, offeredRates, pickupAvailable], index) => ({ name, ownerName, email, address, locationLat, locationLng, materialsAccepted, offeredRates, pickupAvailable, contact: `+91 98${String(10000000 + index).slice(-8)}`, authorized: true, cpcbRegistrationNumber: `CPCB/EW/DEL/${2026 - (index % 3)}/${1040 + index}`, cpcbAuthorizationValidUntil: new Date("2028-12-31"), openHours: "09:00 AM - 07:00 PM", minPickupWeightKg: pickupAvailable ? 25 : 0, rating: 4.4 + (index % 5) / 10, reviewsCount: 26 + index * 9, passwordHash })));
  const priceRows = [];
  for (const [materialCategory, low, high] of rates) {
    for (let day = 29; day >= 0; day -= 1) {
      const midpoint = (low + high) / 2;
      const variation = ((day * 7 + materialCategory.length) % 9) - 4;
      priceRows.push({ materialCategory, location: "Delhi NCR", priceDate: new Date(Date.now() - day * 86400000), buyingPrice: Math.max(low, midpoint + variation - 3), quotedPrice: Math.min(high, midpoint + variation), unit: "kg" });
    }
  }
  await Price.insertMany(priceRows);
  console.log(`Seeded 10 CPCB-authorized recyclers and ${priceRows.length} price records. Recycler login password: Recycler@123`);
  await mongoose.disconnect();
};
run().catch((error) => { console.error(error); mongoose.disconnect(); process.exit(1); });
