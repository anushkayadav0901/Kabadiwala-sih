import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import cors from "cors";
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import multer from "multer";
import twilio from "twilio";
import Collector from "./models/Collector.js";
import Lot from "./models/Lot.js";
import Price from "./models/Price.js";
import PickupRoute from "./models/PickupRoute.js";
import Recycler from "./models/Recycler.js";
import Transaction from "./models/Transaction.js";
import { requireAuth, requireRole } from "./middleware/auth.js";
import { detectAnomalies } from "./services/anomalyDetector.js";
import { classifyImage as geminiClassify, estimatePrice as geminiEstimate, compareHandoverImages, isGeminiConfigured } from "./services/geminiService.js";
import { bountyQuote, calculateCriticalMineralBounty } from "./services/criticalMineralBounty.js";
import { processWhatsAppMessage } from "./services/whatsappService.js";
import { getLiveScrapRates, syncLiveScrapRates } from "./services/metalMandiService.js";
import { deepClassify, isGroqConfigured } from "./services/groqVisionService.js";
import { getEprDashboard, getCollectorEprContribution } from "./services/eprComplianceService.js";
import { computeCollectorAnalytics, computeCpcbReport } from "./services/analyticsService.js";
import { generateRouteForRecycler } from "./services/routeOptimizer.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

const app = express();
const port = Number(process.env.PORT || 5000);
app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(",") || true }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use("/uploads", express.static(uploadsDir));

const storage = multer.diskStorage({
  destination: (_req, _file, done) => done(null, uploadsDir),
  filename: (_req, file, done) => done(null, `${crypto.randomUUID()}${path.extname(file.originalname)}`)
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, done) => done(null, file.mimetype.startsWith("image/"))
});

