# D-Lane DDR — Claude as All 3 Character Layers (President + Army CO + Corps CO)

**Lane:** LANE-NIGHTSHIFT-D-LANE-PHASE-0-PANEL
**Date:** 2026-05-07
**Predecessors:** A1 (`18136710`), A3 (`c8ff93d8`), A4 (`93c75b1d`), A5, Krivaja, A-lane DDR (`eee308e0`), B-lane DDR (`941bd68e`), B1 (`44053a32`), B2 (`d019bef7`), C-lane DDR (`57cec91c`), C1, C2, API-Bridge (`a2d564e6`), Q1 (`6cbcaa00`), Q2 (`3bab0eb0`), Q3 (`aa30f349`).
**Smoke + signal:** API-Bridge smoke `bft5bixcj` (bridge biting confirmed); Tier-1 panel surfaced 12% genuine-signal floor + DG-CLUSTER-1 ("directive vocabulary too coarse") = 47% of design gaps — the highest-leverage gap is already a directive-expressivity problem the persona layer is uniquely positioned to address.
**Checkpoint (DDR draft):** context gathered from `api_commander.ts`, `api_corps_commander.ts`, `mladic_strategy.json`, `commanders/rs_mladic.json`, B1 producer header, B2 `political_leader_data.json`, A4 `army_co_roster.json`. No source-code touched. Design-only DDR follows.

## Overview

User's priority statement: "I want Claude to be able to assume all levels — president, army CO, corps COs." Today only two of three layers have any Claude path: `api_commander.ts` covers army-CO decisions, `api_corps_commander.ts` covers corps-CO decisions, and presidents are entirely deterministic via B1's verb-emitting producer reading B2's `political_leader_data.json`. The existing api_* files are decision-shaped (corps_stances + sector_stances + observations) but persona-shallow — system prompts are assembled inline from `CommanderProfile` JSON loaded at run boot, with no role-rank parameterization, no per-officer voice/biographical depth, and no president-rank surface at all.

D-lane addresses three gaps simultaneously: (1) **add the missing president layer** so Claude can roleplay Karadžić / Izetbegović / Boban issuing the political verb that B1 currently selects deterministically from B2's hawkishness/flexibility/IVP scalars; (2) **deepen persona-roleplay** at the army-CO and corps-CO layers so the api_* paths emit briefings written in named-officer voice rather than archetype voice; (3) **make the three layers mix-and-matchable** per faction (and per corps) so a researcher can run, e.g., Karadžić-Claude + Mladić-deterministic + Drina-Corps-Claude in a single 40w pass. The existing `mladic_strategy.json` (Phase-1/2/3/4 doctrine + per-turn briefings) and B2's `_sources` arrays are the persona-content foundation already on disk; D-lane structures them into a uniform persona-encoding layer the three api_* surfaces can share.

The DG-CLUSTER-1 finding ("directive vocabulary too coarse") is the strategic justification: the deterministic president → A3 → corps chain bottlenecks through six verbs (HOLD_AT_ALL_COSTS, PRESS_OFFENSIVE, MAINTAIN_CORRIDOR, PREPARE_RESERVE, HONOR_TRUCE, BALANCE_FRONTS). A Claude-roleplay president can emit the same verb but with prose context (target_corps, justification, red-line invocation) that downstream Claude-roleplay COs can read. This is the cheapest way to expand expressivity without rewriting the verb ladder.

## Q1 — Architecture: extend existing modules vs unified `api_persona.ts`

**Recommendation: extend, do NOT unify.** Add a new `tools/claude_plays_vrs/api_president.ts` that mirrors the structure of `api_commander.ts` (system prompt builder + state prompt builder + `generateApiPresidentDecision`), and keep `api_commander.ts` and `api_corps_commander.ts` as-is structurally. Refactor only the **persona-loading helper** (currently inline `loadCommander()` reading `commanders/*.json`) into a shared `tools/claude_plays_vrs/persona_loader.ts` that returns a `PersonaProfile` discriminated by `role: 'president' | 'army_co' | 'corps_co'`.

Rationale: the three layers have **different output schemas** — president emits a `PoliticalDirective` (verb + target_corps + IVP-justification text), army-CO emits `corps_stances + observations`, corps-CO emits `sector_stances + assessment`. A unified `api_persona.ts` parameterized by role would carry three distinct JSON-schema branches, three distinct state-serialization branches, and three distinct prompt-token-budget bands (president ≈ small per turn, army-CO ≈ medium, corps-CO ≈ medium × N corps). Splitting by file keeps each layer's surface readable and lets each layer ship/regress independently. Persona content (per-officer voice, doctrine, red lines, BB I/II + ICTY citations) is the only thing legitimately shared, and that's exactly what `persona_loader.ts` extracts.

