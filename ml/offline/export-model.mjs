// ---------------------------------------------------------------------------
// EXPORT A TEACHABLE-MACHINE-COMPATIBLE MODEL
//
// The app loads its model with tmImage.load(model.json, metadata.json) and
// never inspects the architecture, so compatibility means reproducing what
// that loader and its predict() expect:
//
//   model.json   Sequential[
//                  Sequential[ MobileNetV2-0.35 truncated at out_relu, GAP ],
//                  Sequential[ Dense(100, relu), Dense(N, softmax) ] ]
//   weights.bin  base weights (unchanged ImageNet) + trained head
//   metadata.json  { labels, imageSize: 224, packageName: @teachablemachine/image, ... }
//
// That is the same layout as the working 10-class model in
// frontend/public/AI_Model/, so no app code has to change to load it.
// ---------------------------------------------------------------------------
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { buildFeatureExtractor, loadBaseArtifacts } from "./feature-worker.mjs";
import { FEATURE_DIM } from "./head.mjs";

const require = createRequire(import.meta.url);
const tf = require("@tensorflow/tfjs");

export const assembleModel = async (head) => {
  const features = await buildFeatureExtractor(); // Sequential[truncated MobileNetV2, GAP]

  const classifier = tf.sequential();
  classifier.add(tf.layers.dense({ inputShape: [FEATURE_DIM], units: head.hidden, activation: "relu", useBias: true }));
  classifier.add(tf.layers.dense({ units: head.numClasses, activation: "softmax", useBias: true }));
  classifier.layers[0].setWeights([tf.tensor2d(head.kernel1, [FEATURE_DIM, head.hidden]), tf.tensor1d(head.bias1)]);
  classifier.layers[1].setWeights([tf.tensor2d(head.kernel2, [head.hidden, head.numClasses]), tf.tensor1d(head.bias2)]);

  const model = tf.sequential();
  model.add(features);
  model.add(classifier);
  return model;
};

export const saveModel = async (model, labels, outDir, extraMetadata = {}) => {
  fs.mkdirSync(outDir, { recursive: true });
  let artifacts;
  await model.save(tf.io.withSaveHandler(async (saved) => {
    artifacts = saved;
    return { modelArtifactsInfo: { dateSaved: new Date(), modelTopologyType: "JSON" } };
  }));
  const modelJson = {
    modelTopology: artifacts.modelTopology,
    format: "layers-model",
    generatedBy: `TensorFlow.js v${tf.version.tfjs}`,
    convertedBy: null,
    weightsManifest: [{ paths: ["weights.bin"], weights: artifacts.weightSpecs }],
  };
  // Field names follow the metadata.json Teachable Machine writes and that
  // @teachablemachine/image reads (labels, imageSize).
  const metadata = {
    tfjsVersion: tf.version.tfjs,
    tmVersion: "2.4.16",
    packageVersion: "0.8.5",
    packageName: "@teachablemachine/image",
    timeStamp: new Date().toISOString(),
    userMetadata: {},
    modelName: "kabadiwala-offline-visual-classifier",
    labels,
    imageSize: 224,
    ...extraMetadata,
  };
  fs.writeFileSync(path.join(outDir, "model.json"), JSON.stringify(modelJson));
  fs.writeFileSync(path.join(outDir, "weights.bin"), Buffer.from(artifacts.weightData));
  fs.writeFileSync(path.join(outDir, "metadata.json"), JSON.stringify(metadata));
  return { weightBytes: artifacts.weightData.byteLength, tensors: artifacts.weightSpecs.length };
};

/** Load an exported model back from disk exactly as a fresh consumer would. */
export const loadExported = async (dir) => {
  const json = JSON.parse(fs.readFileSync(path.join(dir, "model.json"), "utf8"));
  const buf = fs.readFileSync(path.join(dir, "weights.bin"));
  return tf.loadLayersModel(tf.io.fromMemory({
    modelTopology: json.modelTopology,
    weightSpecs: json.weightsManifest.flatMap((g) => g.weights),
    weightData: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
  }));
};

/** Structural comparison against the deployed model, so compatibility is checked, not assumed. */
export const compareToDeployed = (exportDir, deployedDir) => {
  const summarise = (dir) => {
    const m = JSON.parse(fs.readFileSync(path.join(dir, "model.json"), "utf8"));
    const meta = JSON.parse(fs.readFileSync(path.join(dir, "metadata.json"), "utf8"));
    const top = (m.modelTopology.model_config || m.modelTopology).config.layers;
    const inner = top.map((s) => s.config.layers.map((l) => l.class_name));
    const weights = m.weightsManifest.flatMap((g) => g.weights);
    const base = weights.filter((w) => /Conv|conv|block_|expanded|bn|BN/.test(w.name));
    return {
      layout: inner.map((names) => names.join(">")).join(" | "),
      baseTensors: base.length,
      baseShapes: base.map((w) => w.shape.join("x")).join(","),
      imageSize: meta.imageSize,
      packageName: meta.packageName,
      labelCount: meta.labels.length,
    };
  };
  const exp = summarise(exportDir);
  const dep = summarise(deployedDir);
  return {
    exported: { ...exp, baseShapes: undefined },
    deployed: { ...dep, baseShapes: undefined },
    sameLayout: exp.layout === dep.layout,
    sameBackbone: exp.baseShapes === dep.baseShapes && exp.baseTensors === dep.baseTensors,
    sameImageSize: exp.imageSize === dep.imageSize,
    samePackage: exp.packageName === dep.packageName,
  };
};

export { loadBaseArtifacts };
