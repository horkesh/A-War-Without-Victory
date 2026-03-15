# CANON.md - Canonical Documentation Index

## Canon Status

The following documents are **CANON** (authoritative). Canon docs live in `docs/10_canon/`. At docs root: `docs/PROJECT_LEDGER.md` (append-only changelog) and `docs/PROJECT_LEDGER_KNOWLEDGE.md` (thematic knowledge base � decisions, patterns, rationale by topic).

- `docs/10_canon/Engine_Invariants_v0_7_0.md`
- `docs/10_canon/Phase_Specifications_v0_6_0.md`
- `docs/10_canon/Peace_Specification_v0_6_0.md`
- `docs/10_canon/War_Specification_v0_6_0.md`
- `docs/10_canon/Systems_Manual_v0_7_0.md`
- `docs/10_canon/Rulebook_v0_7_0.md`
- `docs/10_canon/Game_Bible_v0_6_0.md`
- `docs/10_canon/context.md` (process canon)

## Canon Precedence Order

When conflicts arise, resolve in this order:

1. **Engine Invariants v0.7.0** - Defines what MUST be true (correctness constraints)
2. **Phase Specifications v0.6.0** - Defines lifecycle contracts (Peace/War)
3. **Systems & Mechanics Manual v0.7.0** - Defines complete system behavior (implementation spec)
4. **Rulebook v0.7.0** - Defines player-facing experience
5. **Game Bible v0.6.0** - Defines design philosophy and constraints
6. **context.md** - Defines process canon (workflow, ledger, session runbook)

## Industry mapping

For readers used to standard game-dev documentation: **Game Bible + Rulebook + Systems Manual** together serve as the project's GDD; **Engine Invariants + Phase Specifications** are correctness and lifecycle contracts; **context.md** is process canon. Technical implementation details (entrypoints, repo layout, ADRs) live in `docs/20_engineering/` and reference canon.

## Rules

### Code Contradiction Rule
**If code contradicts canon docs, code is wrong.**

Canon documents define the authoritative specification. Implementation must conform to canon.

### War Start Rule (Phase D0.4a)
War begins only when the mandatory EC-coerced RBiH independence referendum has been held and current_turn == referendum_turn + 4. No referendum ? no war. See Peace and War specifications.

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

- `docs/10_canon/context.md` � Mandatory first read for all agent/Cursor work
- `docs/PROJECT_LEDGER.md` � Append-only project changelog
- `docs/PROJECT_LEDGER_KNOWLEDGE.md` � Thematic knowledge base
- `docs/10_canon/FORAWWV.md` � Validated design insights extending canon

## Canon Versioning

Canon v0.7 is the active canon (Engine Invariants, Systems Manual, Rulebook). Phase Specifications, Peace/War Specifications, and Game Bible remain at v0.6 (no changes needed). Deprecated v0.5 and older canon files have been removed.

One game turn equals one week.
