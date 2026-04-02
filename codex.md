# AWWV context primer

## Authoritative docs

- **[docs/20_engineering/PRODUCT_ARCHITECTURE_AUTHORITY.md](docs/20_engineering/PRODUCT_ARCHITECTURE_AUTHORITY.md)** — which architecture docs are live authority vs historical context.
- **[docs/20_engineering/REPO_MAP.md](docs/20_engineering/REPO_MAP.md)** — canonical code/repo map.
- **[docs/20_engineering/CODE_CANON.md](docs/20_engineering/CODE_CANON.md)** — entrypoint and determinism discipline.
- **[docs/plans/MASTER_ROADMAP.md](docs/plans/MASTER_ROADMAP.md)** — roadmap and milestone ownership.
- **[docs/ENGINE_FREEZE_v0_2_6.md](docs/ENGINE_FREEZE_v0_2_6.md)** — historical freeze contract (keep for archaeology, not live roadmap sequencing).

## Mandatory workflow guardrails

- **Ledger:** Every Cursor prompt must **READ** [docs/PROJECT_LEDGER.md](docs/PROJECT_LEDGER.md) and **WRITE** a new changelog entry after completion.
- **Mistake log:** Use `loadMistakes()` and `assertNoRepeat("<context>")` in scripts; treat [docs/ASSISTANT_MISTAKES.log](docs/ASSISTANT_MISTAKES.log) as the canonical "do not repeat" source.

## Known blockers / current limitations

- **Missing `data/source/mun_code_crosswalk.csv`:** Polygons have `mid = null`. Mid-based municipality outlines cannot be derived. Fallback: national outline plus mun_code outlines for inspection only; inspector shows "No municipality outlines (mun_code_crosswalk.csv missing)".

## Historical note

`ARCHITECTURE_SUMMARY.md`, `morning-report.md`, and `nightshift-handoff.md` remain useful archaeology, but they are not live architecture authority. Use the product architecture authority map above before trusting any historical root memo.

## Phase 3ABC audit harness

- **Path:** `src/cli/phase3abc_audit_harness.ts`. **Run:** `npm run phase3:abc_audit` (or `npm run phase3:abc_audit:tsx`; both use tsx).
- Phase-aware: suppresses Phase 3B/3C metrics and related invariants unless those implementations are detected.
- Outputs: `data/derived/_debug/phase3abc_audit_report_{A,B,C,D}_*.txt`. Deterministic; no timestamps.
