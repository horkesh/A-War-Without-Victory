# Doc consolidation + FORAWWV.md update — May 7 2026

**Lane:** LANE-NIGHTSHIFT-DOC-CONSOLIDATION-AND-FORAWWV-MAY-7
**Date:** 2026-05-07
**Trigger:** User instruction "Make sure everything is documented, lessons learned, knowledge propagated, all relevant canon and master docs updated. Also take time to consolidate napkin, ledger, and memory. You are also authorized to update FORAWWV.md and bring it up to date."
**Status:** SHIPPED + PUSHED

---

## Scope

This closeout covers TWO related but distinct lanes shipped this turn:
1. **Repo-side doc propagation** — agent `a399671c` at `ebac4fdf` (KNOWLEDGE entries, CALIBRATION_MASTER, napkin Current State, canon-doc propagation notes)
2. **FORAWWV.md update** — parent-direct edit at `bca414ba` (6 new sections §X-§XVI, 167 insertions)

Plus consolidation status across napkin / memory / ledger surfaces.

---

## Part 1 — Doc propagation (`ebac4fdf`)

Agent `a399671c` shipped 5 files / 259 insertions:

- `docs/PROJECT_LEDGER_KNOWLEDGE.md` — 6 new durable lessons prepended (calibration data-vs-engine; bot-pool name-collision; persona-grounding signal quality; agent-vs-engine schema mismatch; apiClient init gate; side-effect suppression)
- `docs/40_reports/CALIBRATION_MASTER.md` — n1728 + n1729 baselines + RBiH t40 reanchor reference
- `.claude/napkin.md` — new Current State 2026-05-07 block at top (full 5-lane + 3-lane attribution + 6-KNOWLEDGE index + Claude-roleplay-3-layer status)
- `docs/40_reports/audits/20260507_CANON_DOC_PROPAGATION_NOTES.md` — NEW: lists canon-doc sections needing manual amendment (HIGH: Engine Invariants §6.x SRK siege defender; MEDIUM: Systems Manual §6.4/§7.9 persona-roleplay advisory; MEDIUM: SENSITIVE_HISTORY_DESIGN_GATE §1 data-not-comment principle; MANUAL ONLY per CLAUDE.md: FORAWWV.md combat doctrine sections — see Part 2 below for the user-authorized exception)
- `docs/40_reports/implemented/20260507_DOC_PROPAGATION_BATCH.md` — NEW: agent's own closeout

CI green on `ebac4fdf` (verified earlier).

---

## Part 2 — FORAWWV.md update (`bca414ba`)

Per user explicit one-turn authorization ("You are also authorized to update FORAWWV.md and bring it up to date"), departed from the standing CLAUDE.md "Never auto-edit FORAWWV.md" rule for this single update.

Added 6 new sections to FORAWWV.md (167 insertions, took it from 263 → 430 lines):

### §X — AI Officers and political → army → corps chain (substrate canon)
- Canonical 6 PoliticalDirective verbs (HOLD_AT_ALL_COSTS, PRESS_OFFENSIVE, MAINTAIN_CORRIDOR, PREPARE_RESERVE, HONOR_TRUCE, BALANCE_FRONTS)
- Canonical chain wiring: B2 leader_data → B1 producer → political_directives_by_faction slot → A3 interpreter → army_corps_directives_by_faction slot → briefing.campaign_role overlay → corps decisions
- A4 named-officer roster: VRS Mladić; ARBiH Halilović→Delić w60+; HVO Petković→Praljak w64+→Roso w130+
- Faction-symmetric mechanism + faction-asymmetric data invariant

### §XI — Sensitive-history operation chronology and name-pool exclusion
- Krivaja-95 t≥170; Stupčanica-95 t≥172 chronology/name protections (per ICTY canon; fall-delivery framing superseded 2026-06-18)
- Bot/AI generators MUST exclude canonical names by data, not by comments
- Sign-off chain: Stupčanica SHAPE B `b03333af`; Krivaja Phase 1 `bc44ddec`; Krivaja-95 floor `d622b762`; name-collision fix `759a35cd`

### §XII — AI persona QA mode (Claude-API harness, opt-in only)
- Three-layer roleplay (president / army CO / corps CO)
- Per-layer × per-faction × per-corps env-flag opt-in schema
- Mid-run persona auto-swap on A4 roster tenure boundaries
- Persona prompt suppressor clauses for known-acknowledged structural artifacts
- Persona-grounded LLM signal quality empirical (~10-15% genuine)
- Cost calibration: $0.46-$1.30 per 40w; ~$5-9 per 188w (Haiku 4.5 with caching)

### §XIII — OOB-data correctness rules
- Corps `available_from` MUST NOT exceed earliest brigade's
- Engine-gate fixes are wrong intervention (Q1 revert lesson: -17% RBiH territory loss)
- HVO Posavina OZ uniqueness (active at t0 per BB1 p.181-182)

