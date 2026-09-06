import mongoose from "mongoose";

const materialSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, index: true },
    subCategory: { type: String, trim: true },
    description: String,
    imageUrl: String,
    condition: { type: String, enum: ["mixed", "working", "damaged", "hazardous", "unknown"], default: "unknown" },
    sourceType: { type: String, default: "collector" },
    approximateWeightKg: Number,
    estimatedValue: Number,
    unit: { type: String, default: "kg" },
    safetyWarning: String
  },
  { timestamps: true }
);

export default mongoose.model("Material", materialSchema);
