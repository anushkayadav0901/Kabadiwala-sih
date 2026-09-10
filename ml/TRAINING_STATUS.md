# Offline Model Training Status

Last updated: 2026-09-10 (training pipeline in progress)

## Goal

Replace the current 10-label offline TF.js image classifier with a broader,
fully local classifier. It should identify the visible material or appliance
family; the collector selects any price-specific variant from the 79-option
dropdown afterwards.

## Label policy

Do **not** make a separate visual label for pricing-only variants that cannot
be reliably determined from a photograph. In particular, AC tonnage and its
copper/aluminium internals remain manual selections.

Train these as broad visual appliance labels when enough reviewed images exist:

- AC
- Refrigerator
- Washing Machine
- Microwave
- Dishwasher
- Geyser
- Fan
- Electric Motor
- Generator
- Air Cooler
- Inverter
- Treadmill
- EV charging station

For non-appliance items, train each visually distinct catalogue category where
there are enough reviewed images. Avoid classes such as used cooking oil that
cannot be classified safely from a general photo.

## Current model (not yet replaced)

- Runtime directory: `frontend/public/AI_Model/`
- Format: Teachable Machine / TensorFlow.js
- Current labels: Battery, Keyboard, Microwave, Mobile, Mouse, PCB, Player,
  Printer, Television, Washing Machine
- The current export has no Keras/optimizer checkpoint, so it cannot be truly
  resumed. The replacement will be a new model trained from the local dataset.

## Dataset status

- Candidate images: `ml/catalog-dataset/`
- Existing candidate classes: 13
- Classes with at least 20 downloaded candidates:
  `aluminium_scrap`, `books`, `brass_scrap`, `cardboard`, `copper_scrap`,
  `hard_plastic`, `iron_scrap`, `magazine`, `newspaper`,
  `soft_plastic_film`, `stainless_steel`.
- `electrical_panel` (8 images) and `nickel_scrap` (7 images) need more data.
- Candidate images are from Wikimedia Commons and **must be reviewed before
  use**. The current `cardboard` search is known to include irrelevant
  `gutta`-related results, so it must be cleaned or re-downloaded with better
  queries.
- Attribution data is in `ml/catalog-dataset/ATTRIBUTION.json`.

## Installed local training dependencies

`ml/package.json` and `ml/package-lock.json` record the setup:

- `@tensorflow/tfjs` 1.3.1 (matches the frontend runtime)
- `jpeg-js`
- `pngjs`

The available Python is an MSYS build without `pip`; use the Node/TF.js path
unless a supported Python environment is installed deliberately.

## Implemented in this session

- Added `visual-classes.mjs`: 39 broad, photograph-recognisable labels.
- Added `download-visual-dataset.mjs`: resumable Wikimedia Commons candidate
  downloader with attribution output.
- Added `train-offline-model.mjs`: CPU TF.js trainer with deterministic
  stratified 70/15/15 splits, decoding checks, metrics and confusion matrix.
- The trainer writes experiment artefacts to `ml/experiments/` and publishes
  only when invoked with `--publish` and held-out accuracy is at least 55%.
- Added npm scripts: `npm.cmd --prefix ml run download:visual` and
  `npm.cmd --prefix ml run train`.
- Updated the scan flow so broad appliance labels require a manual catalogue
  selection before confirmation; the frontend production build passes.
- A background collection job is currently running. Its stdout/stderr logs are
  `ml/logs/visual-download.log` and `ml/logs/visual-download.error.log`.

## Remaining work

1. Let the current candidate collection finish; inspect `ml/logs/` if it stops.
2. Spot-review every class and remove incorrectly labelled candidates before
   publishing. Automated decoding is already performed by the trainer but is
   not a substitute for semantic review.
3. Train an experiment: `npm.cmd --prefix ml run train`.
4. Inspect `ml/experiments/<run>/metrics.json`, especially the per-class rows
   in its confusion matrix. Add better data for weak/sparse classes and repeat.
5. Publish only a satisfactory run:
   `npm.cmd --prefix ml run train -- --publish`.
6. Update `MODEL_CARD.md` with measured results and test the scan flow with
   real photos after publication.

## Safety / compatibility checks

- Keep a confirmation step after every model prediction.
- Never silently map a newly trained label to an unrelated price category.
- Do not overwrite `frontend/public/AI_Model/` until validation metrics and the
  frontend build pass.
- Preserve the generated model in only the runtime location after approval;
  experiment outputs should stay outside version control.
