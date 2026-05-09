# Canon Doc Propagation Notes — 2026-05-07

**Lane:** LANE-NIGHTSHIFT-DOC-PROPAGATION-MAY-7
**Status:** AUDIT-ONLY (no canon doc edits made — flag for manual review)
**Scope:** Identify which sections of `docs/10_canon/*` are touched implicitly by this session's work and what manual amendment is recommended.

> **CRITICAL:** This document does NOT modify any canon doc. Per `CLAUDE.md` rule, **NEVER auto-edit `docs/10_canon/FORAWWV.md`**. All canon doc amendments below are recommendations only and require manual review by the user / canon authority.

## Session Surface Summary

This session shipped ~25+ commits across A1-A5 + Krivaja-95 + B-lane (DDR+B1+B2) + C-lane (DDR+C1+C2) + API-Directive Bridge + Q1 revert + drina-fix + D-lane (DDR+D1+D2) + telemetry wire + 5-lane batch + 3-lane backlog closure. Latest CI green at `759a35cd`. n1728 40w hash `79fa407377b40083` (26/27 anchors, 6/6 benchmarks). n1729 188w hash `e85303890ff4b601` (26/27 anchors, 6/6 post-reanchor, §6 floors PASS).

Key shipped capabilities:
- Claude-roleplay-as-all-3-layers QA infrastructure (presidents + army COs + corps COs)
- API-Directive Bridge — C1 corps-directive context wired into Claude commander prompts
- Persona telemetry side-channel emit (default-off; flag-gated)
- NW Bosnia OOB alignment (BB1 p.181-182 evidence-based)
- Stupčanica name-collision fix (data-not-comment exclusion principle)
- SRK siege defender morale Phase 0 DDR (canon §6.6 amendment draft)
- RBiH t40 benchmark re-anchor to post-5-lane equilibrium
- Jajce + JNA event consequence blocks closed
- D3.3 LLM persona triage (~11.5% genuine signal rate finding)

## Engine Invariants v0.9.0 — Sections Touched (Manual Review Recommended)

### §6 Front and Combat Invariants

**Specifically §6.6 (currently `Graz Accords` in Systems Manual; Engine Invariants §6 covers front/combat).**

- **SRK siege defender morale Phase 0 DDR (`bb0e449e`)** drafted a §6.6 amendment for Engine Invariants on SRK siege defender morale floor / cap behavior. Q1-Q6 design questions are documented in the audit; the lane is Phase 0 only — implementation is §6-blocked pending sign-off chain.
- **Manual amendment recommended:** review the DDR file at `docs/40_reports/audits/20260507_SRK_SIEGE_DEFENDER_MORALE_PHASE_0_DDR.md` (or filename in audits dir matching `bb0e449e`). The §6 sign-off chain (`/historian` + `/game-designer` + `/war-or-game`) is mandatory before any text amendment lands.
- **Status:** FLAG FOR MANUAL CANON-DOC REVIEW (Engine Invariants §6.x amendment, NOT auto-applied).

### §6.3 Ops-Only Attack Invariant

- **Bot operation-name pool exclusion (`759a35cd` Stupčanica fix):** the data-comment alignment principle reinforces SENSITIVE_HISTORY_DESIGN_GATE; Engine Invariants §6.3 already governs ops-only attack — no text amendment required, but the principle that **canonical names must be excluded from bot/AI generators by data, not just by comment** could be added as a §6.3 implementation note.
- **Status:** OPTIONAL — note-level addition only; not blocking.

### §11 Determinism Invariants

- **Persona telemetry side-channel (`59805cd6` + `e25c18c3`):** writes to `data/derived/_debug/d_lane_persona_decisions.jsonl` when env flags set. Default OFF; flag-gated. Path is harness-side (does not enter sim path / GameState).
- **Manual amendment recommended:** §11.4 Reproducibility could mention that persona-roleplay telemetry emits are flag-gated harness-side artifacts, not engine state, to clarify they are not part of the determinism contract.
- **Status:** OPTIONAL — clarification only; current canon already excludes harness-side artifacts implicitly.

