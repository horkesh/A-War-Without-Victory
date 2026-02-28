# CANON.md - Canonical Documentation Index

## Canon Status

The following documents are **CANON** (authoritative). Canon docs live in `docs/10_canon/`. At docs root: `docs/PROJECT_LEDGER.md` (append-only changelog), `docs/PROJECT_LEDGER_KNOWLEDGE.md` (thematic knowledge base — decisions, patterns, rationale by topic), and `docs/ASSISTANT_MISTAKES.log` (if present).

- `docs/10_canon/Engine_Invariants_v0_5_0.md`
- `docs/10_canon/Phase_Specifications_v0_5_0.md`
- `docs/10_canon/Phase_II_Specification_v0_5_0.md`
- `docs/10_canon/Systems_Manual_v0_5_0.md`
- `docs/10_canon/Rulebook_v0_5_0.md`
- `docs/10_canon/Game_Bible_v0_5_0.md`
- `docs/10_canon/Phase_0_Specification_v0_5_0.md`
- `docs/10_canon/Phase_I_Specification_v0_5_0.md`
- `docs/10_canon/context.md` (process canon)

## Canon Precedence Order

When conflicts arise, resolve in this order:

1. **Engine Invariants v0.5.0** - Defines what MUST be true (correctness constraints)
2. **Phase Specifications v0.5.0** - Defines HOW frozen systems work (when they exist)
3. **Systems & Mechanics Manual v0.5.0** - Defines complete system behavior (implementation spec)
4. **Rulebook v0.5.0** - Defines player-facing experience
5. **Game Bible v0.5.0** - Defines design philosophy and constraints
6. **context.md** - Defines process canon (workflow, ledger, mistake guards)

## Industry mapping

For readers used to standard game-dev documentation: **Game Bible + Rulebook + Systems Manual** together serve as the project’s Game Design Document (GDD); **Engine Invariants + Phase Specifications** are correctness and phase contracts; **context.md** is process canon. Technical implementation details (entrypoints, repo layout, ADRs) live in `docs/20_engineering/` and reference canon.

## Rules

### Code Contradiction Rule
**If code contradicts canon docs, code is wrong.**

Canon documents define the authoritative specification. Implementation must conform to canon.

### War Start Rule (Phase D0.4a)
War begins only when the mandatory EC-coerced RBiH independence referendum has been held and current_turn == referendum_turn + 4. No referendum → no war; no war → Phase I is never entered. If the referendum window expires, Phase 0 ends in a non-war terminal outcome (BiH remains in Yugoslavia). See Phase 0 and Phase I specifications.

### Determinism Rule
- No randomness in simulation logic
- No timestamps in derived artifacts
- Stable ordering for all iterations affecting output
- Deterministic serialization (reproducible outputs)

### Systemic Design Insights Rule
Systemic design insights discovered during implementation must be flagged for `docs/10_canon/FORAWWV.md` addendum. **Do not auto-edit FORAWWV.md.** Flag with note:

```
**docs/10_canon/FORAWWV.md may require an addendum** about [insight].
Do NOT edit FORAWWV automatically.
```

## See Also

- `docs/10_canon/context.md` — Mandatory first read for all agent/Cursor work (includes ledger structure and when to use each doc)
- `docs/PROJECT_LEDGER.md` — Append-only project changelog (docs root)
- `docs/PROJECT_LEDGER_KNOWLEDGE.md` — Thematic knowledge base: decisions, patterns, rationale by topic (docs root)
- `docs/10_canon/FORAWWV.md` — Validated design insights extending canon
- `docs/40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md` — Single implementation reference: sections 1–10 cover combat/battle resolution (§1), recruitment/accrual (§2), brigade AoR/corps (§3), Phase I control/no-flip (§4), scenario runs/handoffs (§5), tactical map/viewer (§6), desktop GUI (§7), canon checkpoints (§8), other resolved (§9), Warroom/Phase 0 and systems integration (§10)
- **Canonical GUI (React + MapLibre):** `docs/20_engineering/AWWV_GUI_ARCHITECTURE_REWORK_v2.md` — implementation spec; `docs/40_reports/20260228_REACT_MAP_APP_COMPREHENSIVE_STATUS.md` — full done/remaining status. **Aesthetic target:** `docs/30_planning/20260221_settlement remapping and GUI rework/HOI_VISUAL_GUI_OVERHAUL_SPEC.md` (sidebar: ARMY / SITUATION tabs; panel interaction patterns: §3.8). Phase A/B baseline implemented in `src/ui/map/`; Phase C is next.
- `docs/40_reports/audit/20260222_CANON_VS_INDUSTRY_STRUCTURE_AUDIT.md` — Canon vs industry structure audit and reorganization options

One game turn equals one week.
