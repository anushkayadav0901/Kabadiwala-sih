// ---------------------------------------------------------------------------
// VERIFY fast-head.mjs AGAINST head.mjs
//
//   node ml/offline/verify-fast-head.mjs
//
// 1. Gradient check: analytic gradients vs central finite differences.
// 2. Behaviour check: both trainers on the same data must reach the same
//    accuracy (they use different RNG streams, so weights are not identical).
// The pipeline refuses to use the fast trainer unless both pass.
// ---------------------------------------------------------------------------
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mulberry32 } from "./image-io.mjs";
import { batchLossAndGrads, trainFastHead, predictFastHead } from "./fast-head.mjs";
import { trainHead, predictHead, FEATURE_DIM, HEAD_DEFAULTS } from "./head.mjs";
import { evaluate } from "./metrics.mjs";

export const gradientCheck = () => {
  const d = 7; const h = 5; const k = 4;
  const rand = mulberry32(3);
  const rnd = (n, s = 0.5) => Float64Array.from({ length: n }, () => (rand() * 2 - 1) * s);
  const p = { hidden: h, numClasses: k, W1: rnd(d * h), b1: rnd(h, 0.1), W2: rnd(h * k), b2: rnd(k, 0.1) };
  const n = 6;
  // Include exact zeros so the sparse skip path is exercised.
  const X = Float32Array.from({ length: n * d }, () => (rand() < 0.35 ? 0 : rand() * 2));
  const y = Array.from({ length: n }, (_, i) => i % k);
  const rows = y.map((_, i) => i);
  const cfg = { labelSmoothing: 0.1, l2: 1e-3 };
  const weights = [0.7, 1.3, 1.0, 2.1];
  // Bypass the float32 input precision limit: X values are exact in float32.
  const analytic = batchLossAndGrads(p, X, d, y, rows, cfg, weights, null);

  // Relative error is only meaningful where the gradient is non-negligible, so
  // it is taken over those entries; the checked count and largest magnitude are
  // reported so a vacuous pass (all-zero gradients) is visible.
  let worst = 0; let checked = 0; let maxAbsGrad = 0; let maxAbsDiff = 0;
  const eps = 1e-5;
  const checkParam = (name, gradName) => {
    const arr = p[name];
    for (let i = 0; i < arr.length; i += 1) {
      const orig = arr[i];
      arr[i] = orig + eps; const lp = batchLossAndGrads(p, X, d, y, rows, cfg, weights, null).loss;
      arr[i] = orig - eps; const lm = batchLossAndGrads(p, X, d, y, rows, cfg, weights, null).loss;
      arr[i] = orig;
      const numeric = (lp - lm) / (2 * eps);
      const a = analytic[gradName][i];
      maxAbsGrad = Math.max(maxAbsGrad, Math.abs(a));
      maxAbsDiff = Math.max(maxAbsDiff, Math.abs(a - numeric));
      if (Math.abs(a) > 1e-6 || Math.abs(numeric) > 1e-6) {
        checked += 1;
        worst = Math.max(worst, Math.abs(a - numeric) / (Math.abs(a) + Math.abs(numeric)));
      }
    }
  };
  checkParam("W1", "gW1"); checkParam("b1", "gb1"); checkParam("W2", "gW2"); checkParam("b2", "gb2");
  const total = p.W1.length + p.b1.length + p.W2.length + p.b2.length;
  return { worst, checked, total, maxAbsGrad, maxAbsDiff };
};

export const behaviourCheck = async () => {
  // Clustered synthetic embeddings, hard enough that both trainers make errors.
  const K = 8;
  const rand = mulberry32(11);
  const centers = Array.from({ length: K }, () => Float32Array.from({ length: FEATURE_DIM }, () => Math.max(0, rand() * 2 - 1.3)));
  const make = (perClass, noise) => {
    const y = []; const rowsX = [];
    perClass.forEach((count, c) => { for (let i = 0; i < count; i += 1) { rowsX.push(Float32Array.from(centers[c], (v) => Math.max(0, v + (rand() - 0.5) * noise))); y.push(c); } });
    const X = new Float32Array(y.length * FEATURE_DIM);
    rowsX.forEach((v, i) => X.set(v, i * FEATURE_DIM));
    return { X, y };
  };
  const noise = 5.5;
  const train = make([60, 50, 40, 30, 20, 15, 10, 8], noise);
  const val = make(Array(K).fill(8), noise);
  const test = make(Array(K).fill(40), noise);
  const labels = Array.from({ length: K }, (_, i) => `c${i}`);
  const opts = { ...HEAD_DEFAULTS, maxEpochs: 60, patience: 12 };

  let t = Date.now();
  const slow = await trainHead(train.X, train.y, K, opts, val, 5);
  const slowMs = Date.now() - t;
  const slowAcc = evaluate(predictHead(slow, test.X, test.y.length), test.y, labels).top1;

  t = Date.now();
  const fast = trainFastHead(train.X, train.y, K, opts, val, 5);
  const fastMs = Date.now() - t;
  const fastAcc = evaluate(predictFastHead(fast, test.X, test.y.length), test.y, labels).top1;

  return { slowAcc, fastAcc, slowMsPerEpoch: slowMs / slow.epochsRun, fastMsPerEpoch: fastMs / fast.epochsRun };
};

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const g = gradientCheck();
  const gradPass = g.worst < 1e-4 && g.checked > g.total * 0.5 && g.maxAbsGrad > 1e-3;
  console.log(`gradient check: ${g.checked}/${g.total} params with non-negligible gradient, ` +
    `max |grad| ${g.maxAbsGrad.toExponential(2)}, max |analytic-numeric| ${g.maxAbsDiff.toExponential(2)}, ` +
    `worst relative error ${g.worst.toExponential(2)} ${gradPass ? "PASS" : "FAIL"}`);
  if (process.argv.includes("--grad-only")) process.exit(gradPass ? 0 : 1);
  const b = await behaviourCheck();
  const gap = Math.abs(b.slowAcc - b.fastAcc);
  console.log(`tfjs head: ${(b.slowAcc * 100).toFixed(1)}%  (${b.slowMsPerEpoch.toFixed(0)} ms/epoch)`);
  console.log(`fast head: ${(b.fastAcc * 100).toFixed(1)}%  (${b.fastMsPerEpoch.toFixed(0)} ms/epoch)`);
  console.log(`accuracy gap ${(gap * 100).toFixed(1)} pts ${gap <= 0.05 ? "PASS" : "FAIL"}; speed-up ${(b.slowMsPerEpoch / b.fastMsPerEpoch).toFixed(1)}x`);
  if (!gradPass || gap > 0.05) process.exit(1);
}
