# A War Without Victory

Deterministic strategic-political simulation of the 1992-1995 Bosnian War.

## Start Here

- [docs/plans/MASTER_ROADMAP.md](docs/plans/MASTER_ROADMAP.md)
  - milestone sequencing and current delivery truth
- [docs/20_engineering/PRODUCT_ARCHITECTURE_AUTHORITY.md](docs/20_engineering/PRODUCT_ARCHITECTURE_AUTHORITY.md)
  - which architecture docs are live authority vs historical context
- [docs/20_engineering/PRODUCT_SHELL_HIERARCHY.md](docs/20_engineering/PRODUCT_SHELL_HIERARCHY.md)
  - canonical shell hierarchy for Warroom, Tactical Map, Army HQ, and Codex
- [docs/20_engineering/REPO_MAP.md](docs/20_engineering/REPO_MAP.md)
  - code/repo map and canonical entrypoints
- [docs/20_engineering/CODE_CANON.md](docs/20_engineering/CODE_CANON.md)
  - determinism and entrypoint discipline
- [docs/PROJECT_LEDGER.md](docs/PROJECT_LEDGER.md)
  - recent implementation history
- [docs/40_reports/GUI_MASTER.md](docs/40_reports/GUI_MASTER.md)
  - living tactical-map / shell truth for GUI work

## Core Commands

```powershell
npm run test:engine
npm run test:ui
npm run test:all
npx tsc --noEmit
npm run sim:scenario:run:40w
npm run sim:scenario:run:default
npm run dev:map
npm run desktop
```

## Repo Notes

- Root-level handoff and report artifacts may exist for historical context, but they are not architecture authority unless the docs above point back to them explicitly.
- Archived root session artifacts now live under [`docs/70_archive/root_session_artifacts/`](docs/70_archive/root_session_artifacts/).
- Test discovery is now convention-based rather than manually allowlisted. New Vitest files are picked up automatically, and files that declare `@vitest-environment jsdom` or use the `.browser.test.ts` suffix run under jsdom.
