import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    lot: { type: mongoose.Schema.Types.ObjectId, ref: "Lot", required: true, index: true },
    collector: { type: mongoose.Schema.Types.ObjectId, ref: "Collector", required: true, index: true },
    recycler: { type: mongoose.Schema.Types.ObjectId, ref: "Recycler", required: true },
    quotedPrice: { type: Number, required: true },
    finalPrice: Number,
    handoverReference: { type: String, required: true, unique: true },
    paymentMethod: { type: String, enum: ["cash", "upi", "bank", "pending"], default: "pending" },
    paymentStatus: { type: String, enum: ["pending", "paid"], default: "pending" },
    status: { type: String, enum: ["matched", "completed"], default: "matched" },
    completedAt: Date
  },
  { timestamps: true }
);

export default mongoose.model("Transaction", transactionSchema);
