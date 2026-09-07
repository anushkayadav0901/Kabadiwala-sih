import mongoose from "mongoose";

const whatsappSessionSchema = new mongoose.Schema(
  {
    phoneNumber: { type: String, required: true, unique: true, index: true },
    state: { type: String, enum: ["idle", "awaiting_weight", "awaiting_confirmation"], default: "idle" },
    pendingMaterial: { type: mongoose.Schema.Types.Mixed, default: null },
    pendingWeight: { type: Number, default: null },
    pendingEstimate: { type: Number, default: null },
    pendingRecycler: { type: mongoose.Schema.Types.ObjectId, ref: "Recycler", default: null },
    lastMessageAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export default mongoose.model("WhatsAppSession", whatsappSessionSchema);
