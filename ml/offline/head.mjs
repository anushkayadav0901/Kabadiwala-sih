// ---------------------------------------------------------------------------
// CLASSIFIER HEAD
//
// Trained on cached MobileNetV2 embeddings, so the backbone is never re-run
// during training and a full cross-validation takes minutes, not hours.
//
// Architecture is Teachable Machine's head — Dense(100, relu) -> Dense(N,
// softmax) — so the exported model has the same shape as the working model the
// app already loads. Dropout exists only at training time; it has no weights
// and is left out of the exported graph.
//
// A hand-written loop is used instead of model.fit so class weighting and
// label smoothing are applied exactly as specified in tfjs 1.3.1.
// ---------------------------------------------------------------------------
import { createRequire } from "node:module";
import { mulberry32 } from "./image-io.mjs";

const require = createRequire(import.meta.url);
const tf = require("@tensorflow/tfjs");

export const FEATURE_DIM = 1280;

export const HEAD_DEFAULTS = {
  hidden: 100,
  dropout: 0.5,
  l2: 1e-4,
  labelSmoothing: 0.1,
  lr: 1e-3,
  batchSize: 64,
  maxEpochs: 120,
  patience: 15,
  classWeighting: "sqrt", // "none" | "sqrt" | "balanced"
};

const glorot = (fanIn, fanOut, rand) => {
  const limit = Math.sqrt(6 / (fanIn + fanOut));
  const out = new Float32Array(fanIn * fanOut);
  for (let i = 0; i < out.length; i += 1) out[i] = (rand() * 2 - 1) * limit;
  return out;
};

/**
 * Per-class loss weights. "balanced" is n_total / (k * n_c). "sqrt" softens it:
 * with 3–8 training images, full balancing multiplies the gradient from a few
 * — possibly unrepresentative — photos until they dominate. Weights are
 * normalised so the average training sample has weight 1.
 */
export const classWeightsFor = (y, numClasses, mode) => {
  const counts = Array(numClasses).fill(0);
  y.forEach((c) => { counts[c] += 1; });
  const total = y.length;
  const raw = counts.map((n) => {
    if (!n || mode === "none") return 1;
    const balanced = total / (numClasses * n);
    return mode === "sqrt" ? Math.sqrt(balanced) : balanced;
  });
  const meanPerSample = y.reduce((s, c) => s + raw[c], 0) / total;
  return raw.map((w) => w / meanPerSample);
};

