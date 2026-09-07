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
    name: "Battery Scrap",
    category: "e_waste",
    pricePerKg: 95,
    unit: "kg",
    icon: "🔋",
    shortDescription: "Battery detected by the AI model. Handle as hazardous material.",
    safetyWarning: "Do not puncture or open batteries. Wear gloves and eye protection."
  },
  PCB: {
    id: "ai_pcb",
    name: "E-Waste PCB Board",
    category: "e_waste",
    pricePerKg: 240,
    unit: "kg",
    icon: "💻",
    shortDescription: "Circuit board detected by the AI model.",
    safetyWarning: "Do not break or crush circuit boards."
  },
  Television: {
    id: "ai_television",
    name: "Television Scrap",
    category: "e_waste",
    pricePerKg: 120,
    unit: "kg",
    icon: "📺",
    shortDescription: "LCD/LED television detected by the AI model; backlight recovery may contain gallium and indium.",
    safetyWarning: "Handle screens carefully and avoid broken glass."
  },
  "Washing Machine": {
    id: "ai_washing_machine",
    name: "Washing Machine Scrap",
    category: "e_waste",
    pricePerKg: 190,
    unit: "kg",
    icon: "⚙️",
    shortDescription: "Washing machine detected by the AI model.",
    safetyWarning: "Disconnect power and watch for sharp metal edges."
  },
  Keyboard: {
    id: "ai_keyboard",
    name: "Keyboard Scrap",
    category: "e_waste",
    pricePerKg: 120,
    unit: "kg",
    icon: "⌨️",
    shortDescription: "Computer keyboard detected by the AI model.",
    safetyWarning: "Do not burn plastic parts."
  },
  Microwave: {
    id: "ai_microwave",
    name: "Microwave Scrap",
    category: "e_waste",
    pricePerKg: 80,
    unit: "kg",
    icon: "📦",
    shortDescription: "Microwave oven detected by the AI model.",
    safetyWarning: "Do not dismantle the high-voltage capacitor."
  },
  Mobile: {
    id: "ai_mobile",
    name: "Mobile Phone Scrap",
    category: "e_waste",
    pricePerKg: 650,
    unit: "kg",
    icon: "📱",
    shortDescription: "Mobile phone detected by the AI model.",
    safetyWarning: "Remove and isolate swollen batteries safely."
  },
  Mouse: {
    id: "ai_mouse",
    name: "Computer Mouse Scrap",
    category: "e_waste",
    pricePerKg: 100,
    unit: "kg",
    icon: "🖱️",
    shortDescription: "Computer mouse detected by the AI model.",
    safetyWarning: "Do not burn plastic parts."
  },
  Player: {
    id: "ai_player",
    name: "Media Player Scrap",
    category: "e_waste",
    pricePerKg: 90,
    unit: "kg",
    icon: "🎵",
    shortDescription: "Media player detected by the AI model.",
    safetyWarning: "Remove batteries before sorting."
  },
  Printer: {
    id: "ai_printer",
    name: "Printer Scrap",
    category: "e_waste",
    pricePerKg: 75,
    unit: "kg",
    icon: "🖨️",
    shortDescription: "Printer detected by the AI model.",
    safetyWarning: "Avoid toner dust and wear a mask while handling."
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

export const classifyWithGemini = async (imageSrc) => {
  const blob = await fetch(imageSrc).then((response) => response.blob());
  const form = new FormData();
  form.append("photo", blob, "material.jpg");
  return api("/classify", { method: "POST", body: form, auth: true });
};
