import mongoose from "mongoose";

const collectorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    email: { type: String, trim: true, lowercase: true, sparse: true },
    passwordHash: { type: String, required: true, select: false },
    preferredLanguage: { type: String, default: "en" },
    locationLat: Number,
    locationLng: Number,
    operatingLocation: String
  },
  { timestamps: true }
);

export default mongoose.model("Collector", collectorSchema);
