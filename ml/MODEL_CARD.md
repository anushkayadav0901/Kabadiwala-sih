# Offline Classifier Model Card

## Purpose

## Validated staged run

- Run: `ml/experiments/run-2026-09-11T12-03-16/`
- Format: Teachable Machine / TensorFlow.js, 224x224 centre crop, `[-1, 1]` preprocessing
- Backbone: MobileNetV2 trunk recovered from the deployed model; frozen feature extraction
- Classes: 37 clean visual classes
- Held-out test: **55.9% top-1** (81/145), 78.6% top-3
- 95% Wilson interval for top-1: 47.7%–63.7%
- Mean 5-fold CV: **56.0%**
- Macro F1: 48.7%; macro recall: 51.1%
- High-confidence auto-accept: 31.0% coverage at 97.8% precision (1 wrong auto-accept in the held-out set)

The 55% target is met narrowly. This is a validation result, not a guarantee of
field accuracy. The model remains staged and was **not copied to
`frontend/public/AI_Model/`**.

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

## Runtime location

The model files live in `frontend/public/AI_Model/` because they are fetched by the web
application at `/AI_Model/`.

## Compatibility and validation status

- The staged export has the same layout, MobileNetV2 base tensors, 224px input,
  and Teachable Machine package marker as the deployed model.
- The staged model has 37 labels; the live model still has 10. This is expected.
- `frontend/public/AI_Model/` was not modified.
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