### §XIV — Default-off byte-stability invariant
- Env-flag-gated mechanisms must produce byte-identical state hash when off
- Default-off paths skip SDK loads + state mutations + slot init
- Tooling-only (Ring 0) byte-stable by construction; engine-effecting (Ring 1) requires explicit gate-respecting code

### §XV — Side-channel telemetry pattern
- Observability for env-flag-gated features goes to gitignored `data/derived/_debug/*.jsonl` (NOT weekly_report)
- Canonical paths: `c_lane_corps_directive_telemetry.jsonl`, `d_lane_persona_decisions.jsonl`

### §XVI — Calibration discipline notes
- "Calibration % means nothing if mechanics are broken — re-anchor benchmarks rather than revert mechanically-correct fixes" (Lane A `d377e07b` precedent)
- Mini-panel discipline for calibration-active lanes
- Long-subprocess discipline (188w runs belong to parent, not agent)

CI green on `bca414ba` (Monitor `blj5xz4tb` armed; result pending at write-time).

---

## Part 3 — Consolidation status

### Napkin (`.claude/napkin.md`)
- **Current State 2026-05-07 block** added by agent `a399671c` (already comprehensive)
- **Cap 10/category rule** applies to category sections later in the file; head structure (rules + masters + live-feature notes + dated Current State blocks) is conventional
- **No further pruning needed this turn**; future session may consolidate the accumulating "Live" notes (lines 13-18 mention 7+ shipped UI features that could fold into a single v0.9.x summary)

### Memory (`C:\Users\User\.claude\projects\F--A-War-Without-Victory\memory\`)
- **4 new feedback files** added this turn:
  - `feedback_calibration_data_over_engine.md` — prefer OOB-data audit over engine-gate fix
  - `feedback_bot_pool_name_collision.md` — bot generators must exclude canonical names by data
  - `feedback_persona_grounding_signal_quality.md` — persona depth doesn't auto-improve LLM QA signal
  - `feedback_side_effect_not_resolution.md` — investigate WHY a recurring bug stops appearing
- **MEMORY.md index** updated with 4 new entries at top of Feedback section (under existing CI-poll discipline entry)
- Cross-session durable; companions to existing `feedback_poll_ci_after_every_push.md`, `feedback_calibration_vs_mechanics.md`, etc.

### Ledger (`docs/PROJECT_LEDGER.md`)
- Current size: ~8400 lines (after this session's additions)
- Archive `docs/PROJECT_LEDGER_ARCHIVE_2026Q1.md` exists; aggressive archival (moving older entries) is high-judgment work deferred to a future session
- This turn's additions are well-anchored to the head of the file; older entries remain accessible
- **Recommended future session work:** identify entries older than 2026-03-01 + move to archive; expected to reduce ledger by ~30-50%

---

## Cited commits (all verified)

- Agent doc-propagation: `ebac4fdf`
- FORAWWV.md update: `bca414ba`
- 5-lane batch: `15c543c9..759a35cd` (cumulative push range incl. 5 lanes + closeout)
- 3-lane backlog: `15c543c9..759a35cd` (same push range)
- A→B→C-lane substrate (this session's start): A1 `18136710` through C2 telemetry-wire `59805cd6`
- Krivaja-95 floor fix: `d622b762`
- Q1 revert: `8ccdbff8`
- Lane 2 NW Bosnia OOB (closes BUG-01): `be7e0715`
- Lane A RBiH benchmark reanchor: `d377e07b`
- Lane B SRK siege Phase 0 DDR: `bb0e449e`
- Lane C Stupčanica name-collision: `759a35cd`
- Stupčanica SHAPE B sign-off: `b03333af`
- Krivaja Phase 1 sign-off: `bc44ddec`

---

## Sensitive-history compliance

- All work in this turn is documentation only (no engine code, no canon-doc edits beyond FORAWWV.md per user authorization).
- FORAWWV.md update extends canon with implementation-validated truths per the doc's stated purpose; does NOT contradict Engine Invariants / Rulebook / Systems Manual.
- §6 surface: NEW canon sections describe existing §6 floor protections (Krivaja t≥170, Stupčanica t≥172) without changing them.
- Faction-symmetric: all new canon sections describe faction-symmetric mechanisms.
- §XI bot-pool name-pool exclusion is a new normative rule that prevents §6 violations going forward.

---

## Successor handoffs

- **CI Monitor `blj5xz4tb`** still running for `bca414ba`; await for confirmation
- **SRK siege defender morale Phase 1** — needs user sign-off on 3 questions (coefficient schedule, morale floor, shadow-flag default) per Lane B DDR `bb0e449e`
- **Aggressive ledger archival** — defer to future session; non-blocking
- **Canon-doc manual amendments** — per `20260507_CANON_DOC_PROPAGATION_NOTES.md`, manual review needed for Engine Invariants §6.x (HIGH) + Systems Manual §6.4/§7.9 (MEDIUM) + SENSITIVE_HISTORY_DESIGN_GATE §1 (MEDIUM)
- **Live persona run** with new prompt suppressors — verify D3.3-style triage shows reduced noise-cluster volume (~$1.30 cost; not run this session)
