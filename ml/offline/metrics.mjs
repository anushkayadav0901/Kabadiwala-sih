// ---------------------------------------------------------------------------
// EVALUATION METRICS
//
// Beyond top-1 accuracy, two numbers describe how the model behaves inside the
// app rather than on a benchmark:
//   * top-3 accuracy — the confirmation screen shows the three best guesses, so
//     this is how often the right answer is one tap away.
//   * auto-accept precision/coverage — estimateService.js accepts a prediction
//     without asking only when confidence >= 65% AND it leads the runner-up by
//     >= 8 points. A wrong auto-accept is the costly failure: a silent mis-price.
// ---------------------------------------------------------------------------

// Constants copied from frontend/src/services/estimateService.js.
export const APP_MIN_CONFIDENCE = 65;
export const APP_MIN_MARGIN = 8;

/** Wilson score interval: honest bounds for a proportion from a small sample. */
export const wilson = (successes, n, z = 1.96) => {
  if (!n) return [0, 0];
  const p = successes / n;
  const denom = 1 + (z * z) / n;
  const centre = (p + (z * z) / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denom;
  return [Math.max(0, centre - half), Math.min(1, centre + half)];
};

/**
 * @param {Float32Array[]|number[][]} probs  per-sample class probabilities
 * @param {number[]} truth                   per-sample true class index
 * @param {string[]} labels
 */
export const evaluate = (probs, truth, labels) => {
  const n = truth.length;
  const k = labels.length;
  const confusion = Array.from({ length: k }, () => Array(k).fill(0));
  let top1 = 0; let top3 = 0;
  let accepted = 0; let acceptedCorrect = 0;
  const confidences = [];

  for (let i = 0; i < n; i += 1) {
    const row = Array.from(probs[i]);
    const order = row.map((p, idx) => [p, idx]).sort((a, b) => b[0] - a[0]);
    const pred = order[0][1];
    confusion[truth[i]][pred] += 1;
    if (pred === truth[i]) top1 += 1;
    if (order.slice(0, 3).some(([, idx]) => idx === truth[i])) top3 += 1;

    // The app rounds to whole percentages before comparing.
    const c1 = Math.round(order[0][0] * 100);
    const c2 = Math.round((order[1]?.[0] || 0) * 100);
    confidences.push({ confidence: c1, correct: pred === truth[i] });
    if (c1 >= APP_MIN_CONFIDENCE && c1 - c2 >= APP_MIN_MARGIN) {
      accepted += 1;
      if (pred === truth[i]) acceptedCorrect += 1;
    }
  }

  const perClass = labels.map((label, c) => {
    const tp = confusion[c][c];
    const support = confusion[c].reduce((s, v) => s + v, 0);
    const predicted = confusion.reduce((s, r) => s + r[c], 0);
    const precision = predicted ? tp / predicted : 0;
    const recall = support ? tp / support : 0;
    const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
    const [lo, hi] = wilson(tp, support);
    // Most frequent wrong guess for this class.
    let confusedWith = null; let confusedCount = 0;
    confusion[c].forEach((v, j) => { if (j !== c && v > confusedCount) { confusedCount = v; confusedWith = labels[j]; } });
    return { label, support, correct: tp, precision, recall, f1, recallCI: [lo, hi], confusedWith, confusedCount };
  });

  const scored = perClass.filter((p) => p.support > 0);
  const macroF1 = scored.reduce((s, p) => s + p.f1, 0) / (scored.length || 1);
  const macroRecall = scored.reduce((s, p) => s + p.recall, 0) / (scored.length || 1);

  // Top confused pairs across the whole matrix.
  const pairs = [];
  for (let a = 0; a < k; a += 1) for (let b = 0; b < k; b += 1) {
    if (a !== b && confusion[a][b] > 0) pairs.push({ actual: labels[a], predicted: labels[b], count: confusion[a][b] });
  }
  pairs.sort((x, y) => y.count - x.count);

  return {
    n,
    top1: top1 / (n || 1),
    top1CI: wilson(top1, n),
    top3: top3 / (n || 1),
    macroF1,
    macroRecall,
    autoAccept: {
      coverage: accepted / (n || 1),
      precision: accepted ? acceptedCorrect / accepted : null,
      accepted,
      wrongAutoAccepts: accepted - acceptedCorrect,
    },
    perClass,
    confusion,
    topConfusions: pairs.slice(0, 10),
    confidences,
  };
};

export const pct = (x, dp = 1) => (x === null || x === undefined ? "n/a" : `${(x * 100).toFixed(dp)}%`);
