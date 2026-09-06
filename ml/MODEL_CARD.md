# Material Classification Model Card

## Purpose

The frontend uses a Teachable Machine image model to classify common electronic scrap
categories during the collection flow.

## Runtime location

The model files live in `frontend/public/AI_Model/` because they are fetched by the web
application at `/AI_Model/`.

## Limitations

- Predictions are approximate and depend on image quality, lighting, and framing.
- The model should support estimation assistance only; users must be able to correct the
  predicted material category.
- Accuracy, dataset size, and geographic coverage should be documented when retraining
  data becomes available.