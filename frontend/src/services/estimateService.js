// ---------------------------------------------------------------------------
// MATERIAL CLASSIFICATION — on-device, fully offline.
//
// Loads the Teachable Machine (MobileNet) model from /AI_Model and runs it in
// the browser via TensorFlow.js. No network call is made at inference time once
// the model files have been fetched.
//
// The model recognises 10 classes (see public/AI_Model/metadata.json). Each is
// mapped below to a material record with a price per kg. Those prices are
// hard-coded placeholders, not live market rates.
// ---------------------------------------------------------------------------
import * as tmImage from "@teachablemachine/image";
import { api } from "./api";

const MODEL_BASE_URL = "/AI_Model/";
const MIN_CONFIDENCE = 65;
const MIN_CONFIDENCE_MARGIN = 8;
let modelPromise;

const modelMaterials = {
  Battery: {
    id: "ai_battery",
    name: "Battery / Li-ion Scrap",
    category: "batteries",
    psCategory: "batteries",
    pricePerKg: 95,
    unit: "kg",
    icon: "🔋",
    shortDescription: "Battery detected — lithium-ion, lead-acid, or button cells. Contains recoverable lithium and cobalt.",
    safetyWarning: "Do not puncture or open batteries. Wear gloves and eye protection. Isolate swollen cells."
  },
  PCB: {
    id: "ai_pcb",
    name: "PCB / Circuit Board",
    category: "PCB",
    psCategory: "PCB",
    pricePerKg: 240,
    unit: "kg",
    icon: "💻",
    shortDescription: "Printed circuit board with copper traces, solder, and IC chips. Contains recoverable gold, copper, and tantalum.",
    safetyWarning: "Do not break or crush circuit boards. Toxic dust may be released."
  },
  Television: {
    id: "ai_television",
    name: "LCD / LED Panel Scrap",
    category: "LCD",
    psCategory: "LCD",
    pricePerKg: 120,
    unit: "kg",
    icon: "📺",
    shortDescription: "LCD/LED display panel detected. Backlight assembly may contain gallium and indium.",
    safetyWarning: "Handle screens carefully. Avoid breaking backlight tubes — mercury risk."
  },
  "Washing Machine": {
    id: "ai_washing_machine",
    name: "Motor & Metal Assembly",
    category: "motors",
    psCategory: "motors",
    pricePerKg: 190,
    unit: "kg",
    icon: "⚙️",
    shortDescription: "Appliance with motor, copper windings, and magnet-bearing assemblies. Contains recoverable copper and neodymium.",
    safetyWarning: "Disconnect power. Watch for sharp metal edges and strong magnets."
  },
  Keyboard: {
    id: "ai_keyboard",
    name: "Mixed Plastic / Keyboard",
    category: "mixed_plastic",
    psCategory: "mixed_plastic",
    pricePerKg: 120,
    unit: "kg",
    icon: "⌨️",
    shortDescription: "Plastic casing with small PCB inside. Mostly ABS/polycarbonate plastic, minor copper traces.",
    safetyWarning: "Do not burn plastic. Send to authorized recycler for formal processing."
  },
  Microwave: {
    id: "ai_microwave",
    name: "Motor & Transformer Assembly",
    category: "motors",
    psCategory: "motors",
    pricePerKg: 80,
    unit: "kg",
    icon: "📦",
    shortDescription: "Appliance with transformer, magnetron motor, and copper windings.",
    safetyWarning: "Do not dismantle the high-voltage capacitor. Lethal charge risk."
  },
  Mobile: {
    id: "ai_mobile",
    name: "Mobile Phone / PCB + Battery",
    category: "PCB",
    psCategory: "PCB",
    pricePerKg: 650,
    unit: "kg",
    icon: "📱",
    shortDescription: "Mobile phone with internal PCB, Li-ion battery, and LCD. Rich in gold, copper, palladium, and cobalt.",
    safetyWarning: "Remove and isolate swollen batteries. Do not crush — battery fire risk."
  },
  Mouse: {
    id: "ai_mouse",
    name: "Mixed Plastic / Mouse",
    category: "mixed_plastic",
    psCategory: "mixed_plastic",
    pricePerKg: 100,
    unit: "kg",
    icon: "🖱️",
    shortDescription: "Plastic casing with micro-PCB and cable. Mostly plastic with minor copper in cable.",
    safetyWarning: "Do not burn plastic parts. Cut cables cleanly."
  },
  Player: {
    id: "ai_player",
    name: "Mixed E-Waste / Player",
    category: "e_waste",
    psCategory: "PCB",
    pricePerKg: 90,
    unit: "kg",
    icon: "🎵",
    shortDescription: "Media player with internal PCB, battery, and plastic housing.",
    safetyWarning: "Remove batteries before sorting. Do not burn casing."
  },
  Printer: {
    id: "ai_printer",
    name: "Mixed Plastic + Motor / Printer",
    category: "mixed_plastic",
    psCategory: "mixed_plastic",
    pricePerKg: 75,
    unit: "kg",
    icon: "🖨️",
    shortDescription: "Printer with motor, plastic housing, PCB, and toner cartridge.",
    safetyWarning: "Avoid toner dust inhalation. Wear a mask while handling."
  },
  CRT: {
    id: "sih_crt",
    name: "CRT Glass and Display Scrap",
    category: "CRT",
    pricePerKg: 8,
    unit: "kg",
    icon: "📺",
    shortDescription: "CRT display material selected from the SIH category list.",
    safetyWarning: "Handle CRT glass carefully. Do not break or dismantle it without protection."
  },
  LCD: {
    id: "sih_lcd",
    name: "LCD Panel Scrap",
    category: "LCD",
    pricePerKg: 50,
    unit: "kg",
    icon: "🖥️",
    shortDescription: "LCD panel material selected from the SIH category list.",
    safetyWarning: "Handle panels carefully and avoid broken glass or sharp edges."
  },
  Cables: {
    id: "sih_cables",
    name: "Mixed Cable Scrap",
    category: "cables",
    pricePerKg: 150,
    unit: "kg",
    icon: "🔌",
    shortDescription: "Cable material selected from the SIH category list.",
    safetyWarning: "Never burn cable insulation. Sort and send cables to an authorized recycler."
  },
  Motors: {
    id: "sih_motors",
    name: "Motor and Magnet Assembly Scrap",
    category: "motors",
    pricePerKg: 45,
    unit: "kg",
    icon: "⚙️",
    shortDescription: "Motor or magnet-bearing assembly selected from the SIH category list.",
    safetyWarning: "Watch for sharp metal edges and keep strong magnets away from sensitive devices."
  },
  "Mixed Plastics": {
    id: "sih_mixed_plastic",
    name: "Mixed Plastic Scrap",
    category: "mixed_plastic",
    pricePerKg: 20,
    unit: "kg",
    icon: "♻️",
    shortDescription: "Mixed plastic material selected from the SIH category list.",
    safetyWarning: "Do not burn plastic. Keep it separated for formal recycling."
  }
};

