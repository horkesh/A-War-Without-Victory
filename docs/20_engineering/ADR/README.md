# Architecture Decision Records (ADR)

## Purpose
ADRs capture architectural decisions that affect determinism, phase ordering,
entrypoints, or canonical boundaries. They are immutable once accepted.

## When an ADR is Required
Create an ADR for any change that:
- Introduces or removes a pipeline entrypoint.
- Alters determinism-sensitive behavior or serialization boundaries.
- Changes phase ordering or system boundaries.
- Resolves a contradiction between code and canon.

## Canon References Required
Every ADR must cite relevant canon docs:
- `docs/10_canon/Engine_Invariants_v0_5_0.md`
- `docs/10_canon/Rulebook_v0_5_0.md`
- `docs/10_canon/Systems_Manual_v0_5_0.md`
- `docs/FORAWWV.md` (if applicable)

## Relation to Ledger
Every ADR must be recorded in `docs/PROJECT_LEDGER.md` with a brief summary and link.

## Template
Use `docs/ADR/ADR-0001-template.md` as the template.