const publicUser = (user, role) => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  phone: user.phone || user.contact,
  preferredLanguage: user.preferredLanguage || "en",
  locationLat: user.locationLat,
  locationLng: user.locationLng,
  role,
  isLoggedIn: true
});
const signToken = (user, role) => jwt.sign({ sub: user._id.toString(), role }, process.env.JWT_SECRET, { expiresIn: "7d" });
const asObjectId = (id) => mongoose.isValidObjectId(id);
const passportFor = (lot, collector = null, recycler = null) => {
  const payload = {
    version: "kabadi-passport-v1",
    reference: lot.handoverReference,
    lotId: lot._id.toString(),
    collectorId: lot.collector?._id?.toString() || lot.collector?.toString(),
    collectorName: collector?.name,
    recyclerId: lot.matchedRecycler?._id?.toString() || lot.matchedRecycler?.toString(),
    recyclerName: recycler?.name,
    materialSummary: lot.materials.map((material) => ({ name: material.name, category: material.category, weightKg: material.weightKg })),
    totalWeight: lot.totalWeight,
    estimatedValue: lot.estimatedValue,
    criticalMineralBounty: lot.criticalMineralBounty,
    collectionGps: { lat: lot.gpsLat, lng: lot.gpsLng },
    createdAt: lot.createdAt,
    // This stays stable after creation; otherwise Mongoose's updatedAt would
    // invalidate a QR signature immediately after it is saved.
    issuedAt: lot.createdAt
  };
  const signature = crypto.createHmac("sha256", process.env.JWT_SECRET).update(JSON.stringify(payload)).digest("hex");
  return { payload, signature };
};
const scrapDnaFor = async (lot, transaction, recycler) => {
  const materials = lot.materials || [];
  const classificationConfidence = Math.max(0, ...materials.map((item) => Number(item.classificationConfidence || 0)));
  const hasPriceRange = materials.some((item) => Number.isFinite(item.marketRangeMin) && Number.isFinite(item.marketRangeMax));
  const initialWeight = Number(lot.totalWeight || 0);
  const finalWeight = transaction?.finalWeight == null ? null : Number(transaction.finalWeight);
  const weightMismatchPercent = finalWeight == null || !initialWeight
    ? null
    : Number((Math.abs(finalWeight - initialWeight) / initialWeight * 100).toFixed(1));
  const checks = [
    { label: "Original item photo", complete: Boolean(lot.photoUrls?.length), points: 12 },
    { label: "AI material classification", complete: classificationConfidence > 0, points: 8 },
    { label: "Initial weight", complete: initialWeight > 0, points: 10 },
    { label: "Fair-price range snapshot", complete: hasPriceRange, points: 10 },
    { label: "Collection GPS", complete: Number.isFinite(lot.gpsLat) && Number.isFinite(lot.gpsLng), points: 10 },
    { label: "Authorized recycler selected", complete: Boolean(recycler?.authorized), points: 10 },
    { label: "Server-signed Kabadi Passport", complete: Boolean(lot.handoverSignature), points: 15 },
    { label: "Recycler confirmation", complete: Boolean(transaction?.recyclerConfirmedAt), points: 12 },
    { label: "Final depot weight", complete: finalWeight != null, points: 5 },
    { label: "Handover photo", complete: Boolean(transaction?.handoverPhotos?.length || lot.handoverPhotos?.length), points: 4 },
    { label: "Destination status", complete: Boolean(transaction?.destinationStatus && transaction.destinationStatus !== "awaiting_handover"), points: 4 }
  ];
  const score = checks.reduce((total, check) => total + (check.complete ? check.points : 0), 0);
  const destination = transaction?.destinationStatus || "awaiting_handover";
  return {
    passportVersion: "Kabadi Passport 2.0",
    reference: lot.handoverReference,
    lotId: lot._id.toString(),
    traceabilityScore: score,
    verificationLabel: score >= 85 ? "Traceability verified" : score >= 55 ? "Evidence in progress" : "Lot created — evidence pending",
    checks,
    material: materials.map((item) => ({ name: item.name, category: item.category, condition: item.condition || "unknown", classificationConfidence: item.classificationConfidence || null, initialWeightKg: item.weightKg, fairRange: item.marketRangeMin != null ? { min: item.marketRangeMin, max: item.marketRangeMax } : null })),
    originalPhotos: lot.photoUrls || [],
    handoverPhotos: transaction?.handoverPhotos || lot.handoverPhotos || [],
    weights: { initialKg: initialWeight, finalKg: finalWeight, mismatchPercent: weightMismatchPercent, status: finalWeight == null ? "Final weight pending recycler confirmation" : weightMismatchPercent <= 2 ? "Weight matched" : "Weight mismatch needs review" },
    price: { estimatedValue: lot.estimatedValue, quotedPrice: transaction?.quotedPrice ?? null, finalBid: transaction?.finalPrice ?? null },
    collection: { gps: Number.isFinite(lot.gpsLat) && Number.isFinite(lot.gpsLng) ? { lat: lot.gpsLat, lng: lot.gpsLng } : null, location: lot.collectionLocation || null, createdAt: lot.createdAt },
    handover: { gps: transaction?.handoverGps || null, location: transaction?.handoverLocation || lot.handoverLocation || null, signedAt: lot.handedOverAt || null, recyclerConfirmedAt: transaction?.recyclerConfirmedAt || null, signature: lot.handoverSignature ? `${lot.handoverSignature.slice(0, 16)}…` : null },
    recycler: recycler ? { id: recycler._id.toString(), name: recycler.name, authorized: recycler.authorized, registration: recycler.cpcbRegistrationNumber || null } : null,
    destination: { status: destination, note: transaction?.destinationNote || null, label: destination === "recycled" ? "Recycled" : destination === "sorting" ? "At recycler sorting stage" : destination === "received_by_authorized_recycler" ? "Received by authorized recycler" : "Awaiting secure handover" },
    tamperCheck: { status: (transaction?.handoverPhotos?.length || lot.handoverPhotos?.length) ? "Photo evidence captured — AI comparison can be added" : "Handover photo not captured", score: finalWeight == null ? null : Math.max(0, 100 - Math.round(weightMismatchPercent || 0)), note: "Evidence score is based on signed records and weight comparison; it is not a forensic image verdict." }
  };
};
const lotDto = (lot) => ({
  id: lot._id.toString(),
  collector_id: lot.collector?._id?.toString() || lot.collector?.toString(),
  collectors: lot.collector?.name ? { id: lot.collector._id.toString(), name: lot.collector.name, phone: lot.collector.phone } : undefined,
  materials: lot.materials.map((item) => ({ ...item.toObject?.() || item, weight_kg: item.weightKg, price_per_kg: item.pricePerKg })),
  total_weight: lot.totalWeight,
  estimated_value: lot.estimatedValue,
  critical_mineral_bounty: lot.criticalMineralBounty,
  photo_urls: lot.photoUrls,
  gps_lat: lot.gpsLat,
  gps_lng: lot.gpsLng,
  status: lot.status,
  recycler_id: lot.matchedRecycler?._id?.toString() || lot.matchedRecycler?.toString(),
  handover_reference: lot.handoverReference,
  handover_signature: lot.handoverSignature,
  handover_photos: lot.handoverPhotos,
  collection_location: lot.collectionLocation,
  handover_location: lot.handoverLocation,
  recycler_confirmed_at: lot.recyclerConfirmedAt,
  created_at: lot.createdAt,
  updated_at: lot.updatedAt
});
const recyclerDto = (recycler, lat, lng) => {
  const source = recycler.toObject ? recycler.toObject() : recycler;
  let distanceKm = null;
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    const radians = (value) => (value * Math.PI) / 180;
    const dLat = radians(source.locationLat - lat);
    const dLng = radians(source.locationLng - lng);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(lat)) * Math.cos(radians(source.locationLat)) * Math.sin(dLng / 2) ** 2;
    distanceKm = Number((6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2));
  }
  return {
    id: source._id.toString(), name: source.name, ownerName: source.ownerName, rating: source.rating,
    reviewsCount: source.reviewsCount, distanceKm, lat: source.locationLat, lng: source.locationLng,
    address: source.address, phone: source.contact, openHours: source.openHours,
    pickupAvailable: source.pickupAvailable, minPickupWeightKg: source.minPickupWeightKg,
    acceptedCategories: source.materialsAccepted, offeredRates: source.offeredRates,
    verified: source.authorized, authorized: source.authorized,
    cpcbRegistrationNumber: source.cpcbRegistrationNumber,
    cpcbAuthorizationValidUntil: source.cpcbAuthorizationValidUntil,
    authorizationSource: source.authorizationSource,
    authorizationLastVerifiedAt: source.authorizationLastVerifiedAt,
      criticalMineralCertified: source.criticalMineralCertified,
      criticalMineralsCertified: source.criticalMineralsCertified || [],
      criticalMineralCertificationAuthority: source.criticalMineralCertificationAuthority,
    serviceArea: source.serviceArea || [],
    eprPartners: source.eprPartners || [],
    proNetwork: source.proNetwork || null
  };
};

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.post("/api/whatsapp/webhook", async (req, res) => {
  const twiml = new twilio.twiml.MessagingResponse();
  try {
    const mediaUrl = req.body.MediaUrl0 || req.body.MediaUrl || req.body.mediaUrl || null;
    const mediaType = req.body.MediaContentType0 || req.body.MediaContentType || req.body.mediaType || "";
    console.log("WhatsApp inbound:", { from: req.body.From, mediaCount: req.body.NumMedia || 0, mediaType, hasMediaUrl: Boolean(mediaUrl) });
    const reply = await processWhatsAppMessage({
      from: req.body.From,
      body: req.body.Body,
      mediaUrl,
      mediaType
    });
    twiml.message(reply);
  } catch (error) {
    console.error("WhatsApp webhook error:", error);
    twiml.message("Something went wrong while processing that message. Please try again or send SAFETY for handling guidance.");
  }
  res.type("text/xml").send(twiml.toString());
});