const loadScanModel = () => {
  if (!modelPromise) {
    modelPromise = tmImage.load(
      `${MODEL_BASE_URL}model.json`,
      `${MODEL_BASE_URL}metadata.json`
    );
  }
  return modelPromise;
};

const imageFromDataUrl = (imageSrc) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The selected image could not be read."));
    image.src = imageSrc;
  });

const checkImageQuality = (image) => {
  const canvas = document.createElement("canvas");
  const size = 64;
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0, size, size);
  const pixels = context.getImageData(0, 0, size, size).data;
  const brightness = [];
  for (let index = 0; index < pixels.length; index += 4) {
    brightness.push((pixels[index] * 0.299) + (pixels[index + 1] * 0.587) + (pixels[index + 2] * 0.114));
  }
  const average = brightness.reduce((sum, value) => sum + value, 0) / brightness.length;
  const variance = brightness.reduce((sum, value) => sum + ((value - average) ** 2), 0) / brightness.length;
  const reasons = [];
  // Teachable Machine resizes inputs to 224px, so reject only genuinely tiny files.
  if (image.naturalWidth < 224 || image.naturalHeight < 160) reasons.push("Use a larger image.");
  if (average < 28) reasons.push("The image is too dark.");
  if (average > 238) reasons.push("The image is overexposed.");
  if (variance < 180) reasons.push("Move closer to the material and reduce the plain background.");
  return { valid: reasons.length === 0, reasons };
};

export const scanMaterial = async (imageSrc) => {
  if (!imageSrc) throw new Error("Please take or upload a photo first.");

  const [model, image] = await Promise.all([
    loadScanModel(),
    imageFromDataUrl(imageSrc)
  ]);

  const quality = checkImageQuality(image);
  if (!quality.valid) {
    return {
      success: false,
      needsRetake: true,
      quality,
      predictions: [],
      message: `Please retake the photo. ${quality.reasons.join(" ")}`
    };
  }

  const predictions = (await model.predict(image))
    .map(({ className, probability }) => ({
      label: className,
      confidence: Math.round(probability * 100)
    }))
    .sort((a, b) => b.confidence - a.confidence);

  const topPrediction = predictions[0];
  const secondPrediction = predictions[1];
  const confidenceMargin = topPrediction.confidence - (secondPrediction?.confidence || 0);
  const accepted = topPrediction.confidence >= MIN_CONFIDENCE && confidenceMargin >= MIN_CONFIDENCE_MARGIN;

  if (!accepted) {
    return {
      success: false,
      needsConfirmation: true,
      candidateMaterial: modelMaterials[topPrediction.label],
      detectedLabel: topPrediction.label,
      confidence: topPrediction.confidence,
      predictions: predictions.slice(0, 3),
      message: "The AI is uncertain. Confirm the suggested category or choose the correct one before creating a lot."
    };
  }

  // Every label in metadata.json has an entry above. This guard only fires if
  // the model is retrained with new classes and this map is not updated — in
  // that case show the label with no price rather than borrowing another
  // material's rate.
  const detected = modelMaterials[topPrediction.label] || {
    id: `ai_${topPrediction.label.toLowerCase().replace(/\s+/g, "_")}`,
    name: topPrediction.label,
    category: "e_waste",
    pricePerKg: 0,
    unit: "kg",
    icon: "📦",
    shortDescription: `${topPrediction.label} detected, but no price is configured for this material yet.`,
    safetyWarning: "Unknown material — handle with gloves and check the safety guide."
  };

  return {
    success: true,
    detectedMaterial: detected,
    detectedLabel: topPrediction.label,
    confidence: topPrediction.confidence,
    predictions: predictions.slice(0, 3),
    imagePreview: imageSrc || null
  };
};

export const getSupportedMaterials = () => Object.entries(modelMaterials).map(([label, material]) => ({ label, ...material }));

export { loadScanModel, modelMaterials };

export const classifyWithGemini = async (imageSrc) => {
  const blob = await fetch(imageSrc).then((response) => response.blob());
  const form = new FormData();
  form.append("photo", blob, "material.jpg");
  return api("/classify", { method: "POST", body: form, auth: true });
};

export const classifyDeep = async (imageSrc) => {
  const blob = await fetch(imageSrc).then((response) => response.blob());
  const form = new FormData();
  form.append("photo", blob, "material.jpg");
  return api("/classify/deep", { method: "POST", body: form, auth: true });
};
