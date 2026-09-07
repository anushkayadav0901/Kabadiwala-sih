import mongoose from "mongoose";

const recyclerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    ownerName: { type: String, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true, select: false },
    contact: { type: String, required: true },
    address: { type: String, default: "Delhi NCR" },
    locationLat: { type: Number, required: true },
    locationLng: { type: Number, required: true },
    materialsAccepted: [{ type: String, trim: true }],
    offeredRates: { type: Map, of: Number, default: {} },
    criticalMineralCertified: { type: Boolean, default: false },
    criticalMineralsCertified: [{ type: String, trim: true, lowercase: true }],
    criticalMineralCertificationAuthority: { type: String, trim: true },
    authorized: { type: Boolean, default: false },
    cpcbRegistrationNumber: { type: String, trim: true },
    cpcbAuthorizationValidUntil: Date,
    cpcbCertificateUrl: String,
    authorizationSource: { type: String, default: "Seed data — validation required" },
    authorizationLastVerifiedAt: Date,
    pickupAvailable: { type: Boolean, default: false },
    minPickupWeightKg: { type: Number, default: 0 },
    serviceArea: [{ type: String, trim: true }],
    openHours: { type: String, default: "09:00 AM - 06:00 PM" },
    rating: { type: Number, default: 4.5 },
    reviewsCount: { type: Number, default: 0 },
    eprPartners: [{ type: String, trim: true }],
    proNetwork: { type: String, trim: true }
  },
  { timestamps: true }
);

export default mongoose.model("Recycler", recyclerSchema);
