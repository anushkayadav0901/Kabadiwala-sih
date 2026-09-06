import mongoose from "mongoose";

const materialSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, index: true },
    description: String,
    unit: { type: String, default: "kg" },
    safetyWarning: String
  },
  { timestamps: true }
);

export default mongoose.model("Material", materialSchema);
