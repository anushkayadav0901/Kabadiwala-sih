import mongoose from "mongoose";

const voiceSessionSchema = new mongoose.Schema(
  {
    phoneNumber: { type: String, required: true, unique: true, index: true },
    callSid: { type: String, default: null },

    language: { type: String, enum: ["hi", "en"], default: null },

    state: {
      type: String,
      enum: [
        "awaiting_language",
        "main_menu",
        "awaiting_material_price",
        "awaiting_material_recycler",
        "awaiting_pincode",
        "confirming_pincode",
        "awaiting_material_safety",
        "awaiting_material_sale",
        "awaiting_weight",
        "awaiting_confirmation",
        "idle"
      ],
      default: "awaiting_language"
    },

    // What the caller is trying to do (price / recycler / safety / sale), set once
    // they pick a main-menu option, so we know where to route after sub-steps.
    intent: { type: String, enum: ["price", "recycler", "safety", "sale", null], default: null },

    pendingMaterial: { type: mongoose.Schema.Types.Mixed, default: null },
    pendingPincode: { type: String, default: null },
    pendingWeight: { type: Number, default: null },
    pendingEstimate: { type: Number, default: null },
    pendingRecycler: { type: mongoose.Schema.Types.ObjectId, ref: "Recycler", default: null },

    needsCallback: { type: Boolean, default: false },
    lastLotReference: { type: String, default: null },

    lastMessageAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export default mongoose.model("VoiceSession", voiceSessionSchema);