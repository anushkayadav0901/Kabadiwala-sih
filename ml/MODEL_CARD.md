# Offline Classifier Model Card

## Purpose

## Validated staged run

### Combined model (broad + PS-critical e-waste, staged 2026-09-14)

- Run: `ml/experiments/combined-run-2026-09-14T09-20-41/`
- Format: Teachable Machine / TensorFlow.js, 224x224 centre crop, `[-1, 1]` preprocessing
- Backbone: MobileNetV2 trunk recovered from the deployed model; frozen feature extraction
- Classes: **42 labels** — all 37 broad classes, plus the PS specialist labels
  Cables, PCB, Battery, Magnet Assembly, Mixed E-waste; PS specialist data also
  merged into Copper Scrap, LCD/LED Monitor and Electric Motor (matching visual
  definitions, eyeball-reviewed by SHA-1)
- Data: 1,119 reviewed images (730 broad + 389 PS), leakage-safe group splits
- Held-out test: **58.1% top-1** (CI 51.5%–64.4%), **76.1% top-3**, macro-F1 55.8%
- Mean 5-fold CV: 57.4% (winner config: no class weighting, 16 augmented views)
- High-confidence auto-accept: 28.8% coverage at 90.6% precision
- Export parity: max prob diff 1.19e-7, 0 label flips; structural check vs
  deployed layout all true
- Weakest new labels on held-out: Mixed E-waste (20% recall), Battery (18% —
  batteries are visually mistaken for phones/tablets), PCB 75%, Cables 73%,
  Magnet Assembly 64%
- Staged model: `ml/experiments/combined-run-2026-09-14T09-20-41/model/` —
  nothing in `frontend/` was modified by this run.

### Broad 37-class model (published 2026-09-12)

- Run: `ml/experiments/run-2026-09-11T12-03-16/`
- Held-out test: **55.9% top-1** (81/145), 78.6% top-3
- 95% Wilson interval for top-1: 47.7%–63.7%
- Mean 5-fold CV: **56.0%**
- Macro F1: 48.7%; macro recall: 51.1%
- High-confidence auto-accept: 31.0% coverage at 97.8% precision (1 wrong auto-accept in the held-out set)
- This model is what currently lives in `frontend/public/AI_Model/`.

### PS-critical 10-label specialist (superseded by the combined model)

- Run: `ml/experiments/ps-run-2026-09-12T13-09-33/`
- Held-out: 60.8% top-1 on its 10 e-waste labels
- Kept separate on purpose (a specialist that only overrode e-waste scans);
  its reviewed data is now folded into the combined 42-label model, so the
  specialist model and `train-ps-model.mjs` are superseded.

The 55% target is met by both validated models, with wide confidence intervals —
these are validation results, not guarantees of field accuracy.

## Runtime location

**Published 2026-09-14:** the combined 42-label model is live at
`frontend/public/AI_Model/` (fetched by the app at `/AI_Model/`). The
broad 37-label model it replaced is kept as a rollback copy at
`frontend/public/AI_Model_fallback/`. The old 10-label model and the
superseded PS specialist folder were removed (the 10-label model is
recoverable from git history; the specialist's labels are covered by the
combined model). To roll back, copy `AI_Model_fallback/` back to
`AI_Model/` — no app code change is needed either way.

## Weak classes / next data needed

Desktop CPU, Hard Plastic, LCD/LED Monitor, Newspaper, Tablet, Power Inverter,
Geyser, Copper Scrap, Electric Fan, Generator, and Motorcycle were the weakest
classes on the held-out set. Collect at least 30–50 varied phone photos per weak
class (front/back, damaged/clean, different backgrounds and lighting), with at
least 10 independent objects. Avoid multiple near-duplicate views as separate
evidence.

Geyser is no longer a zero-image class, but is still weak. Copper, inverter,
desktop CPU, hard plastic, LCD/LED monitor, newspaper, and tablet remain too
uncertain for silent price selection and should retain manual confirmation.

## Compatibility and validation status

- The combined published export has the same layout, MobileNetV2 base
  tensors, 224px input, and Teachable Machine package marker as the app
  loads (`tmImage.load` with tfjs 1.3.1 / `@teachablemachine/image` 0.8.5).
- Live model: 42 labels. Fallback copy: 37 labels at
  `frontend/public/AI_Model_fallback/`.
- Frontend production build passes after the switch.
- Browser parity harness: `ml/offline/browser-parity.mjs` generated
  `ml/experiments/run-2026-09-11T12-03-16/parity/`; final browser-page
  confirmation remains blocked by the external TM script/model load and must
  be rerun before publication.
- Internet field testing started with held-out Commons queries using
  `ml/offline/field-test.mjs`, but was interrupted after 5/37 classes. No
  internet-image accuracy is claimed.

## Limitations

- Predictions are approximate and depend on image quality, lighting, and framing.
- The model should support estimation assistance only; users must be able to correct the
  predicted material category.
- Accuracy, dataset size, and geographic coverage should be documented when retraining
  data becomes available.