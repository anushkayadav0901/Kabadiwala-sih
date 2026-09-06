import mongoose from "mongoose";

const lotSchema = new mongoose.Schema(
  {
    collector: { type: mongoose.Schema.Types.ObjectId, ref: "Collector", required: true, index: true },
    materials: [{ name: String, category: String, weightKg: Number, pricePerKg: Number }],
    totalWeight: { type: Number, required: true },
    estimatedValue: { type: Number, required: true },
    photoUrls: [String],
    gpsLat: Number,
    gpsLng: Number,
    status: { type: String, enum: ["created", "matched", "paid", "cancelled"], default: "created", index: true },
    matchedRecycler: { type: mongoose.Schema.Types.ObjectId, ref: "Recycler", default: null },
    handoverReference: String,
    handedOverAt: Date
  },
  { timestamps: true }
);

export default mongoose.model("Lot", lotSchema);