const shuffleIdx = (n, rand) => {
  const idx = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i -= 1) { const j = Math.floor(rand() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  return idx;
};

const gatherRows = (X, rows) => {
  const out = new Float32Array(rows.length * FEATURE_DIM);
  rows.forEach((r, i) => out.set(X.subarray(r * FEATURE_DIM, (r + 1) * FEATURE_DIM), i * FEATURE_DIM));
  return out;
};

/**
 * @param {Float32Array} X  N*1280 embeddings (training views)
 * @param {number[]} y      N class indices
 * @param {object} [val]    { X, y } held-out clean views for early stopping
 */
export const trainHead = async (X, y, numClasses, options = {}, val = null, seed = 1) => {
  const cfg = { ...HEAD_DEFAULTS, ...options };
  const rand = mulberry32(seed);
  const n = y.length;

  const k1 = tf.variable(tf.tensor2d(glorot(FEATURE_DIM, cfg.hidden, rand), [FEATURE_DIM, cfg.hidden]));
  const b1 = tf.variable(tf.zeros([cfg.hidden]));
  const k2 = tf.variable(tf.tensor2d(glorot(cfg.hidden, numClasses, rand), [cfg.hidden, numClasses]));
  const b2 = tf.variable(tf.zeros([numClasses]));
  const vars = [k1, b1, k2, b2];

  const weights = tf.tensor1d(classWeightsFor(y, numClasses, cfg.classWeighting));
  const optimizer = tf.train.adam(cfg.lr);

  const logitsOf = (x, training, dropSeed) => tf.tidy(() => {
    let h = tf.relu(tf.add(tf.matMul(x, k1), b1));
    if (training && cfg.dropout > 0) h = tf.dropout(h, cfg.dropout, null, dropSeed);
    return tf.add(tf.matMul(h, k2), b2);
  });

  const valX = val ? tf.tensor2d(val.X, [val.y.length, FEATURE_DIM]) : null;
  const valY = val ? tf.tensor1d(val.y, "int32") : null;

  let best = { loss: Infinity, epoch: -1, snapshot: null };
  let stale = 0;
  const history = [];

  for (let epoch = 0; epoch < cfg.maxEpochs; epoch += 1) {
    const order = shuffleIdx(n, rand);
    let epochLoss = 0;
    for (let start = 0; start < n; start += cfg.batchSize) {
      const rows = order.slice(start, start + cfg.batchSize);
      const xb = tf.tensor2d(gatherRows(X, rows), [rows.length, FEATURE_DIM]);
      const yb = tf.tensor1d(rows.map((r) => y[r]), "int32");
      const dropSeed = Math.floor(rand() * 2 ** 31);
      const lossT = optimizer.minimize(() => {
        const logits = logitsOf(xb, true, dropSeed);
        const target = tf.add(tf.mul(tf.oneHot(yb, numClasses), 1 - cfg.labelSmoothing), cfg.labelSmoothing / numClasses);
        const perSample = tf.neg(tf.sum(tf.mul(target, tf.logSoftmax(logits)), 1));
        const w = tf.gather(weights, yb);
        const data = tf.div(tf.sum(tf.mul(perSample, w)), tf.sum(w));
        const reg = tf.mul(cfg.l2, tf.add(tf.sum(tf.square(k1)), tf.sum(tf.square(k2))));
        return tf.add(data, reg);
      }, true, vars);
      epochLoss += (await lossT.data())[0] * rows.length;
      lossT.dispose(); xb.dispose(); yb.dispose();
    }

    const record = { epoch: epoch + 1, trainLoss: epochLoss / n };
    if (val) {
      // Early stopping watches plain cross-entropy on clean validation views:
      // no smoothing, no weighting — the quantity we actually care about.
      const [vLoss, vAcc] = tf.tidy(() => {
        const logits = logitsOf(valX, false, 0);
        const loss = tf.mean(tf.neg(tf.sum(tf.mul(tf.oneHot(valY, numClasses), tf.logSoftmax(logits)), 1)));
        const acc = tf.mean(tf.cast(tf.equal(tf.argMax(logits, 1), valY), "float32"));
        return [loss.dataSync()[0], acc.dataSync()[0]];
      });
      record.valLoss = vLoss; record.valAcc = vAcc;
      if (vLoss < best.loss - 1e-4) {
        best = { loss: vLoss, epoch: epoch + 1, snapshot: vars.map((v) => v.dataSync().slice()) };
        stale = 0;
      } else {
        stale += 1;
      }
    }
    history.push(record);
    if (val && stale >= cfg.patience) break;
  }

  // Restore the best epoch when validation was available.
  if (val && best.snapshot) vars.forEach((v, i) => v.assign(tf.tensor(best.snapshot[i], v.shape)));

  const result = {
    kernel1: k1.dataSync().slice(), bias1: b1.dataSync().slice(),
    kernel2: k2.dataSync().slice(), bias2: b2.dataSync().slice(),
    hidden: cfg.hidden, numClasses,
    bestEpoch: val ? best.epoch : cfg.maxEpochs,
    epochsRun: history.length,
    history,
  };
  [...vars, weights, valX, valY].forEach((t) => t && t.dispose());
  optimizer.dispose();
  return result;
};

/** Softmax probabilities from a trained head, for N*1280 embeddings. */
export const predictHead = (head, X, count) => tf.tidy(() => {
  const x = tf.tensor2d(X, [count, FEATURE_DIM]);
  const h = tf.relu(tf.add(tf.matMul(x, tf.tensor2d(head.kernel1, [FEATURE_DIM, head.hidden])), tf.tensor1d(head.bias1)));
  const probs = tf.softmax(tf.add(tf.matMul(h, tf.tensor2d(head.kernel2, [head.hidden, head.numClasses])), tf.tensor1d(head.bias2)));
  const flat = probs.dataSync();
  return Array.from({ length: count }, (_, i) => flat.slice(i * head.numClasses, (i + 1) * head.numClasses));
});
