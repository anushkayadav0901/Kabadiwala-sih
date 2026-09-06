import mongoose from "mongoose";

const priceSchema = new mongoose.Schema(
  {
    materialCategory: { type: String, required: true, index: true },
    location: { type: String, default: "Delhi NCR", index: true },
    priceDate: { type: Date, default: Date.now, index: true },
    buyingPrice: { type: Number, required: true },
    quotedPrice: { type: Number, required: true },
    unit: { type: String, default: "kg" },
    recycler: { type: mongoose.Schema.Types.ObjectId, ref: "Recycler", default: null }
  },
  { timestamps: true }
);

priceSchema.index({ materialCategory: 1, location: 1, priceDate: -1 });
export default mongoose.model("Price", priceSchema);
