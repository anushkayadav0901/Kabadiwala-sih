# Offline Model Training Status

Last updated: 2026-09-14 (combined 42-label model PUBLISHED to frontend/public/AI_Model/; 37-label model kept as fallback)

## 2026-09-14 combined model: broad 37 + PS-critical e-waste as ONE model

Per request, both reviewed datasets were merged and retrained as a single
classifier. Orchestrator: `ml/offline/train-combined.mjs`.
**PUBLISHED 2026-09-14:** copied from
`ml/experiments/combined-run-2026-09-14T09-20-41/model/` into
`frontend/public/AI_Model/` (verified 42 labels; frontend build passes).
The broad 37-label model it replaced is kept as a rollback copy at
`frontend/public/AI_Model_fallback/`. The old 10-label backup
(`AI_Model_backup/`) and the superseded PS specialist folder
(`AI_Specialist/`) were removed — the 10-label model remains recoverable
from git history, and the specialist's labels are covered by the combined
model. Rollback = copy `AI_Model_fallback/` back to `AI_Model/`.

Merge policy (accuracy-guarded):
- All 37 broad classes kept, same review keep-list and 8/4 eligibility floor
  as the proven broad run — no previously trained class was dropped.
- PS specialist data merged into 3 broad classes whose eyeball-reviewed
  definitions match exactly: Copper Scrap, LCD/LED Monitor, Electric Motor.
- 5 new labels added from the specialist: Cables (56), PCB (81), Battery (54),
  Magnet Assembly (53), Mixed E-waste (26) — all above the specialist's own
  20-image/8-group floor.
- Deliberately NOT added: PS CRT (mixes CRT TVs and monitors; the broad model
  trains those separately), PS Other Metal (mixes brass/aluminium/iron), PS
  E-waste Plastic (18 kept, below the specialist's own floor).
- 4 cross-source visual duplicates dropped; leakage-safe whole-group splits;
  9-config × 5-fold CV; one-shot held-out test (222 images).

Held-out test: **58.1% top-1** (95% CI 51.5%–64.4%), **76.1% top-3**,
macro-F1 55.8% (vs 48.7% for the broad-only model), CV 57.4%.
Auto-accept gate: 90.6% precision at 28.8% coverage.
Export parity: max prob diff 1.19e-7, 0 label flips; structural check vs
deployed TM layout all true.

Honest comparison: top-1 improves over the published broad model (58.1% vs
55.9%) while adding 5 labels, and macro-F1 rises sharply (55.8% vs 48.7%),
but top-3 dips slightly (76.1% vs 78.6%) and per-label numbers on a 222-image
test set carry wide intervals. Weak labels on held-out: Mixed E-waste 20%
recall, Battery 18% (batteries mistaken for phones/tablets), Air Cooler 50%,
Refrigerator 20%, Tablet 25%, Generator 33%. The merged classes held up
(Electric Motor 75%, LCD/LED Monitor 58%, Copper Scrap 50% recall/67%
precision).

Switch state: the combined model is live in `frontend/public/AI_Model/`
since 2026-09-14; rollback is restoring the 37-label files from
`frontend/public/AI_Model_fallback/`. Nothing needed an app code change —
same TM/TFJS layout.

## 2026-09-12 PS-critical e-waste specialist (superseded by the combined model)

A second, separate classifier targeting the problem statement's priority
materials was built end-to-end. It is staged at
`ml/experiments/ps-run-2026-09-12T13-09-33/model/` and **nothing was copied
into `frontend/public/AI_Model/`** (verified by SHA-256 fingerprint before
and after the run).

Pipeline: `ml/ps-classes.mjs` (label definitions/policy) →
`ml/offline/ps-data.mjs` (provenance-tracked download, contact sheets,
SHA-1-keyed review) → `ml/offline/ps-dataset.mjs` (quality gate,
near-duplicate/series/author group split) → `ml/offline/train-ps-model.mjs`
(6-config × 5-fold CV, validation-only selection, one-shot test eval,
TM-compatible export with numerical parity check).

Data: 969 Wikimedia candidates downloaded across 11 classes, every one
eyeball-reviewed (`ml/offline/ps-label-review.json`); 486 kept. Copper was
re-downloaded three times with different query sets — Wikimedia simply does
not contain more usable copper-scrap photos (23 kept, 16 independent groups;
minimum image floor lowered 24→20 with copper flagged weak-data).
`ewaste_plastic` (17 usable images) stayed below the floor and is excluded.

Held-out test (79 images, group-disjoint, evaluated once after selection):

- **60.8% top-1**, 83.5% top-3, macro-F1 54.6%, PS-priority F1 57.9%.
- Auto-accept (confidence gate): 85.7% precision at 53.2% coverage.
- Strong: PCB 8/9, CRT 13/15, LCD Panel 7/8, Electric Motor 6/8.
- Weak: Cables 4/10 (confused with motors/LCD), Battery 4/9,
  Magnet Assembly 1/3, Other Metal 1/6, Mixed E-waste 2/7, Copper 2/4
  (100% precision — when it says copper, it is copper).
- Export parity: 20-sample numerical check vs exported model, max diff
  1.8e-7, zero label flips; structure identical to deployed TM model.

Honest limits: 10 classes, Wikimedia-only data, small supports per class —
this is a better-targeted model, not a field-proven one. Real scrap-yard
phone photos (300–500/class, copper and cables first) are the next accuracy
lever, plus a two-stage "e-waste vs not" gate before fine classification.

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

## 2026-09-11 validated staged run

The completed run is `ml/experiments/run-2026-09-11T12-03-16/`.

- 37 reviewed classes; 668 clean images after quality and leakage checks.
- Five-fold CV winner: no class weighting, 8 augmented views; mean accuracy
  56.0%.
- Held-out test: **55.9% top-1 (81/145)**, 78.6% top-3, macro-F1 48.7%.
- High-confidence auto-accept: 97.8% precision at 31.0% coverage.
- Export structure matches the deployed Teachable Machine model exactly.
- `frontend/public/AI_Model/` remains unchanged.

Per-class metrics and confusion matrix are in `metrics.json`. The target is
met narrowly, but the confidence interval is 47.7%–63.7%, so this is not a
production-quality guarantee.

Browser parity was prepared but the page did not finish loading the external
TM runtime/model in the validation browser. Internet-image testing was
started but interrupted after five of 37 classes. Neither result is claimed
as a pass.

Data verdict after review: all 37 classes are technically trainable, but
Desktop CPU, Hard Plastic, LCD/LED Monitor, Newspaper, Tablet, Power Inverter,
Geyser, Copper Scrap, Electric Fan, Generator, and Motorcycle are weak. Keep
manual confirmation for these until real phone-photo data is collected.
Geyser's original zero-image blocker is fixed, but 20 reviewed images are not
enough for reliable field classification.

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
