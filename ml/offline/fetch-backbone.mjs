// ---------------------------------------------------------------------------
// RESTORE THE MOBILENETV2 BACKBONE
//
// feature-worker.mjs expects a standalone MobileNetV2 (alpha 0.35, 224px)
// layers-model at ml/experiments/_pretrained/mobilenet_v2_0.35_224/. That
// directory is not versioned, so this script rebuilds it from the one source
// guaranteed to match what the app runs: the deployed model in
// frontend/public/AI_Model/ (read-only). The backbone is every weight tensor
// except the head's dense layers, with the functional sub-config lifted out
// of the deployed topology unchanged.
//
// Verification is numerical, not structural: the restored extractor and the
// deployed model's own trunk must produce identical embeddings on the same
// input. Run: node ml/offline/fetch-backbone.mjs
// ---------------------------------------------------------------------------
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { IMAGE_SIZE, mulberry32 } from "./image-io.mjs";

const require = createRequire(import.meta.url);
const tf = require("@tensorflow/tfjs");

const ML = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEPLOYED = path.join(ML, "..", "frontend", "public", "AI_Model");
const OUT = path.join(ML, "experiments", "_pretrained", "mobilenet_v2_0.35_224");

const modelJson = JSON.parse(fs.readFileSync(path.join(DEPLOYED, "model.json"), "utf8"));
const weightBytes = fs.readFileSync(path.join(DEPLOYED, "weights.bin"));
const top = (modelJson.modelTopology.model_config || modelJson.modelTopology).config;
const mobilenet = top.layers[0].config.layers[0]; // Sequential[ Model(155 layers), GAP ]
if (mobilenet.class_name !== "Model" || !mobilenet.config?.layers?.length) {
  throw new Error("deployed topology is not Sequential[Sequential[Model, GAP], ...] as expected");
}

const allSpecs = modelJson.weightsManifest.flatMap((g) => g.weights);
const isHead = (name) => /^dense_/i.test(name);
const baseSpecs = allSpecs.filter((w) => !isHead(w.name));
const headSpecs = allSpecs.filter((w) => isHead(w.name));
console.log(`deployed tensors: ${allSpecs.length} total, ${baseSpecs.length} backbone, ${headSpecs.length} head`);

// Slice each backbone tensor out of weights.bin by cumulative offset.
const slices = [];
let offset = 0;
for (const spec of allSpecs) {
  const bytes = spec.shape.reduce((a, b) => a * b, 1) * 4;
  if (!isHead(spec.name)) slices.push(weightBytes.subarray(offset, offset + bytes));
  offset += bytes;
}
if (offset !== weightBytes.length) throw new Error(`manifest covers ${offset} bytes but weights.bin is ${weightBytes.length}`);

const backboneJson = {
  modelTopology: {
    class_name: "Model",
    config: mobilenet.config,
    keras_version: modelJson.modelTopology.keras_version || "tfjs-layers 1.3.1",
    backend: "tensorflow.js",
  },
  format: "layers-model",
  generatedBy: modelJson.generatedBy || "TensorFlow.js v1.3.1",
  convertedBy: null,
  weightsManifest: [{ paths: ["weights.bin"], weights: baseSpecs }],
};

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "model.json"), JSON.stringify(backboneJson));
fs.writeFileSync(path.join(OUT, "weights.bin"), Buffer.concat(slices));
console.log(`wrote ${path.relative(ML, OUT)} (${baseSpecs.length} tensors, ${Buffer.concat(slices).length} bytes)`);

// --- numerical verification ------------------------------------------------
// The same deterministic input goes through (a) the restored standalone
// backbone and (b) the deployed model's own trunk. Embeddings must agree.
await tf.setBackend("cpu");
await tf.ready();

const { buildFeatureExtractor } = await import("./feature-worker.mjs");
const restored = await buildFeatureExtractor();

const deployed = await tf.loadLayersModel(
  tf.io.fromMemory({
    modelTopology: modelJson.modelTopology,
    weightSpecs: allSpecs,
    weightData: weightBytes.buffer.slice(weightBytes.byteOffset, weightBytes.byteOffset + weightBytes.byteLength),
  })
);
const trunk = deployed.layers[0].layers[0]; // the nested MobileNet Model
const reference = tf.sequential();
reference.add(tf.model({ inputs: trunk.inputs, outputs: trunk.getLayer("out_relu").output }));
reference.add(tf.layers.globalAveragePooling2d({}));

const rand = mulberry32(42);
const input = new Float32Array(IMAGE_SIZE * IMAGE_SIZE * 3);
for (let i = 0; i < input.length; i += 1) input[i] = rand() * 2 - 1; // [-1, 1), like capture()
const x = tf.tensor4d(input, [1, IMAGE_SIZE, IMAGE_SIZE, 3]);
const a = await restored.predict(x).data();
const b = await reference.predict(x).data();
x.dispose();

let maxDiff = 0;
let zeros = 0;
for (let i = 0; i < a.length; i += 1) {
  maxDiff = Math.max(maxDiff, Math.abs(a[i] - b[i]));
  if (a[i] === 0) zeros += 1;
}
console.log(`embedding dim ${a.length}, zeros ${((100 * zeros) / a.length).toFixed(1)}%, max |restored - deployed trunk| = ${maxDiff}`);
if (a.length !== 1280) throw new Error(`expected 1280-d embeddings, got ${a.length}`);
if (maxDiff > 1e-4) throw new Error("restored backbone does not match the deployed trunk");
console.log("OK: restored backbone is numerically identical to the deployed model's trunk");
