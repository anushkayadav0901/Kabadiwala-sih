# Retraining Notes

Keep training data and experiment outputs outside the repository unless a small,
reviewed sample is explicitly needed. Do not add generated weight files to a second
location.

When retraining the classifier, record:

1. Class names and class balance.
2. Image sources, consent, and licensing status.
3. Train/validation/test split and augmentation settings.
4. Per-class precision, recall, and confusion matrix.
5. Model version, export format, and frontend compatibility check.

After export, replace the runtime files in `frontend/public/AI_Model/`, run
`npm run build` from `frontend/`, and update `MODEL_CARD.md` with the measured results.