app.post("/api/auth/register", async (req, res, next) => {
  try {
    const { role = "collector", name, email, phone, password, preferredLanguage, locationLat, locationLng, contact, registrationId, materialsAccepted, offeredRates, pickupAvailable } = req.body;
    if (!name || !password || password.length < 6 || !["collector", "recycler"].includes(role)) {
      return res.status(400).json({ message: "Name, a 6+ character password, and a valid role are required" });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    let user;
    if (role === "collector") {
      if (!phone) return res.status(400).json({ message: "Phone number is required for collectors" });
      if (await Collector.exists({ phone })) return res.status(409).json({ message: "An account already exists for this phone number" });
      user = await Collector.create({ name, phone, email, passwordHash, preferredLanguage, locationLat, locationLng });
    } else {
      if (!email) return res.status(400).json({ message: "Email is required for recyclers" });
      if (await Recycler.exists({ email: email.toLowerCase() })) return res.status(409).json({ message: "An account already exists for this email" });
      user = await Recycler.create({ name, email, passwordHash, contact: contact || email, cpcbRegistrationNumber: registrationId, locationLat, locationLng, materialsAccepted, offeredRates, pickupAvailable, authorized: false });
    }
    res.status(201).json({ token: signToken(user, role), user: publicUser(user, role) });
  } catch (error) { next(error); }
});

app.post("/api/auth/login", async (req, res, next) => {
  try {
    const { phone, email, password, role } = req.body;
    const isRecycler = role === "recycler" || Boolean(email);
    const user = isRecycler
      ? await Recycler.findOne({ email: String(email || "").toLowerCase() }).select("+passwordHash")
      : await Collector.findOne({ phone }).select("+passwordHash");
    if (!user || !(await bcrypt.compare(password || "", user.passwordHash))) return res.status(401).json({ message: "Incorrect login details" });
    const userRole = isRecycler ? "recycler" : "collector";
    res.json({ token: signToken(user, userRole), user: publicUser(user, userRole) });
  } catch (error) { next(error); }
});

app.post("/api/lots", requireAuth, requireRole("collector"), upload.single("photo"), async (req, res, next) => {
  try {
    const body = req.body;
    const materials = typeof body.materials === "string" ? JSON.parse(body.materials) : (body.materials || []);
    const photoUrls = typeof body.photoUrls === "string" ? JSON.parse(body.photoUrls) : (body.photoUrls || []);
    if (req.file) photoUrls.push(`/uploads/${req.file.filename}`);
    const estimatedValue = Number(body.estimatedValue ?? body.estimated_value);
    const normalizedMaterials = materials.map((item) => ({ name: item.name, category: item.category, subCategory: item.subCategory ?? item.sub_category, description: item.description, condition: item.condition || "unknown", sourceType: item.sourceType || "collector", weightKg: item.weightKg ?? item.weight_kg, pricePerKg: item.pricePerKg ?? item.price_per_kg, marketRangeMin: item.marketRangeMin ?? item.market_range_min, marketRangeMax: item.marketRangeMax ?? item.market_range_max, classificationConfidence: item.classificationConfidence ?? item.classification_confidence }));
    const lot = await Lot.create({
      collector: req.auth.sub,
      materials: normalizedMaterials,
      totalWeight: Number(body.totalWeight ?? body.total_weight),
      estimatedValue,
      criticalMineralBounty: calculateCriticalMineralBounty(normalizedMaterials, estimatedValue),
      photoUrls, gpsLat: body.gpsLat ?? body.gps_lat, gpsLng: body.gpsLng ?? body.gps_lng,
      collectionLocation: body.collectionLocation ?? body.collection_location,
      handoverReference: `KBC-${crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`
    });
    const collector = await Collector.findById(req.auth.sub).select("name");
    const { payload, signature } = passportFor(lot, collector);
    lot.handoverSignature = signature;
    await lot.save();
    res.status(201).json({ lot: lotDto(lot), passport: { ...payload, signature } });
  } catch (error) { next(error); }
});

app.get("/api/lots", requireAuth, requireRole("recycler"), async (_req, res, next) => {
  try {
    const lots = await Lot.find({
      $or: [
        { status: "created" },
        { status: { $in: ["matched", "handover"] }, matchedRecycler: _req.auth.sub }
      ]
    }).populate("collector", "name phone").sort({ createdAt: -1 });
    res.json({ lots: lots.map(lotDto) });
  } catch (error) { next(error); }
});

app.post("/api/routes/generate", requireAuth, requireRole("recycler"), async (req, res, next) => {
  try {
    const route = await generateRouteForRecycler(req.auth.sub);
    if (!route) return res.json({ route: null, message: "At least two matched lots with location data are needed to build a route" });
    res.status(201).json({ route });
  } catch (error) { next(error); }
});

app.get("/api/routes/:recyclerId/today", async (req, res, next) => {
  try {
    if (!asObjectId(req.params.recyclerId)) return res.status(400).json({ message: "Invalid recycler id" });
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const route = await PickupRoute.findOne({ recycler: req.params.recyclerId, date: { $gte: start, $lt: end }, status: "active" })
      .populate("recycler", "name locationLat locationLng")
      .populate("stops.lot")
      .populate("stops.collector", "name phone");
    res.json({ route: route || null });
  } catch (error) { next(error); }
});

app.patch("/api/routes/:routeId/stop/:lotId", requireAuth, requireRole("recycler"), async (req, res, next) => {
  try {
    if (!asObjectId(req.params.routeId) || !asObjectId(req.params.lotId)) return res.status(400).json({ message: "Invalid route or lot id" });
    if (!["picked_up", "skipped"].includes(req.body.status)) return res.status(400).json({ message: "Stop status must be picked_up or skipped" });
    const route = await PickupRoute.findOne({ _id: req.params.routeId, recycler: req.auth.sub, "stops.lot": req.params.lotId });
    if (!route) return res.status(404).json({ message: "Route stop not found" });
    const stop = route.stops.find((item) => item.lot.toString() === req.params.lotId);
    stop.status = req.body.status;
    if (route.stops.every((item) => item.status !== "pending")) route.status = "completed";
    await route.save();
    await route.populate([{ path: "recycler", select: "name locationLat locationLng" }, { path: "stops.lot" }, { path: "stops.collector", select: "name phone" }]);
    res.json({ route });
  } catch (error) { next(error); }
});

app.get("/api/lots/collector/:id", requireAuth, async (req, res, next) => {
  try {
    if (req.auth.role !== "collector" || req.auth.sub !== req.params.id) return res.status(403).json({ message: "You can only view your own lots" });
    const lots = await Lot.find({ collector: req.params.id }).sort({ createdAt: -1 });
    res.json({ lots: lots.map(lotDto) });
  } catch (error) { next(error); }
});

app.get("/api/lots/:id/passport", requireAuth, async (req, res, next) => {
  try {
    const lot = await Lot.findById(req.params.id).populate("collector", "name phone").populate("matchedRecycler", "name cpcbRegistrationNumber authorized");
    if (!lot) return res.status(404).json({ message: "Lot not found" });
    const collectorId = lot.collector?._id?.toString() || lot.collector?.toString();
    const recyclerId = lot.matchedRecycler?._id?.toString() || lot.matchedRecycler?.toString();
    if (req.auth.sub !== collectorId && req.auth.sub !== recyclerId) return res.status(403).json({ message: "You cannot view this Kabadi Passport" });
    const { payload, signature } = passportFor(lot, lot.collector, lot.matchedRecycler);
    res.json({ passport: { ...payload, signature, status: lot.status, recyclerConfirmedAt: lot.recyclerConfirmedAt } });
  } catch (error) { next(error); }
});

// A collector chooses the depot before showing the QR. The resulting signed
// payload is therefore bound to that one recycler, not merely to a browser tab.
app.post("/api/lots/:id/passport", requireAuth, requireRole("collector"), async (req, res, next) => {
  try {
    const lot = await Lot.findById(req.params.id);
    if (!lot) return res.status(404).json({ message: "Lot not found" });
    if (lot.collector.toString() !== req.auth.sub) return res.status(403).json({ message: "You can only prepare your own handover" });
    if (["handover", "completed", "cancelled"].includes(lot.status)) return res.status(409).json({ message: "This lot can no longer be prepared for handover" });
    if (!asObjectId(req.body.recyclerId)) return res.status(400).json({ message: "Choose an authorized recycler" });
    const recycler = await Recycler.findOne({ _id: req.body.recyclerId, authorized: true }).select("name");
    if (!recycler) return res.status(400).json({ message: "The selected recycler is not currently authorized" });
    lot.matchedRecycler = recycler._id;
    lot.status = "matched";
    const collector = await Collector.findById(lot.collector).select("name");
    const { payload, signature } = passportFor(lot, collector, recycler);
    lot.handoverSignature = signature;
    await lot.save();
    res.json({ passport: { ...payload, signature, status: lot.status, recyclerConfirmedAt: lot.recyclerConfirmedAt }, lot: lotDto(lot) });
  } catch (error) { next(error); }
});

app.put("/api/lots/:id/match", requireAuth, requireRole("recycler"), async (req, res, next) => {
  try {
    if (!asObjectId(req.params.id)) return res.status(400).json({ message: "Invalid lot id" });
    const lot = await Lot.findById(req.params.id);
    if (!lot || lot.status !== "created") return res.status(404).json({ message: "Pending lot not found" });
    const recyclerAccount = await Recycler.findOne({ _id: req.auth.sub, authorized: true }).select("name criticalMineralCertified criticalMineralsCertified");
    if (!recyclerAccount) return res.status(403).json({ message: "Only an authorized recycler account can accept a lot" });
    lot.status = "matched"; lot.matchedRecycler = req.auth.sub;
    const collector = await Collector.findById(lot.collector).select("name");
    const { signature } = passportFor(lot, collector, recyclerAccount);
    lot.handoverSignature = signature;
    await lot.save();
    const quote = bountyQuote(lot, recyclerAccount);
    const transaction = await Transaction.create({ lot: lot._id, collector: lot.collector, recycler: req.auth.sub, quotedPrice: Math.max(Number(req.body.quotedPrice ?? 0), quote.amount), handoverReference: lot.handoverReference, materialCategory: lot.materials[0]?.category, collectionLocation: lot.collectionLocation, collectionGps: { lat: lot.gpsLat, lng: lot.gpsLng }, signature });
    res.json({ lot: lotDto(lot), transaction });
  } catch (error) { next(error); }
});

app.post("/api/lots/:id/handover", requireAuth, async (req, res, next) => {
  try {
    const lot = await Lot.findById(req.params.id);
    if (!lot) return res.status(404).json({ message: "Lot not found" });
    const recyclerId = req.auth.role === "recycler" ? req.auth.sub : req.body.recyclerId || lot.matchedRecycler?.toString();
    if (!recyclerId || !asObjectId(recyclerId)) return res.status(400).json({ message: "A recycler is required to complete handover" });
    if (req.auth.role === "collector" && lot.collector.toString() !== req.auth.sub) return res.status(403).json({ message: "You can only complete your own handover" });
    const recyclerAccount = await Recycler.findOne({ _id: recyclerId, authorized: true }).select("criticalMineralCertified criticalMineralsCertified");
    if (!recyclerAccount) return res.status(400).json({ message: "Recycler not found or not authorized" });
    if (lot.matchedRecycler && lot.matchedRecycler.toString() !== recyclerId) return res.status(409).json({ message: "This lot is already matched to another recycler" });
    if (req.auth.role === "recycler" && (!req.body.signature || req.body.signature !== lot.handoverSignature)) return res.status(400).json({ message: "A valid Kabadi Passport signature is required for recycler confirmation" });
    if (req.body.signature && lot.handoverSignature && req.body.signature !== lot.handoverSignature) return res.status(400).json({ message: "Invalid Kabadi Passport signature" });
    const handoverReference = lot.handoverReference || `KBC-${crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
    const isRecyclerConfirmation = req.auth.role === "recycler";
    const handoverPhotos = req.body.handoverPhotos || lot.handoverPhotos || [];
    const quote = bountyQuote(lot, recyclerAccount);
    const update = {
      lot: lot._id, collector: lot.collector, recycler: recyclerId, quotedPrice: Math.max(Number(req.body.quotedPrice ?? 0), quote.amount),
      handoverReference, paymentMethod: req.body.paymentMethod || "cash", materialCategory: lot.materials[0]?.category,
      collectionLocation: lot.collectionLocation, handoverLocation: req.body.handoverLocation,
      collectionGps: { lat: lot.gpsLat, lng: lot.gpsLng }, handoverGps: req.body.handoverGps,
      handoverPhotos, signature: lot.handoverSignature,
      ...(isRecyclerConfirmation ? { finalPrice: Math.max(Number(req.body.finalPrice ?? 0), quote.amount), finalWeight: Number(req.body.finalWeight ?? lot.totalWeight), paymentStatus: "paid", status: "completed", recyclerConfirmedAt: new Date(), completedAt: new Date(), destinationStatus: "received_by_authorized_recycler" } : { paymentStatus: "pending", status: "handover", destinationStatus: "awaiting_handover" })
    };
    const transaction = await Transaction.findOneAndUpdate({ lot: lot._id }, update, { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true });
    lot.status = isRecyclerConfirmation ? "completed" : "handover";
    lot.matchedRecycler = recyclerId; lot.handoverReference = handoverReference; lot.handedOverAt = new Date();
    lot.handoverLocation = req.body.handoverLocation || lot.handoverLocation; lot.handoverPhotos = handoverPhotos;
    if (isRecyclerConfirmation) lot.recyclerConfirmedAt = new Date();
    await lot.save();
    let anomaly = null;
    if (isRecyclerConfirmation) {
      try { anomaly = await detectAnomalies(transaction, lot); } catch (_) { /* non-blocking */ }
    }
    res.json({ lot: lotDto(lot), transaction, verification: { verified: isRecyclerConfirmation, signature: lot.handoverSignature }, anomaly });
  } catch (error) { next(error); }
});

app.get("/api/lots/:id/scrap-dna", requireAuth, async (req, res, next) => {
  try {
    const lot = await Lot.findById(req.params.id).populate("collector", "name phone").populate("matchedRecycler", "name authorized cpcbRegistrationNumber");
    if (!lot) return res.status(404).json({ message: "Lot not found" });
    const collectorId = lot.collector?._id?.toString() || lot.collector?.toString();
    const recyclerId = lot.matchedRecycler?._id?.toString() || lot.matchedRecycler?.toString();
    if (req.auth.sub !== collectorId && req.auth.sub !== recyclerId) return res.status(403).json({ message: "You cannot view this Scrap DNA record" });
    const transaction = await Transaction.findOne({ lot: lot._id });
    const dna = await scrapDnaFor(lot, transaction, lot.matchedRecycler);
    res.json({ dna });
  } catch (error) { next(error); }
});

app.put("/api/lots/:id/destination", requireAuth, requireRole("recycler"), async (req, res, next) => {
  try {
    const allowed = ["received_by_authorized_recycler", "sorting", "recycled"];
    if (!allowed.includes(req.body.destinationStatus)) return res.status(400).json({ message: "Invalid destination status" });
    const lot = await Lot.findById(req.params.id);
    if (!lot || lot.matchedRecycler?.toString() !== req.auth.sub) return res.status(404).json({ message: "Matched lot not found" });
    const transaction = await Transaction.findOneAndUpdate({ lot: lot._id }, { destinationStatus: req.body.destinationStatus, destinationNote: req.body.destinationNote || "" }, { new: true });
    if (!transaction) return res.status(404).json({ message: "Transaction not found" });
    res.json({ transaction });
  } catch (error) { next(error); }
});

app.post("/api/classify", requireAuth, upload.single("photo"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "A photo is required" });
    const filePath = req.file.path;
    if (isGeminiConfigured()) {
      const result = await geminiClassify(filePath);
      if (result) return res.json({ source: "gemini", ...result });
    }
    res.json({ source: "none", message: "No AI classification backend configured. Use the on-device TF.js model." });
  } catch (error) { next(error); }
});

app.post("/api/classify/deep", requireAuth, upload.single("photo"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "A photo is required" });
    if (!isGroqConfigured()) return res.status(503).json({ message: "Deep AI classification is not configured" });
    const result = await deepClassify(req.file.path);
    if (!result) return res.status(422).json({ message: "Could not classify this image. Try a clearer photo." });
    res.json(result);
  } catch (error) { next(error); }
});

app.post("/api/estimate", requireAuth, upload.single("photo"), async (req, res, next) => {
  try {
    const { weight, category, condition } = req.body;
    if (isGeminiConfigured() && req.file) {
      const result = await geminiEstimate(req.file.path, weight, category, condition);
      if (result) return res.json({ source: "gemini", ...result });
    }
    const prices = await Price.findOne({ materialCategory: category }).sort({ priceDate: -1 });
    if (prices) {
      const mid = (prices.marketRangeMin + prices.marketRangeMax) / 2;
      const condFactor = { good: 1, fair: 0.85, poor: 0.7 }[condition] || 0.8;
      const w = Number(weight) || 1;
      return res.json({ source: "price_db", estMin: Math.round(prices.marketRangeMin * condFactor * w), estMax: Math.round(prices.marketRangeMax * condFactor * w), reasoning: `Based on ${category} price data with ${condition} condition factor` });
    }
    res.json({ source: "none", message: "No pricing data available" });
  } catch (error) { next(error); }
});

app.get("/api/transactions/:id/anomaly", requireAuth, async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.id).populate("lot");
    if (!transaction) return res.status(404).json({ message: "Transaction not found" });
    const anomaly = await detectAnomalies(transaction, transaction.lot);
    res.json(anomaly);
  } catch (error) { next(error); }
});

app.get("/api/anomalies/scan", requireAuth, async (req, res, next) => {
  try {
    const days = Math.min(Number(req.query.days) || 30, 90);
    const since = new Date(Date.now() - days * 86400000);
    const transactions = await Transaction.find({ createdAt: { $gte: since } }).populate("lot").sort({ createdAt: -1 }).limit(200);
    const results = [];
    for (const tx of transactions) {
      const anomaly = await detectAnomalies(tx, tx.lot);
      if (anomaly.isAnomalous) {
        results.push({
          transactionId: tx._id,
          lotId: tx.lot?._id,
          collector: tx.collector,
          recycler: tx.recycler,
          materialCategory: tx.materialCategory || tx.lot?.materials?.[0]?.category,
          totalWeight: tx.lot?.totalWeight,
          quotedPrice: tx.quotedPrice,
          finalPrice: tx.finalPrice,
          createdAt: tx.createdAt,
          ...anomaly
        });
      }
    }
    const summary = {
      scanned: transactions.length,
      flagged: results.length,
      high: results.filter((r) => r.severity === "high").length,
      medium: results.filter((r) => r.severity === "medium").length,
      low: results.filter((r) => r.severity === "low").length,
    };
    res.json({ summary, anomalies: results });
  } catch (error) { next(error); }
});

app.get("/api/anomalies/check-lot/:lotId", requireAuth, async (req, res, next) => {
  try {
    const lot = await Lot.findById(req.params.lotId);
    if (!lot) return res.status(404).json({ message: "Lot not found" });
    const mockTx = { materialCategory: lot.materials?.[0]?.category, quotedPrice: lot.estimatedValue, collector: lot.collector, createdAt: lot.createdAt };
    const anomaly = await detectAnomalies(mockTx, lot);
    res.json(anomaly);
  } catch (error) { next(error); }
});

app.get("/api/recyclers", async (req, res, next) => {
  try {
    const { material, location, lat, lng, weight, lotId, eprProducer } = req.query;
    const lot = asObjectId(lotId) ? await Lot.findById(lotId).select("materials criticalMineralBounty") : null;
    const query = { authorized: true };
    if (eprProducer) query.eprPartners = eprProducer.toLowerCase();
    const groupForMaterial = (value = "") => {
      const normalized = value.toLowerCase();
      if (["pcb", "lcd", "crt", "mobile", "television", "keyboard", "mouse", "printer", "microwave", "player"].includes(normalized)) return "e_waste";
      if (["batteries", "battery", "motors"].includes(normalized)) return "hazardous";
      if (["mixed_plastic", "plastic"].includes(normalized)) return "plastic";
      if (["copper", "aluminum", "brass", "steel", "cables", "metal"].includes(normalized)) return "metal";
      return normalized;
    };
    const requestedMaterial = material && material !== "all" ? material : lot?.materials?.[0]?.category;
    const materialGroup = requestedMaterial ? groupForMaterial(requestedMaterial) : null;
    if (materialGroup) query.materialsAccepted = materialGroup;
    if (location) query.address = new RegExp(location, "i");
    const recyclers = await Recycler.find(query).sort({ rating: -1 });
    const mapped = recyclers.map((recycler) => recyclerDto(recycler, Number(lat), Number(lng)));
    const offeredRates = mapped.map((recycler) => Number(recycler.offeredRates?.[requestedMaterial] || 0)).filter(Boolean);
    const topRate = Math.max(...offeredRates, 1);
    const requestedWeight = Number(weight || 0);
    const ranked = mapped.map((recycler) => {
      const rate = Number(recycler.offeredRates?.[requestedMaterial] || 0);
      const materialFit = !materialGroup || recycler.acceptedCategories.includes(materialGroup);
      const distanceScore = recycler.distanceKm == null ? 10 : Math.max(0, 20 - (recycler.distanceKm / 20) * 20);
      const rateScore = rate ? (rate / topRate) * 20 : 8;
      const pickupEligible = recycler.pickupAvailable && (!requestedWeight || requestedWeight >= Number(recycler.minPickupWeightKg || 0));
      const certifiedForBounty = Boolean(lot?.criticalMineralBounty?.eligible && recycler.criticalMineralCertified && lot.criticalMineralBounty.minerals.some((mineral) => recycler.criticalMineralsCertified.includes(mineral)));
      const eprMatch = eprProducer && recycler.eprPartners?.includes(eprProducer.toLowerCase());
      const score = Math.round((recycler.authorized ? 25 : 0) + (materialFit ? 25 : 0) + distanceScore + rateScore + (pickupEligible ? 10 : 0) + (certifiedForBounty ? 25 : 0) + (eprMatch ? 20 : 0));
      const matchReasons = [
        recycler.authorized && "CPCB-authorized recycler",
        eprMatch && `EPR partner: ${eprProducer} via ${recycler.proNetwork || "PRO network"}`,
        materialFit && `Accepts ${materialGroup || "your material"}`,
        rate && `Offers ₹${rate}/kg`,
        recycler.distanceKm != null && `${recycler.distanceKm} km away`,
        pickupEligible && "Pickup available for this lot",
        certifiedForBounty && "Certified critical-mineral extraction"
      ].filter(Boolean);
      return { ...recycler, offeredRate: rate || null, matchScore: score, matchReasons, pickupEligible, eprMatch: !!eprMatch, rateBonus: certifiedForBounty ? lot.criticalMineralBounty.label : null, criticalMineralBounty: lot ? { ...lot.criticalMineralBounty, certifiedForBounty } : null };
    }).sort((a, b) => b.matchScore - a.matchScore || (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    res.json({ recyclers: ranked, scoring: { material: requestedMaterial || "all", weights: { authorization: 25, materialFit: 25, distance: 20, offeredRate: 20, pickup: 10, criticalMineralCertification: 25 } } });
  } catch (error) { next(error); }
});

app.get("/api/prices/live", async (req, res, next) => {
  try {
    const data = await getLiveScrapRates();
    res.json(data);
  } catch (error) { next(error); }
});

app.post("/api/prices/sync", async (req, res, next) => {
  try {
    const cityId = req.body?.cityId ? Number(req.body.cityId) : 113;
    const cityName = req.body?.cityName || "Central Delhi, Delhi NCR";
    const data = await syncLiveScrapRates(cityId, cityName);
    res.json({ success: true, message: "MetalMandi scrap rates synchronized successfully", data });
  } catch (error) { next(error); }
});

// ── EPR Producer Compliance ──────────────────────────────────────────
app.get("/api/epr/dashboard", (req, res, next) => {
  try {
    res.json(getEprDashboard());
  } catch (error) { next(error); }
});

app.get("/api/epr/my-contribution", requireAuth, async (req, res, next) => {
  try {
    const data = await getCollectorEprContribution(req.auth.sub);
    res.json(data);
  } catch (error) { next(error); }
});

app.get("/api/prices", async (req, res, next) => {
  try {
    const match = req.query.location ? { location: req.query.location } : {};
    const prices = await Price.aggregate([{ $match: match }, { $sort: { priceDate: -1 } }, { $group: { _id: "$materialCategory", price: { $first: "$$ROOT" } } }, { $replaceRoot: { newRoot: "$price" } }, { $sort: { materialCategory: 1 } }]);
    
    // If prices collection has records, return them; otherwise return live master document
    if (prices && prices.length > 0) {
      return res.json({ prices: prices.map((price) => ({ id: price._id.toString(), materialCategory: price.materialCategory, location: price.location, priceDate: price.priceDate, buyingPrice: price.buyingPrice, quotedPrice: price.quotedPrice, marketRangeMin: price.marketRangeMin ?? price.buyingPrice, marketRangeMax: price.marketRangeMax ?? price.quotedPrice, unit: price.unit, source: price.source, confidence: price.confidence })) });
    }

    const liveDoc = await getLiveScrapRates();
    res.json({
      prices: liveDoc.materials.map((m) => ({
        id: m.id,
        materialCategory: m.id,
        location: m.city,
        priceDate: m.lastSyncedAt,
        buyingPrice: m.marketRangeMin,
        quotedPrice: m.pricePerKg,
        marketRangeMin: m.marketRangeMin,
        marketRangeMax: m.marketRangeMax,
        unit: m.unit,
        source: m.source,
        confidence: "high"
      }))
    });
  } catch (error) { next(error); }
});

app.get("/api/prices/:category/trend", async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.days) || 30, 365);
    const prices = await Price.find({ materialCategory: req.params.category, ...(req.query.location ? { location: req.query.location } : {}) }).sort({ priceDate: -1 }).limit(limit).sort({ priceDate: 1 });
    res.json({ prices });
  } catch (error) { next(error); }
});

app.get("/api/collector/:id/ledger", requireAuth, requireRole("collector"), async (req, res, next) => {
  try {
    if (req.auth.sub !== req.params.id) return res.status(403).json({ message: "You can only view your own ledger" });
    const transactions = await Transaction.find({ collector: req.params.id }).populate("lot").populate("recycler", "name").sort({ createdAt: -1 });
    const now = new Date(); const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()); const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const sum = (list) => list.reduce((total, transaction) => total + Number(transaction.finalPrice || 0), 0);
    const paid = transactions.filter((tx) => tx.paymentStatus === "paid");
    const pending = transactions.filter((tx) => tx.paymentStatus !== "paid");
    const pendingDues = pending.reduce((total, tx) => total + Number(tx.finalPrice ?? tx.quotedPrice ?? 0), 0);
    res.json({ summary: { totalEarnings: sum(paid), todayEarnings: sum(paid.filter((tx) => tx.completedAt >= startOfToday)), monthlyEarnings: sum(paid.filter((tx) => tx.completedAt >= startOfMonth)), completedDeals: paid.length, pendingDues, pendingDeals: pending.length, formalWeightKg: Number(transactions.reduce((total, tx) => total + Number(tx.lot?.totalWeight || 0), 0).toFixed(2)) }, transactions: transactions.map((tx) => { const amount = tx.finalPrice ?? tx.quotedPrice ?? 0; return ({ id: tx._id.toString(), date: tx.completedAt || tx.createdAt, materialName: tx.lot?.materials?.map((material) => material.name).filter(Boolean).join(", ") || "Scrap lot", weightKg: tx.lot?.totalWeight || 0, pricePerKg: tx.lot?.totalWeight ? Number((amount / tx.lot.totalWeight).toFixed(2)) : 0, totalAmount: amount, recyclerName: tx.recycler?.name || "Authorized recycler", status: tx.paymentStatus === "paid" ? "Paid" : "Pending confirmation", handoverRef: tx.handoverReference }); }) });
  } catch (error) { next(error); }
});

app.get("/api/collector/:id/analytics", requireAuth, requireRole("collector"), async (req, res, next) => {
  try {
    if (req.auth.sub !== req.params.id) return res.status(403).json({ message: "You can only view your own analytics" });
    const days = Math.min(Math.max(Number(req.query.days) || 30, 7), 365);
    res.json(await computeCollectorAnalytics(req.params.id, days));
  } catch (error) { next(error); }
});

app.get("/api/reports/cpcb", requireAuth, async (req, res, next) => {
  try {
    const { from, to, region } = req.query;
    res.json(await computeCpcbReport({ from, to, region }));
  } catch (error) { next(error); }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  if (error instanceof multer.MulterError) return res.status(400).json({ message: error.message });
  if (error.name === "ValidationError") return res.status(400).json({ message: error.message });
  if (error.code === 11000) return res.status(409).json({ message: "That record already exists" });
  res.status(500).json({ message: "Something went wrong on the server" });
});

mongoose.connect(process.env.MONGODB_URI).then(() => app.listen(port, () => console.log(`API listening on http://localhost:${port}`))).catch((error) => { console.error("MongoDB connection failed:", error.message); process.exit(1); });
