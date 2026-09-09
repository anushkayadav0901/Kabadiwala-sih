import mongoose from "mongoose";

const lotSchema = new mongoose.Schema(
  {
    collector: { type: mongoose.Schema.Types.ObjectId, ref: "Collector", required: true, index: true },
    materials: [{
      name: String, category: String, subCategory: String, description: String,
      condition: String, sourceType: String, weightKg: Number, pricePerKg: Number,
      marketRangeMin: Number, marketRangeMax: Number, classificationConfidence: Number
    }],
    totalWeight: { type: Number, required: true },
    estimatedValue: { type: Number, required: true },
    criticalMineralBounty: {
      eligible: { type: Boolean, default: false },
      minerals: [{ type: String }],
      triggers: [{ type: String }],
      bonusRatePct: { type: Number, default: 0 },
      bonusValue: { type: Number, default: 0 },
      label: { type: String, default: null }
    },
    photoUrls: [String],
    gpsLat: Number,
    gpsLng: Number,
    status: { type: String, enum: ["created", "quoted", "matched", "handover", "completed", "cancelled"], default: "created", index: true },
    matchedRecycler: { type: mongoose.Schema.Types.ObjectId, ref: "Recycler", default: null },
    routeId: { type: mongoose.Schema.Types.ObjectId, ref: "PickupRoute", default: null },
    handoverReference: String,
    handoverSignature: String,
    handoverPhotos: [String],
    collectionLocation: String,
    handoverLocation: String,
    handedOverAt: Date,
    recyclerConfirmedAt: Date
  },
  { timestamps: true }
);

export default mongoose.model("Lot", lotSchema);