Expected file structure: `tools/claude_plays_vrs/api_president.ts` (NEW, ~200 LOC mirror of `api_commander.ts`), `tools/claude_plays_vrs/persona_loader.ts` (NEW, ~80 LOC), `tools/claude_plays_vrs/personas/{karadzic,izetbegovic,boban,mladic,halilovic,delic,petkovic,praljak,roso}.json` (NEW persona JSON files; one per named officer covered by A4 roster + B2 leader-data); existing `api_commander.ts` and `api_corps_commander.ts` get a one-import change to consume `loadPersona(officer_id)` instead of inlining `commanders/*.json` paths.

## Q2 — Persona-encoding system

**Recommendation: option (a) per-officer system-prompt JSON files**, structured to **subsume option (d)** by referencing the existing canon data rather than duplicating it. Each `personas/<officer_id>.json` holds: `officer_id`, `role` (president/army_co/corps_co), `faction`, `name`, `voice` (free-prose paragraph — direct quotes-style, derived from BB I/II + ICTY transcripts where available), `personality_scalars` (echoes A4 stubbornness + B2 hawkishness/flexibility/IVP/patron_deference/impunity for that officer), `historical_doctrine` (priorities + red_lines + phase_doctrine — promoted from `mladic_strategy.json`'s Phase-1/2/3/4 framing), `succession` (transition_week + replaces_with mirroring A4 schedule), `_sources` (array of BB chapters + ICTY case + transcript citations — promoted from B2's `_sources` arrays).

Why not (b) inline blocks in api_*.ts: persona prose grows; embedding it in TS makes diffs noisy and prevents a non-engineer (historian skill) from authoring/editing voice without touching code. Why not (c) generate-from-canon at run time: introduces non-determinism in prompt construction (canon doc edits would silently shift smoke baselines) and adds a doc-parse step for no benefit. Why not pure (d) reuse-existing-JSON: B2's `political_leader_data.json` and A4's `army_co_roster.json` are scalar/schedule-shaped, not voice-shaped — they tell the producer how-much-hawkish, not how-the-officer-talks. The persona files explicitly **augment** (a) with prose; the scalar substrate stays in B2/A4 unchanged so deterministic baselines don't shift.

File layout: `tools/claude_plays_vrs/personas/<officer_id>.json`. Officer IDs match A4 roster (`vrs_mladic`, `arbih_halilovic`, `arbih_delic`, `hvo_petkovic`, `hvo_praljak`, `hvo_roso`) plus president IDs from B2 (`rs_karadzic`, `rbih_izetbegovic`, `hrhb_boban`). Corps-CO persona files added incrementally per corps as authored (initial set: Galić for SRK siege voice, Krstić for Drina post-1995, Mladić-as-MS for VRS top); other corps fall back to archetype voice via `default_corps_co.json` until authored.

## Q3 — Env-flag schema for per-layer × per-faction × per-corps opt-in

**Recommendation:** mirror C-lane's `C_LANE_*_DISABLED=true` opt-OUT pattern but invert to opt-IN (Claude paths are off by default; explicit env flag opts a specific layer/faction/corps in). Schema:

- Layer × faction: `CLAUDE_AS_PRESIDENT_RS=true`, `CLAUDE_AS_PRESIDENT_RBIH=true`, `CLAUDE_AS_PRESIDENT_HRHB=true`, same triple for `CLAUDE_AS_ARMY_CO_*`.
- Layer × faction × corps: `CLAUDE_AS_CORPS_CO_RS_DRINA=true`, `CLAUDE_AS_CORPS_CO_RBIH_2ND_TUZLA=true`, etc. — corps suffix matches the GameState `corps_id` uppercased and stripped of the faction prefix where redundant, with a tolerant parser (e.g., `vrs_drina` ↔ `RS_DRINA`).
- Wildcards: `CLAUDE_AS_CORPS_CO_RS_ALL=true` (all VRS corps), `CLAUDE_AS_ALL_LAYERS_RS=true` (all three layers for one faction). Wildcards expand at script boot to the explicit set; a single explicit flag overrides a wildcard's negation.

Scripts read these via a `parseClaudeEnvFlags()` helper in `persona_loader.ts` returning `{ presidents: Set<faction>, army_cos: Set<faction>, corps_cos: Set<corpsId> }`. The orchestration script (`run_personas.ts`, see Q7) iterates this set per turn and calls `generateApiPresidentDecision` / `generateApiDecision` / `generateCorpsApiDecision` only for slots in the set; everything else continues to flow through the deterministic B1/A3/bot_corps_orders chain. This preserves the C-lane invariant that **persona-disabled paths are byte-stable** — no flags set ⇒ no Claude calls ⇒ identical to current main.

## Q4 — Determinism / canonical-baseline isolation