## Systems Manual v0.9.0 — Sections Touched (Manual Review Recommended)

### §6.4 Corps command and army stance

- **D-lane persona system extends §6.4 in spirit** — A3+C1+D1+D2 wired Claude API personas into the army CO interpretation path. Engine canonical interface remains 6 verbs (`HOLD_AT_ALL_COSTS`, `PRESS_OFFENSIVE`, `MAINTAIN_CORRIDOR`, `PREPARE_RESERVE`, `HONOR_TRUCE`, `BALANCE_FRONTS`); persona-rich agent verbs (16-verb president intent) are canonicalized via `PRESIDENT_TO_CANONICAL` table at `bfcc9258`.
- **Manual amendment recommended:** Systems Manual §6.4 could be amended to mention persona-roleplay as a QA mode — flag-gated, default OFF, byte-stable when disabled. Existing §6.4 text on corps command / army stance is unchanged in mechanism; the amendment is to document the QA harness path that swaps deterministic personas for Claude personas at the same call sites.
- **Status:** FLAG FOR MANUAL CANON-DOC REVIEW (advisory text addition, NOT mechanism change).

### §6.6 Graz Accords / RS-HRHB Non-Aggression

- **NW Bosnia OOB alignment (`be7e0715`) is OOB-data-only**, no §6 mechanism change. Engine-gate fix (Q1 `6cbcaa00`) was REVERTED at `8ccdbff8` precisely because it would have constituted an undocumented §6.x mechanism change.
- **Manual amendment recommended:** none. The lesson is captured in KNOWLEDGE.
- **Status:** NO ACTION — OOB-data update only, not canon-affecting.

### §7.9 AI Commander System

- **D-lane persona infrastructure** extends the AI commander path with optional Claude API substitution. The deterministic AI commander remains the canonical engine path; persona is opt-in QA mode.
- **Manual amendment recommended:** §7.9 could mention persona-roleplay as a flag-gated QA harness path that produces side-channel telemetry without entering GameState.
- **Status:** OPTIONAL — clarification text addition.

### §7.6 Operation Preparation System

- **Stupčanica name-collision fix (`759a35cd`)** affects bot op-naming, not preparation mechanics. No §7.6 amendment required.
- **Status:** NO ACTION.

## SENSITIVE_HISTORY_DESIGN_GATE — Sections Touched (Reinforced, Not Amended)

### §1 The Three Rings — Ring 1 (Modeled mechanically)

- **Stupčanica name-collision fix (`759a35cd`) reinforces the Ring 1 principle** that canonical sensitive-history operation names cannot leak into bot-generated content. The data-comment alignment finding strengthens the existing canon: any reserved canonical name (operation, formation, event-id) must be excluded from bot/AI generators **by data**, not just by comment.
- **Manual amendment recommended:** §1 Ring 1 could add an implementation-note line: "Reserved canonical names (operations, formations, event-ids) MUST be excluded from bot/AI generators by data files (e.g., `operation_names.ts` exclusions), not by comment. Comment-vs-data drift produces phantom canon-violations."
- **Status:** OPTIONAL but recommended — the principle is now durable in KNOWLEDGE; canon-side mention would close the loop.

### §6 Sign-Off Structure

- **SRK siege defender morale Phase 0 DDR (`bb0e449e`)** is operating within §6 sign-off structure — Q1-Q6 design questions documented before implementation. This is the canonical Phase 0 pattern.
- **Status:** NO AMENDMENT — process is operating per canon; no text change needed.

### §8 Life Lessons

- Six new durable lessons added to `docs/PROJECT_LEDGER_KNOWLEDGE.md` head (this session). The SENSITIVE_HISTORY_DESIGN_GATE §8 list could optionally cross-reference KNOWLEDGE entries 1, 2, and 6 (calibration-overshoot risk; bot-pool name-collision; side-effect suppression).
- **Status:** OPTIONAL.

## FORAWWV.md — DO NOT EDIT (Per CLAUDE.md Rule)

Sections WHERE this session's work would touch FORAWWV.md if edits were authorized:

