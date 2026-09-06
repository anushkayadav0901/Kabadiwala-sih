# Repository Audit

## Current layout

- `frontend/` contains the Vite React application and its runtime public assets.
- `backend/` contains the current Supabase schema reference and backend placeholder.
- `ml/` contains model documentation and retraining notes only.
- `docs/` contains project context, backend guidance, and this audit.

## Decisions

- The duplicate root `AI_Model/` directory was removed. The runtime copy remains in
  `frontend/public/AI_Model/`.
- `.claude/` is excluded from Git and is not part of the contributor history.
- Dependencies and build output remain local and ignored.
- Frontend commands must be run from `frontend/`.

## Verification

Run `npm run build` from `frontend/` after frontend changes.