(a) **Calibration baselines + CI smoke NEVER use Claude unintentionally:** the opt-IN flag schema (Q3) means default behavior of `npm run sim:scenario:run:40w`, vitest suites, and `desktop:map:build` makes zero API calls. Add a CI-only assertion in `run_personas.ts` that aborts with a clear error if any `CLAUDE_AS_*` env flag is set when `CI=true && CLAUDE_AS_ALLOW_IN_CI != true`, preventing accidental persona-on runs in CI logs.

(b) **Persona-flagged runs clearly excluded from determinism invariants:** runs with any `CLAUDE_AS_*` flag set write to a separate output subdirectory `data/derived/runs/persona/<run_id>/` (NOT `data/derived/runs/<run_id>/`), and stamp the final-save metadata with `{persona_flags: [...], persona_run: true}`. Calibration tooling (`tools/scenario_compare.ts`-equivalent) already filters by `persona_run !== true` for hash-stability checks. The 40w canonical hash chain (currently `7a1fddce105993e7` post-B2) is structurally untouchable from a persona run.

(c) **Caching reduces non-determinism for repeated runs:** Anthropic prompt caching cuts both cost and variance. The system prompt per officer is stable across all turns (persona JSON content) — mark it `cache_control: {type: 'ephemeral'}` so it's cached after turn 1. The state-serialization user prompt varies per turn but the chain-context section structure is stable; only the values change. Per-officer expected cache hit rate: ~85-90% on system prompt (40w × 1 fixed system per officer per turn), ~0% on user prompt. With `temperature: 0` (already the default in api_commander.ts) and prompt caching enabled, repeated runs of the same scenario with the same persona flags should produce ≥95% identical decisions across runs — sufficient determinism for ad-hoc research, never claimed for canonical calibration.

## Q5 — Telemetry surface

**Mirror C2 pattern (`f24ad5d7`):** all Claude persona decisions emit to a gitignored side-channel `data/derived/_debug/d_lane_persona_decisions.jsonl`. Per-decision record:

```
{turn, faction, role: 'president'|'army_co'|'corps_co', officer_id, corps_id?,
 prompt_tokens, completion_tokens, latency_ms, model_used,
 decision_summary: <verb|stances-map|sector-stances-map>,
 full_reasoning: <briefing + strategic_reasoning>,
 cache_read_tokens?, cache_creation_tokens?,  // when prompt caching active
 chain_context_section_present: bool,         // bridge biting check
 deterministic_baseline_decision?: <what B1/A3/bot_corps_orders would have emitted>,
 divergence_from_baseline?: bool}
```

The deterministic-baseline-decision column is the design-gap discovery surface: when a persona-Claude decision differs from the deterministic baseline (e.g., Claude-Karadžić emits `HOLD_AT_ALL_COSTS` targeting Drina Corps when B1+B2 emits `BALANCE_FRONTS`), that's a directive-vocabulary signal feeding back into the DG-CLUSTER-1 expressivity discussion. Aggregate counters in weekly_report: `persona_calls_by_layer` (3 ints), `persona_divergence_count` (per layer), `persona_token_total` (input/output split). These give the post-run panel legibility identical to what C2 gave the chain-observability check.

## Q6 — Cost calibration table

Reference: API-Bridge smoke `bft5bixcj` measured 3 commanders × 40 turns = 120 calls @ $0.4992 ⇒ $0.00416 / call (Haiku 4.5, no cache). With prompt caching (~85% cache-hit on system prompt), expect roughly $0.0025 / call.

Per-layer × per-scenario projections (Haiku 4.5, caching ON, single run):

| Configuration | calls / 40w | cost / 40w | calls / 188w | cost / 188w |
|---|---|---|---|---|
| 3 presidents only | 120 | ~$0.30 | 564 | ~$1.40 |
| 3 army COs only (existing) | 120 | ~$0.30 | 564 | ~$1.40 |
| All corps COs (~15 corps total across 3 factions) | 600 | ~$1.50 | 2,820 | ~$7.05 |
| **Cheapest informative: presidents-only** | 120 | ~$0.30 | 564 | ~$1.40 |
| **Mid: presidents + army COs** | 240 | ~$0.60 | 1,128 | ~$2.80 |
| Full stack (all 3 layers, all factions, all corps) | 840 | ~$2.10 | 3,948 | ~$9.85 |

**Cheapest informative configurations to flag:** (i) presidents-only single-faction (RS only) ⇒ 40 calls / ~$0.10 / 40w — minimum viable test of whether Claude-Karadžić emits different verbs than B1+B2 deterministic; (ii) presidents-all-factions ⇒ 120 calls / ~$0.30 — full B1 substitution at lowest cost. These two should be the first smoke runs ordered after D1 ships. Original 188w projection ($14-19) reflected no-caching upper bound; with caching the realistic full-stack 188w cost is ~$10. Mix-and-match is cheaper still.

## Q7 — SHIP shape