1. **Combat doctrine sections** — SRK siege defender morale Phase 0 DDR drafted §6.6 amendment material (Engine Invariants surface).
2. **Sensitive-history operations** — Stupčanica name-collision principle reinforces existing FORAWWV stance on canonical operation reservation.
3. **AI Commander System** — D-lane persona system extends QA-mode commentary surface.
4. **Calibration baselines** — n1728 40w / n1729 188w hashes could be referenced if FORAWWV maintains a baseline ledger.

**ALL FOUR SECTIONS:** FLAGGED FOR MANUAL REVIEW ONLY. No automated edits performed per CLAUDE.md rule. User must manually amend FORAWWV if any of these surfaces require canon-text update.

## Recommended Canon Review Sequence (Manual)

1. ~~**HIGH:** SRK siege defender morale §6 sign-off chain — DDR is staged at `bb0e449e`; Engine Invariants §6.x text amendment pending sign-off.~~ **RESOLVED 2026-05-09:** User signed off the recommendation `8e974004`; Phase 1 shipped at `ef5d01fc`/`5313fd41`/`71904efd`; canon §6.10 (corrected from DDR-proposed §6.6 because Systems Manual §6.6 was already taken by Graz Accords) landed in Engine Invariants v0.9.0 + Systems Manual v0.9.0 in commit `71904efd`. Phase 2 188w validation closed at `32c128f8`. The §6.10 entry covers schedule + floor + pipeline placement + env-flag gate + citations + faction-symmetric framing + ICTY references — full canon coverage of the mechanism.
2. ~~**MEDIUM:** Systems Manual §6.4 + §7.9 advisory text addition for persona-roleplay QA mode (flag-gated; default OFF; byte-stable).~~ **RESOLVED 2026-05-09:** Shipped at `d530bd75` per LANE-NIGHTSHIFT-CANON-DOC-AMENDMENTS-2026-05-07-PROPAGATION.
3. ~~**MEDIUM:** SENSITIVE_HISTORY_DESIGN_GATE §1 Ring 1 implementation-note on data-not-comment name-pool exclusion.~~ **RESOLVED 2026-05-09:** Shipped at `d530bd75` per same lane.
4. **LOW:** Engine Invariants §11.4 clarification on harness-side telemetry artifacts. **STILL OPEN** — low priority; not scheduled.
5. **MANUAL ONLY:** FORAWWV.md — the four section areas listed above; the user / canon authority must decide whether to amend. **NOTE:** FORAWWV §X-§XVI shipped 2026-05-07 at `bca414ba` (one-turn user-authorized exception to "never auto-edit FORAWWV") covering: AI Officers / political → army → corps chain (§X), Sensitive-history operation trigger floors (§XI), AI persona QA mode (§XII), OOB-data correctness (§XIII), Default-off byte-stability invariant (§XIV), Side-channel telemetry (§XV), Calibration discipline (§XVI). Future FORAWWV amendments remain manual-only per CLAUDE.md standing rule.

## Resolution status (2026-05-09)

3 of 4 listed items RESOLVED across two waves: §6.10 SRK siege defender (Phase 1 closeout `71904efd` + Phase 2 closeout `32c128f8`); Systems Manual §6.4/§7.9 + SENSITIVE_HISTORY_DESIGN_GATE §1 (`d530bd75`). FORAWWV §X-§XVI also covered (`bca414ba`). Remaining LOW item (Engine Invariants §11.4 telemetry clarification) is unscheduled.

## Determinism Footprint

- All session work outside `_debug/` paths is byte-stable when persona flags are OFF.
- n1728 40w hash `79fa407377b40083` and n1729 188w hash `e85303890ff4b601` are the post-session canonical baselines.
- Persona telemetry emits to `data/derived/_debug/d_lane_persona_decisions.jsonl` only when env flags are set.

## Cross-References

- `docs/PROJECT_LEDGER_KNOWLEDGE.md` (head) — six new durable lessons.
- `docs/40_reports/CALIBRATION_MASTER.md` — new n1728 + n1729 sections.
- `.claude/napkin.md` — current state entry with full lane attribution.
- `docs/40_reports/implemented/20260507_*.md` — per-lane closeout reports for each commit referenced above.
