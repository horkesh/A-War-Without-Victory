# R7 Historical-Claim and Localization Inventories

**Date:** 2026-08-01

**Roadmap:** R7 Phase 0 completion checkpoint

**Disposition:** Deterministic inventory accepted; remediation remains open

## Result

R7 now has machine-readable, stably ordered inventories for historical claims and localization alongside the previously accepted officer/OOB and audio inventories. This checkpoint changes diagnostics and documentation only. It does not revise an event, essay, translation, simulation rule, save, package, version, or release state.

| Inventory | Census | Accepted/complete | Open remediation |
|---|---:|---:|---:|
| Historical claims | 406 claims / 226 files | 75 documented | 251 need source notes; 28 need source-floor completion; 52 sensitive player-choice claim rows are blocked |
| Sensitive-history event gate | 299 events | 253 without blocking findings | 34 missing source notes; 22 response options carrying sensitive-history copy; 1 generic-symmetry row |
| Localization keys | 5,542 EN keys | 5,541 Bosnian translations present through the legacy `bcs` dictionary | 1 explicit EN fallback; 599 length-risk candidates |
| Localization source scan | 386 UI source files | full deterministic census | 111 embedded-English candidates; 8 concatenated-copy candidates; 388 dynamic-key candidates |

The localization source findings are review candidates, not automatically product defects. Dynamic keys can be safe when their finite key maps are typed and covered; the inventory keeps their file/line/owner visible so the remediation phase can prove or replace them. Length risk is likewise a review queue, not a claim that 599 layouts currently overflow.

## Historical-claim contract

Every claim row now carries:

- file, line, field path, stable claim id, event/essay subject id, ring, and bounded excerpt/claim;
- event date/window and serialized live-state predicate when authored;
- source status, tier, exact citation text, provenance-only source note, actor/respondent, and player interaction type;
- explicit status and owner (`historian`, `historian+game-designer`, or `gameplay-programmer+historian`).

Strict mode fails closed when a claim is not documented, an anchor fails, or an event/essay year mismatch exists. The companion canon-gate audit surfaces sensitive player choices, calendar-only rupture claims, missing source notes, and generic symmetry wording as critical findings.

The production date audit finds zero event/essay year mismatches and zero calendar-only rupture claims. The one generic-symmetry finding is `grabovica_uzdol_massacres_1993`, whose effect text says no faction holds clean hands. It remains an explicit Historian-owned remediation row rather than being silently rewritten in an inventory task.

## Neretva / Grabovica / Uzdol chronology

Both required anchors pass:

| Anchor | Event file | Essay file | Window | Status |
|---|---|---|---|---|
| `operation_neretva_93_1993` | `data/scenarios/events/war_1993.json` | `data/scenarios/essays/operation_neretva_93_1993.json` | turns 74-76 | PASS |
| `grabovica_uzdol_massacres_1993` | `data/scenarios/events/war_1993.json` | `data/scenarios/essays/grabovica_uzdol_massacres_1993.json` | turns 74-76 | PASS |

The September 1993 placement is grounded in *Balkan Battlegrounds*, Vol. II, pp. 434-435 (local knowledge-base records `BB2_p0453.json` and `BB2_p0454.json`) and the existing ICTY Halilovic Trial Judgment citation (IT-01-48-T). The inventory preserves the required distinction between documented killings and Halilovic's acquittal on command responsibility; it adds no new factual prose.

## Localization contract

The inventory reports canonical Bosnian locale `bs`, formatting locale `bs-BA`, and current legacy alias/dictionary `bcs`. For every English key it records EN/BS text presence, fallback use, lengths, layout-risk disposition, status, source dictionary, and owner. It also walks player UI source with the TypeScript parser for:

- literal player copy in JSX/accessible attributes;
- concatenated copy fragments;
- non-literal `t(...)` message keys.

The only missing Bosnian row is the existing intentional probe `settings.experimentalFallbackProbe`. Runtime locale migration from `bcs` to `bs`, pseudo-localization, copy remediation, native review, and narrow/ultrawide layout proof remain later R7 phases.

## Action order

1. Historian: resolve or omit the 251 missing-note and 28 source-floor claims, starting with the 34 event-gate rows; remove generic symmetry and keep actor-specific claims.
2. Historian + Game Designer: inspect the 22 event response options / 52 claim rows classified as sensitive-choice surfaces; preserve only canon's narrowly allowed paramilitary-policy surface and convert refused history to information.
3. Localization: supply the one missing `bs` translation and classify every dynamic-key candidate as finite/typed or replace it.
4. UI/UX + Localization: replace embedded/concatenated copy and verify the 599 length-risk rows with pseudo-locale plus 1280x720 and 3440x1440 evidence.

No unsupported historical claim is promoted by this report. Open rows remain open with a named owner.

## Determinism and verification

- File-system walks, keys, findings, claims, citations, counters, and anchor rows use explicit lexical ordering.
- Reports contain no generated timestamp or absolute path.
- Diagnostics use no randomness or wall clock.
- `docs/10_canon/FORAWWV.md` was not edited.

The required focused matrix, TypeScript, canon, and repository hygiene results are recorded in the accompanying ledger entry and commit evidence.