**Recommendation: SPLIT into D1 + D2 + D3** mirroring B-lane discipline (B1 infra → B2 substrate → real-API smoke).

- **D1 — Persona-encoding infrastructure (LOW risk, byte-stable):** add `personas/*.json` files for the 9 named officers covered by B2 + A4; add `persona_loader.ts`; add `api_president.ts` (NEW); refactor `api_commander.ts` and `api_corps_commander.ts` to consume `loadPersona()` (one-import change each); add env-flag parser; ALL Claude paths gated behind opt-IN env flags. Mocked-SDK unit tests verify (i) flag-OFF default produces zero API calls; (ii) flag-ON for a single layer correctly substitutes the deterministic path; (iii) persona JSON loader fails-loud on missing officer_id. 40w byte-stable because all flags default off.
- **D2 — Run orchestration extension (LOW risk, calibration-neutral):** new `run_personas.ts` (or extend `run_three_commanders.ts`) supporting mix-and-match flags from Q3; output to `data/derived/runs/persona/<run_id>/`; emit telemetry per Q5; cost telemetry counters in weekly_report. No behavior change in default runs.
- **D3 — Real-API smoke calibration (USER-AUTHORIZED):** run the two cheapest-informative configurations from Q6 (presidents-only single-faction RS @ $0.10; presidents-all-factions @ $0.30) plus one full-stack 40w smoke (~$2). Compare against deterministic baseline; record divergence counts; feed into DG-CLUSTER-1 vocabulary-expansion follow-up.

D1 and D2 can land in the same commit if total touch surface stays under ~250 LOC (likely, given mostly new files + small refactors). D3 strictly user-authorized due to $-cost.

## Sensitive-history compliance

Tooling-only path (Ring 0): all changes live under `tools/claude_plays_vrs/`; no `src/sim/` edits, no §6 surface, no FORAWWV touch, no canon doc edits. Faction-symmetric mechanism: the persona system is parameterized by `officer_id` with no `if (faction === 'X')` branches; the env-flag parser treats RS / RBiH / HRHB symmetrically; `persona_loader.ts` is a pure file-loader. Faction-asymmetric data lives entirely in `personas/*.json` content (sourced from BB I/II + ICTY transcripts per the existing Q3 source hierarchy in B2's `_sources` arrays). Determinism flag (Q4) isolates Claude runs to a separate `runs/persona/` subdirectory with stamped metadata; canonical 40w hash chain `7a1fddce105993e7` is structurally untouchable. §6 review NOT REQUIRED for D1/D2 (tooling-only); D3's smoke results, if they reveal a Claude-Karadžić path that suppresses Krivaja-95 / Stupčanica-95 conditional triggers, would warrant a review pass at that point — flagged for the post-D3 panel, not for D1/D2 SHIP gates.

## Go/no-go recommendation

**GO.** Risk band: **LOW** (tooling-only, opt-in flags, byte-stable defaults). Phase 1 dispatch shape: **SPLIT D1 (persona infra) + D2 (run orchestration) + D3 (real-API smoke, user-authorized)**. Mini-panel NOT REQUIRED for D1/D2. §6 sensitive-history review NOT REQUIRED for D1/D2; flagged as conditional follow-up for D3 if smoke results show Claude-roleplay president paths that diverge structurally from canonical genocide-adjacent operation triggers.

D-lane is the cheapest path to address DG-CLUSTER-1 (47% of design gaps; "directive vocabulary too coarse") because it adds expressivity at the layer where verbs originate (president), without requiring any rewrite of the existing 6-verb ladder. The verb ladder remains the wire format; persona prose enriches the *justification* the downstream Claude-roleplay CO sees, which is the unbottlenecking move.

## Open questions for user

1. **Mid-run succession:** when A4 schedules a successor (Halilović → Delić w60; Petković → Praljak w64 → Roso), should the persona swap mid-run trigger automatically (load `personas/arbih_delic.json` from turn 60 onward), OR should the user pin the initial officer for the whole run? Recommendation: auto-swap (matches A4 historical schedule); flagging because this is a designerly call.
2. **Corps-CO authorship priority:** with ~15 corps total but only ~3 named officers with strong BB/ICTY voice profiles (Galić-SRK, Krstić-Drina post-1995, Mladić-as-MS), which subset should D1 author personas for first? Recommendation: VRS Drina (Krivaja relevance) + SRK (siege canon) + 1KK (Corridor); other corps fall back to `default_corps_co.json` archetype voice until authored. Flagging because alternate priorities (e.g., ARBiH 2nd Tuzla for Teočak relevance) may better serve calibration follow-up.
3. **Cost ceiling for D3 smoke run:** approve the proposed three-config D3 plan (~$2.40 total, all Haiku 4.5 with caching) or constrain to presidents-only first ($0.30) and gate D3.2 / D3.3 on D3.1 results?
