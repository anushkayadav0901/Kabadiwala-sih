// ---------------------------------------------------------------------------
// FEATURE WORKER (one process per CPU core, forked by extract-features.mjs)
//
// Runs the frozen, ImageNet-pretrained MobileNetV2 (alpha 0.35, 224px) — the
// exact backbone Teachable Machine uses — truncated at 'out_relu' and followed
// by GlobalAveragePooling2D, producing one 1280-d embedding per view.
//
// tfjs 1.3.1's CPU backend is pure JavaScript and single-threaded, so parallel
// processes are the only way to use more than one core without switching to a
// native TensorFlow build that the frontend runtime does not share.
//
// Each embedding is written straight to the cache, so an interrupted run
// resumes where it stopped and the parent never holds every vector in memory.
// ---------------------------------------------------------------------------
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { IMAGE_SIZE, augmentedView, decodeImage, normalizeInto, tmCrop } from "./image-io.mjs";

const require = createRequire(import.meta.url);
const tf = require("@tensorflow/tfjs");

const ML = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE_DIR = path.join(ML, "experiments", "_pretrained", "mobilenet_v2_0.35_224");
const BATCH = 8;
const FEATURE_DIM = 1280;

export const loadBaseArtifacts = () => {
  const json = JSON.parse(fs.readFileSync(path.join(BASE_DIR, "model.json"), "utf8"));
  const buf = Buffer.concat(json.weightsManifest.flatMap((g) => g.paths).map((p) => fs.readFileSync(path.join(BASE_DIR, p))));
  return {
    modelTopology: json.modelTopology,
    weightSpecs: json.weightsManifest.flatMap((g) => g.weights),
    weightData: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
  };
};

/** Truncated MobileNetV2 + GAP, composed exactly as @teachablemachine/image loadTruncatedMobileNet. */
export const buildFeatureExtractor = async () => {
  const mobilenet = await tf.loadLayersModel(tf.io.fromMemory(loadBaseArtifacts()));
  const layer = mobilenet.getLayer("out_relu");
  const truncated = tf.model({ inputs: mobilenet.inputs, outputs: layer.output });
  const extractor = tf.sequential();
  extractor.add(truncated);
  extractor.add(tf.layers.globalAveragePooling2d({}));
  return extractor;
};

// Deterministic per-image augmentation seeds, independent of file order.
export const augSeed = (sha1, index) => {
  let h = 2166136261;
  for (let i = 0; i < sha1.length; i += 1) { h ^= sha1.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h ^ Math.imul(index + 1, 2654435761)) >>> 0;
};

export const viewPath = (cacheDir, sha1, view) => path.join(cacheDir, sha1.slice(0, 2), sha1, `${view}.f32`);

const run = async () => {
  await tf.setBackend("cpu");
  await tf.ready();
  const extractor = await buildFeatureExtractor();
  process.send({ type: "ready" });

  process.on("message", async (msg) => {
    if (msg.type !== "job") return;
    const { cacheDir, items } = msg;
    try {
      // Build every pending view for this chunk of images, then run in batches.
      const pending = [];
      for (const item of items) {
        const img = decodeImage(fs.readFileSync(item.file));
        for (const view of item.views) {
          const rgb = view === "clean" ? tmCrop(img, IMAGE_SIZE) : augmentedView(img, augSeed(item.sha1, Number(view.slice(1))));
          pending.push({ sha1: item.sha1, view, rgb });
        }
      }
      for (let i = 0; i < pending.length; i += BATCH) {
        const slice = pending.slice(i, i + BATCH);
        const input = new Float32Array(slice.length * IMAGE_SIZE * IMAGE_SIZE * 3);
        slice.forEach((p, k) => normalizeInto(p.rgb, input, k * IMAGE_SIZE * IMAGE_SIZE * 3));
        const out = tf.tidy(() => extractor.predict(tf.tensor4d(input, [slice.length, IMAGE_SIZE, IMAGE_SIZE, 3])));
        const data = await out.data();
        out.dispose();
        slice.forEach((p, k) => {
          const target = viewPath(cacheDir, p.sha1, p.view);
          fs.mkdirSync(path.dirname(target), { recursive: true });
          const vec = data.slice(k * FEATURE_DIM, (k + 1) * FEATURE_DIM);
          fs.writeFileSync(target, Buffer.from(vec.buffer, vec.byteOffset, vec.byteLength));
        });
      }
      process.send({ type: "done", views: pending.length });
    } catch (error) {
      process.send({ type: "error", message: error.message, items: items.map((it) => it.file) });
    }
  });
};

if (process.send && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) run();
