// ---------------------------------------------------------------------------
// FAST HEAD TRAINER (typed arrays, sparsity-aware)
//
// Mathematically the same model and objective as head.mjs — Dense(h, relu) ->
// dropout -> Dense(k) -> softmax cross-entropy with label smoothing, per-class
// weights and L2, optimised with Adam — written directly on typed arrays.
//
// Why a second implementation: tfjs 1.3.1's CPU backend has no BLAS and costs
// ~2.6 ms per sample per epoch here, which makes proper cross-validation take
// hours. MobileNetV2 embeddings are ~40% exact zeros, so skipping zero inputs
// in the first layer plus avoiding per-step tensor allocation is several times
// faster. It is verified against head.mjs by gradient check and by accuracy
// (see verify-fast-head.mjs) before being used.
// ---------------------------------------------------------------------------
import { mulberry32 } from "./image-io.mjs";
import { FEATURE_DIM, HEAD_DEFAULTS, classWeightsFor } from "./head.mjs";

const TFJS_EPSILON = 1e-7; // tf.train.adam default epsilon for float32

const glorot = (fanIn, fanOut, rand) => {
  const limit = Math.sqrt(6 / (fanIn + fanOut));
  const out = new Float64Array(fanIn * fanOut);
  for (let i = 0; i < out.length; i += 1) out[i] = (rand() * 2 - 1) * limit;
  return out;
};

const newAdam = (size) => ({ m: new Float64Array(size), v: new Float64Array(size) });

/**
 * Loss and gradients for one mini-batch. Exposed for the gradient check.
 * masks: optional Float64Array(B*h) of dropout multipliers (0 or 1/(1-p)).
 */
export const batchLossAndGrads = (p, X, d, y, rows, cfg, weights, masks) => {
  const { hidden: h, numClasses: k } = p;
  const eps = cfg.labelSmoothing;
  const gW1 = new Float64Array(d * h); const gb1 = new Float64Array(h);
  const gW2 = new Float64Array(h * k); const gb2 = new Float64Array(k);
  const z1 = new Float64Array(h); const a1 = new Float64Array(h);
  const logits = new Float64Array(k); const dlog = new Float64Array(k); const dz1 = new Float64Array(h);
  let lossSum = 0; let wSum = 0;

  for (let bi = 0; bi < rows.length; bi += 1) {
    const r = rows[bi];
    const off = r * d;
    const cls = y[r];
    const w = weights[cls];
    wSum += w;

    z1.set(p.b1);
    for (let i = 0; i < d; i += 1) {
      const xi = X[off + i];
      if (xi === 0) continue;
      const base = i * h;
      for (let j = 0; j < h; j += 1) z1[j] += xi * p.W1[base + j];
    }
    for (let j = 0; j < h; j += 1) {
      const act = z1[j] > 0 ? z1[j] : 0;
      a1[j] = masks ? act * masks[bi * h + j] : act;
    }

    logits.set(p.b2);
    for (let j = 0; j < h; j += 1) {
      const a = a1[j];
      if (a === 0) continue;
      const base = j * k;
      for (let c = 0; c < k; c += 1) logits[c] += a * p.W2[base + c];
    }
    let max = -Infinity;
    for (let c = 0; c < k; c += 1) if (logits[c] > max) max = logits[c];
    let lse = 0;
    for (let c = 0; c < k; c += 1) lse += Math.exp(logits[c] - max);
    lse = max + Math.log(lse);

    let ce = 0;
    for (let c = 0; c < k; c += 1) {
      const target = (c === cls ? 1 - eps : 0) + eps / k;
      const logp = logits[c] - lse;
      ce -= target * logp;
      dlog[c] = w * (Math.exp(logp) - target); // d(w*CE)/dlogit, since targets sum to 1
    }
    lossSum += w * ce;

    for (let c = 0; c < k; c += 1) gb2[c] += dlog[c];
    for (let j = 0; j < h; j += 1) {
      const a = a1[j];
      const base = j * k;
      let da = 0;
      for (let c = 0; c < k; c += 1) {
        if (a !== 0) gW2[base + c] += a * dlog[c];
        da += p.W2[base + c] * dlog[c];
      }
      const m = masks ? masks[bi * h + j] : 1;
      dz1[j] = z1[j] > 0 ? da * m : 0;
    }
    for (let j = 0; j < h; j += 1) gb1[j] += dz1[j];
    for (let i = 0; i < d; i += 1) {
      const xi = X[off + i];
      if (xi === 0) continue;
      const base = i * h;
      for (let j = 0; j < h; j += 1) gW1[base + j] += xi * dz1[j];
    }
  }

  // Match head.mjs: data loss = sum(w * CE) / sum(w), plus L2 on both kernels.
  const inv = 1 / wSum;
  let l2sum = 0;
  for (let i = 0; i < gW1.length; i += 1) { gW1[i] = gW1[i] * inv + 2 * cfg.l2 * p.W1[i]; l2sum += p.W1[i] * p.W1[i]; }
  for (let i = 0; i < gW2.length; i += 1) { gW2[i] = gW2[i] * inv + 2 * cfg.l2 * p.W2[i]; l2sum += p.W2[i] * p.W2[i]; }
  for (let i = 0; i < h; i += 1) gb1[i] *= inv;
  for (let i = 0; i < k; i += 1) gb2[i] *= inv;
  return { loss: lossSum * inv + cfg.l2 * l2sum, gW1, gb1, gW2, gb2 };
};

