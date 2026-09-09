import mongoose from "mongoose";

const stopSchema = new mongoose.Schema(
  {
    lot: { type: mongoose.Schema.Types.ObjectId, ref: "Lot", required: true },
    collector: { type: mongoose.Schema.Types.ObjectId, ref: "Collector", required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    weightKg: { type: Number, default: 0 },
    sequence: { type: Number, required: true },
    status: { type: String, enum: ["pending", "picked_up", "skipped"], default: "pending" }
  },
  { _id: false }
);

const pickupRouteSchema = new mongoose.Schema(
  {
    recycler: { type: mongoose.Schema.Types.ObjectId, ref: "Recycler", required: true, index: true },
    date: { type: Date, required: true, index: true },
    stops: { type: [stopSchema], default: [] },
    totalDistanceKm: { type: Number, default: 0 },
    totalDurationMin: { type: Number, default: 0 },
    routeGeometry: { type: mongoose.Schema.Types.Mixed, default: null },
    status: { type: String, enum: ["active", "completed"], default: "active" }
  },
  { timestamps: true }
);

export default mongoose.model("PickupRoute", pickupRouteSchema);