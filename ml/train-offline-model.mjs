// Local TF.js trainer. By default it writes an experiment only; --publish
// copies a model to the frontend after it meets the configured test threshold.
import fs from "node:fs/promises";
import path from "node:path";
import * as tf from "@tensorflow/tfjs";
import jpeg from "jpeg-js";
import { PNG } from "pngjs";
import { visualClasses } from "./visual-classes.mjs";

const IMAGE_SIZE = 64;
const MIN_IMAGES_PER_CLASS = Number(process.env.MIN_IMAGES_PER_CLASS || 20);
const EPOCHS = Number(process.env.EPOCHS || 18);
const PUBLISH = process.argv.includes("--publish");
const root = path.resolve("ml", "visual-dataset");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const output = path.resolve("ml", "experiments", `offline-${stamp}`);
const runtime = path.resolve("frontend", "public", "AI_Model");

const isImage = (file) => /\.(jpe?g|png|webp)$/i.test(file);
const shuffle = (values, seed) => {
  let state = seed;
  const next = () => ((state = (state * 1664525 + 1013904223) >>> 0) / 4294967296);
  return [...values].sort(() => next() - 0.5);
};
const resize = (decoded) => {
  const pixels = new Float32Array(IMAGE_SIZE * IMAGE_SIZE * 3);
  for (let y = 0; y < IMAGE_SIZE; y += 1) for (let x = 0; x < IMAGE_SIZE; x += 1) {
    const sx = Math.min(decoded.width - 1, Math.floor((x * decoded.width) / IMAGE_SIZE));
    const sy = Math.min(decoded.height - 1, Math.floor((y * decoded.height) / IMAGE_SIZE));
    const source = (sy * decoded.width + sx) * 4;
    const target = (y * IMAGE_SIZE + x) * 3;
    pixels[target] = decoded.data[source] / 255;
    pixels[target + 1] = decoded.data[source + 1] / 255;
    pixels[target + 2] = decoded.data[source + 2] / 255;
  }
  return pixels;
};
const decode = async (file) => {
  const data = await fs.readFile(file);
  if (data[0] === 0xff && data[1] === 0xd8) return resize(jpeg.decode(data, { useTArray: true }));
  if (data.subarray(1, 4).toString() === "PNG") return resize(PNG.sync.read(data));
  throw new Error("unsupported image encoding");
};

await tf.setBackend("cpu");
await tf.ready();
const discovered = [];
for (const item of visualClasses) {
  const directory = path.join(root, item.id);
  let files = [];
  try { files = (await fs.readdir(directory)).filter(isImage).map((name) => path.join(directory, name)); } catch { continue; }
  const samples = [];
  for (const file of files) {
    try { samples.push({ file, pixels: await decode(file) }); } catch { /* Invalid/WebP candidates are excluded. */ }
  }
  if (samples.length >= MIN_IMAGES_PER_CLASS) discovered.push({ ...item, samples });
}
if (discovered.length < 2) throw new Error(`Need at least two classes with ${MIN_IMAGES_PER_CLASS} decodable images in ${root}`);

