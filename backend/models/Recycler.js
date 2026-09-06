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
    authorized: { type: Boolean, default: false },
    cpcbRegistrationNumber: { type: String, trim: true },
    cpcbAuthorizationValidUntil: Date,
    cpcbCertificateUrl: String,
    pickupAvailable: { type: Boolean, default: false },
    minPickupWeightKg: { type: Number, default: 0 },
    openHours: { type: String, default: "09:00 AM - 06:00 PM" },
    rating: { type: Number, default: 4.5 },
    reviewsCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export default mongoose.model("Recycler", recyclerSchema);