const adamStep = (param, grad, state, lr, t, beta1 = 0.9, beta2 = 0.999) => {
  const c1 = 1 - beta1 ** t; const c2 = 1 - beta2 ** t;
  for (let i = 0; i < param.length; i += 1) {
    state.m[i] = beta1 * state.m[i] + (1 - beta1) * grad[i];
    state.v[i] = beta2 * state.v[i] + (1 - beta2) * grad[i] * grad[i];
    param[i] -= (lr * (state.m[i] / c1)) / (Math.sqrt(state.v[i] / c2) + TFJS_EPSILON);
  }
};

/** Softmax probabilities, no dropout. */
export const forwardProbs = (p, X, d, count) => {
  const { hidden: h, numClasses: k } = p;
  const out = [];
  const z1 = new Float64Array(h); const logits = new Float64Array(k);
  for (let r = 0; r < count; r += 1) {
    const off = r * d;
    z1.set(p.b1);
    for (let i = 0; i < d; i += 1) {
      const xi = X[off + i];
      if (xi === 0) continue;
      const base = i * h;
      for (let j = 0; j < h; j += 1) z1[j] += xi * p.W1[base + j];
    }
    logits.set(p.b2);
    for (let j = 0; j < h; j += 1) {
      const a = z1[j] > 0 ? z1[j] : 0;
      if (a === 0) continue;
      const base = j * k;
      for (let c = 0; c < k; c += 1) logits[c] += a * p.W2[base + c];
    }
    let max = -Infinity;
    for (let c = 0; c < k; c += 1) if (logits[c] > max) max = logits[c];
    let sum = 0;
    const e = new Float64Array(k);
    for (let c = 0; c < k; c += 1) { e[c] = Math.exp(logits[c] - max); sum += e[c]; }
    const probs = new Float32Array(k);
    for (let c = 0; c < k; c += 1) probs[c] = e[c] / sum;
    out.push(probs);
  }
  return out;
};

const valLoss = (p, X, d, y) => {
  const probs = forwardProbs(p, X, d, y.length);
  let loss = 0; let correct = 0;
  probs.forEach((row, i) => {
    loss -= Math.log(Math.max(row[y[i]], 1e-12));
    let best = 0;
    for (let c = 1; c < row.length; c += 1) if (row[c] > row[best]) best = c;
    if (best === y[i]) correct += 1;
  });
  return { loss: loss / y.length, acc: correct / y.length };
};

/** Same contract as head.mjs trainHead. */
export const trainFastHead = (X, y, numClasses, options = {}, val = null, seed = 1) => {
  const cfg = { ...HEAD_DEFAULTS, ...options };
  const d = FEATURE_DIM;
  const h = cfg.hidden;
  const rand = mulberry32(seed);
  const p = { hidden: h, numClasses, W1: glorot(d, h, rand), b1: new Float64Array(h), W2: glorot(h, numClasses, rand), b2: new Float64Array(numClasses) };
  const opt = { W1: newAdam(p.W1.length), b1: newAdam(h), W2: newAdam(p.W2.length), b2: newAdam(numClasses) };
  const weights = classWeightsFor(y, numClasses, cfg.classWeighting);
  const n = y.length;
  const keep = 1 - cfg.dropout;

  let best = { loss: Infinity, epoch: -1, snap: null };
  let stale = 0; let step = 0;
  const history = [];

  for (let epoch = 0; epoch < cfg.maxEpochs; epoch += 1) {
    const order = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i -= 1) { const j = Math.floor(rand() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    let lossAcc = 0;
    for (let s = 0; s < n; s += cfg.batchSize) {
      const rows = order.slice(s, s + cfg.batchSize);
      let masks = null;
      if (cfg.dropout > 0) {
        masks = new Float64Array(rows.length * h);
        for (let i = 0; i < masks.length; i += 1) masks[i] = rand() < keep ? 1 / keep : 0;
      }
      const g = batchLossAndGrads(p, X, d, y, rows, cfg, weights, masks);
      step += 1;
      adamStep(p.W1, g.gW1, opt.W1, cfg.lr, step);
      adamStep(p.b1, g.gb1, opt.b1, cfg.lr, step);
      adamStep(p.W2, g.gW2, opt.W2, cfg.lr, step);
      adamStep(p.b2, g.gb2, opt.b2, cfg.lr, step);
      lossAcc += g.loss * rows.length;
    }
    const record = { epoch: epoch + 1, trainLoss: lossAcc / n };
    if (val) {
      const v = valLoss(p, val.X, d, val.y);
      record.valLoss = v.loss; record.valAcc = v.acc;
      if (v.loss < best.loss - 1e-4) {
        best = { loss: v.loss, epoch: epoch + 1, snap: { W1: p.W1.slice(), b1: p.b1.slice(), W2: p.W2.slice(), b2: p.b2.slice() } };
        stale = 0;
      } else {
        stale += 1;
      }
    }
    history.push(record);
    if (val && stale >= cfg.patience) break;
  }
  if (val && best.snap) Object.assign(p, best.snap);

  return {
    kernel1: Float32Array.from(p.W1), bias1: Float32Array.from(p.b1),
    kernel2: Float32Array.from(p.W2), bias2: Float32Array.from(p.b2),
    hidden: h, numClasses,
    bestEpoch: val ? best.epoch : cfg.maxEpochs,
    epochsRun: history.length,
    history,
  };
};

/** Probabilities from an exported-shape head (Float32 kernels). */
export const predictFastHead = (head, X, count) =>
  forwardProbs({ hidden: head.hidden, numClasses: head.numClasses, W1: head.kernel1, b1: head.bias1, W2: head.kernel2, b2: head.bias2 }, X, FEATURE_DIM, count);