const splits = { train: [], validation: [], test: [] };
for (let classIndex = 0; classIndex < discovered.length; classIndex += 1) {
  const samples = shuffle(discovered[classIndex].samples, 7381 + classIndex);
  const testEnd = Math.max(1, Math.floor(samples.length * 0.15));
  const validationEnd = testEnd + Math.max(1, Math.floor(samples.length * 0.15));
  samples.forEach((sample, index) => splits[index < testEnd ? "test" : index < validationEnd ? "validation" : "train"].push({ ...sample, classIndex }));
}
const tensorize = (samples) => ({
  x: tf.tensor4d(samples.flatMap((sample) => Array.from(sample.pixels)), [samples.length, IMAGE_SIZE, IMAGE_SIZE, 3]),
  y: tf.oneHot(tf.tensor1d(samples.map((sample) => sample.classIndex), "int32"), discovered.length)
});
const train = tensorize(shuffle(splits.train, 9201));
const validation = tensorize(splits.validation);
const test = tensorize(splits.test);
const model = tf.sequential();
model.add(tf.layers.conv2d({ inputShape: [IMAGE_SIZE, IMAGE_SIZE, 3], filters: 16, kernelSize: 3, strides: 2, activation: "relu", padding: "same" }));
model.add(tf.layers.maxPooling2d({ poolSize: 2 }));
model.add(tf.layers.separableConv2d({ filters: 32, kernelSize: 3, activation: "relu", padding: "same" }));
model.add(tf.layers.maxPooling2d({ poolSize: 2 }));
model.add(tf.layers.separableConv2d({ filters: 64, kernelSize: 3, activation: "relu", padding: "same" }));
model.add(tf.layers.globalAveragePooling2d());
model.add(tf.layers.dropout({ rate: 0.25 }));
model.add(tf.layers.dense({ units: discovered.length, activation: "softmax" }));
model.compile({ optimizer: tf.train.adam(0.001), loss: "categoricalCrossentropy", metrics: ["accuracy"] });
console.log(`Training ${discovered.length} classes: ${discovered.map(({ id }) => id).join(", ")}`);
const history = await model.fit(train.x, train.y, {
  epochs: EPOCHS, batchSize: 16, validationData: [validation.x, validation.y], shuffle: true,
  callbacks: { onEpochEnd: async (epoch, logs) => console.log(`epoch ${epoch + 1}/${EPOCHS} loss=${logs.loss.toFixed(4)} val_acc=${logs.val_acc.toFixed(4)}`) }
});
const evaluation = model.evaluate(test.x, test.y);
const testLoss = Number((await evaluation[0].data())[0]);
const testAccuracy = Number((await evaluation[1].data())[0]);
const predictions = model.predict(test.x);
const values = await predictions.array();
const matrix = Array.from({ length: discovered.length }, () => Array(discovered.length).fill(0));
values.forEach((row, index) => matrix[test.samples[index].classIndex][row.indexOf(Math.max(...row))] += 1);
await fs.mkdir(output, { recursive: true });
let artifacts;
await model.save(tf.io.withSaveHandler(async (saved) => { artifacts = saved; return { modelArtifactsInfo: { dateSaved: new Date(), modelTopologyType: "JSON", modelTopologyBytes: 0, weightSpecsBytes: 0, weightDataBytes: saved.weightData.byteLength } }; }));
const modelJson = { format: "layers-model", generatedBy: `TensorFlow.js v${tf.version.tfjs}`, convertedBy: null, modelTopology: artifacts.modelTopology, weightsManifest: [{ paths: ["weights.bin"], weights: artifacts.weightSpecs }] };
const metadata = { tfjsVersion: tf.version.tfjs, packageVersion: "0.8.5", packageName: "@teachablemachine/image", timeStamp: new Date().toISOString(), modelName: "kabadiwala-offline-visual-classifier", labels: discovered.map(({ label }) => label), imageSize: IMAGE_SIZE };
await fs.writeFile(path.join(output, "model.json"), JSON.stringify(modelJson));
await fs.writeFile(path.join(output, "weights.bin"), Buffer.from(artifacts.weightData));
await fs.writeFile(path.join(output, "metadata.json"), JSON.stringify(metadata));
const report = { generatedAt: new Date().toISOString(), imageSize: IMAGE_SIZE, epochs: EPOCHS, classBalance: Object.fromEntries(discovered.map(({ id, samples }) => [id, samples.length])), splitSizes: Object.fromEntries(Object.entries(splits).map(([key, value]) => [key, value.length])), testLoss, testAccuracy, confusionMatrix: matrix, labels: metadata.labels, history: history.history };
await fs.writeFile(path.join(output, "metrics.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(`Test accuracy: ${(testAccuracy * 100).toFixed(1)}%; experiment: ${output}`);
if (PUBLISH) {
  if (testAccuracy < 0.55) throw new Error("Refusing to publish: test accuracy is below 55%.");
  await fs.mkdir(runtime, { recursive: true });
  for (const file of ["model.json", "weights.bin", "metadata.json"]) await fs.copyFile(path.join(output, file), path.join(runtime, file));
  console.log(`Published model to ${runtime}`);
}
[train.x, train.y, validation.x, validation.y, test.x, test.y, evaluation[0], evaluation[1], predictions].forEach((tensor) => tensor.dispose());
model.dispose();
