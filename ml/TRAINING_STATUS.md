# Offline Model Training Status

Last updated: 2026-09-11 (diagnosis done, retraining in progress)

## 2026-09-11 handoff: why the 32-class run scored 10.7%

Root causes, each verified in code or data rather than assumed:

1. **About half the training images show the wrong object.** Every image was
   reviewed by eye (`ml/offline/label-review.json`): 1,276 reviewed, 630 kept,
   646 removed. Wikimedia keyword search matches words in file titles, not image
   content, e.g. "iron scrap" = 22 pages of an 1895 ledger, "desktop tower" =
   Eiffel Tower and cathedrals, "fan" = sports fans, "stainless" = P-51 fighter
   planes, "feature phone" = Wikimedia Featured Pictures (galaxies, a tractor).
2. **No transfer learning.** A 3-layer CNN was trained from scratch at 64x64 on
   ~19 images per class. The working 10-class model is MobileNetV2 (ImageNet)
   at 224x224 plus a small head.
3. **Train/app preprocessing mismatch.** Training stretched images to 64x64 and
   scaled pixels to [0,1]. The app (@teachablemachine/image) centre-crops to
   224x224 and scales to [-1,1]. A model trained that way fails silently in the app.
4. No augmentation, no class-imbalance handling, a biased sort-based shuffle,
   independent splitting of near-duplicate and same-series photos (leakage), and
   blank red "thumbnail failed" frames saved as valid JPEGs.

Done so far (all in `ml/offline/`, nothing in the app or `frontend/public/AI_Model/` touched):

- Teachable-Machine-parity preprocessing, measured against Chrome's real `cropTo`.
- Image-by-image label review with SHA-1 keys (the downloader truncates titles,
  so distinct files can share a filename).
- The app's own quality gate applied to training data; leakage-safe group splits.
- Parallel MobileNetV2 feature extraction; a verified fast head trainer
  (gradient check passes, 6.3x faster than tfjs).
- Export that matches the deployed model layout exactly (checked structurally
  and numerically).

Not done yet: final retrain and evaluation, browser parity test with the real
TM library, testing on internet images, the final report.

Data verdict so far: 29 classes are trainable. **Too little clean data to train:**
Geyser (0), Stainless Steel (3), Copper Scrap (3), Iron Scrap (4), Generator (4,
~3 unique), Power Inverter (4), Printer (5), Tablet (5). Keep these as manual
selection until real photos are collected.

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
