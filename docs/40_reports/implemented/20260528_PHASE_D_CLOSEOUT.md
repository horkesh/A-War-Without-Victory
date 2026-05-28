# Phase D Closeout — Event-System Causal-Chain Authoring

## Status

- **Date:** 2026-05-28
- **Branch:** `codex/diagnostics-output-artifact-doc-closeout`
- **Packets shipped:** 39 (Packet 1 Foundational through Packet 39 H30)
- **Chain depths:** RS 13 / RBiH 15 / HRHB 13 downstream events per foundational option (cross-faction trios counted once)
- **Test infrastructure:** 10 event suites GREEN (247 passed / 5 pre-existing skipped); `npx tsc --noEmit` exit 0; baseline regression PASSING
- **Source proposal:** `docs/40_reports/proposals/20260527_EVENT_DATABASE_RUNTIME_SEMANTICS_PACKET.md` (v1.3)

This closeout consolidates the substantive Phase D event-system causal-chain authoring work shipped on `codex/diagnostics-output-artifact-doc-closeout` from the foundational decisions packet (Packet 1) through the HRHB pre-Washington federation overture (Packet 39). The closeout itself is documentation-only; no event JSON, runtime code, or scenario data is touched here.

## Scope completed

### Foundational events (Packets 1-4)

The three faction-level foundational decisions that anchor every downstream chain in Phase D, plus their first cross-foundational cascade:

- **R1** `rs_strategic_goals_1992` — three-option foundational (`all_six` / `selective` / `aggressive`) in `data/scenarios/events/war_1992.json`
- **B1** `rbih_state_identity_1992` — three-option foundational (`civic` / `bosniak_national` / `pragmatic`) in `data/scenarios/events/war_1992.json`
- **H1** `hrhb_political_goal_1992` — three-option foundational (`croat_republic` / `united_front` / `strategic_ambiguity`) in `data/scenarios/events/war_1992.json`
- **H1a** `hrhb_1992_graz_cooperation_collapse` — cross-foundational Karadzic-Boban Graz meeting + RBiH-HVO cooperation collapse (6 May 1992)

### Cross-faction diplomatic trios (6 major peace plans, COMPLETE coverage)

Every major diplomatic episode in the catalog now has a per-faction modal-ready decision row plus the composite trio framing:

- **X1** London Conference 1992 (Packet 6)
- **X2** Vance-Owen Plan 1993 (Packets 5/9 + 29 HRHB backfill)
- **X3** Owen-Stoltenberg 1993 (Packet 10 + 28 RS/HRHB backfill)
- **X4** Contact Group 51/49 1994 (Packet 25 trio)
- **X5** Washington Agreement 1994 (Packets 7/8 + 30 RS backfill)
- **X8** Dayton entry-conditions 1995 (Packet 15 trio)

### Late-war operational decision trio (Packets 14 + 24 + 36)

The August-September 1995 operational window now carries an authored modal-ready row per faction:

- **R13** `deliberate_force_rs_compliance_1995` — RS NATO ultimatum compliance, September 1995 (Packet 14)
- **H10** `hv_hvo_cooperation_1995` — HRHB HV cross-border coordination, August-September 1995 (Packet 24)
- **B27** `rbih_late_war_offensive_1995` — RBiH territorial-reintegration offensive, August-September 1995 (Packet 36)

All three carry `bot_response_logic: "historical"`, so the cross-faction operational symmetry is deterministic under headless mode.

### Other major event lanes authored

- **R7** Belgrade pressure on Pale 1993 (Packet 31)
- **R8** Belgrade embargo August 1994 (Packet 12)
- **R11** Karadzic-Mladic split August 1995 (Packet 20)
- **R12** RS hostage crisis May 1995 (Packet 19)
- **R12** RS negotiated-autonomy path 1993 (Packet 38)
- **R14** Holbrooke channel October 1995 (Packet 16)
- **B2 / B3 / B4** RBiH diplomatic responses (Vance-Owen + Owen-Stoltenberg + paramilitary policy)
- **B5** Srebrenica demilitarization April-May 1993 (Packet 17)
- **B6** Bihac 5th Corps offensive 1994 (Packet 21)
- **B8** Abdic / APWB rupture September 1993 (Packet 23)
- **B9** RBiH NATO ultimatum compliance February 1994 (Packet 18)
- **B10 / B13** Washington / Dayton acceptance
- **B11** RBiH Federation Army integration (Packet 26)
- **B12** RBiH minority retention (Packet 32)
- **B20** RBiH reintegration offers to Serb/Croat communities (Packet 37)
- **B23** RBiH arms embargo lift advocacy 1993-95 (Packet 34)
- **H2** Gornji Vakuf clashes January 1993
- **H3 / H4** HRHB Mostar pressure / Zagreb-ordered ceasefire
- **H6** HRHB Central Bosnia pocket April-October 1993 (Packet 33)
- **H9 / H12** Washington / Dayton acceptance
- **H11** HRHB Federation Army integration (Packet 27)
- **H30** HRHB pre-Washington federation overture (Packet 39)
- **H40** HRHB territorial-maximalist scope decision (Packet 35)

### Engine substrate (Phase B work, parallel to Phase D)

The runtime causality substrate authored in Phase B underpins every Phase D packet:

- Runtime causality fields: `requires_enabled`, `enables_events_runtime`, `closes_events_runtime`, `closed_event_ids`, `event_causality_log`
- Single-writer discipline via `recordEnabledEvents` / `recordClosedEvents` / `recordCausality`
- Save schema versioning extended v22 -> v33
- Twelve validation passes in `src/sim/events/event_loader.ts`, including rupture-foreclosure policy, forbidden-family exclusion, Ring 3 enabling rejection, and unreachable-gates checks
- Diagnostic probe fix (Packet 22) -- `requires_enabled` bypass for the presidential-acceptance test so the probe can reach gated rows without firing them

## Sensitive-history canon-gate enforcement (§3.6)

Every packet from Packet 14 onward contains explicit forward-looking guard language in the event `source_note` prohibiting consequence rows (`csq_*` descendants) from re-authoring atrocity, cleansing, forced-displacement, civilian-targeting, or paramilitary-deployment levers.

The sensitive event surfaces are canon-gated through `RING3_SENSITIVE_FAMILIES` in `src/sim/events/event_families.ts`. The exact-match list authored in Phase B is:

- `H5`
- `h5_croat_bosniak_war_atrocities`
- `h8_mostar_bridge`
- `hrhb_camp_exposure`
- `hrhb_detention_camp_exposure`
- `hrhb_mostar_bridge_destruction_1993`
- `rs_camp_exposure_response`
- `rs_drina_campaign`
- `rs_drina_campaign_tempo`
- `un_safe_area_enforcement`

Prefix matches via `isRing3SensitiveFamily` additionally cover `h5_*`, `hrhb_camp_exposure*`, `rs_camp_exposure*`, `rs_drina_campaign*`, `un_hostage_*`, and `un_safe_area_*`. The loader rejects any `enables_events_runtime` reference targeting a row whose family matches this set.

### Special-case packets with STRICT punitive cost floors

Packets whose response options touch (without authoring) sensitive territorial or humanitarian surfaces carry maximum punitive cost floors so counterfactuals never trivially dominate the historical default:

- Packet 17 — B5 Srebrenica demilitarization (Ring 1/2 with `FORECLOSURE_ALLOWLIST`)
- Packet 19 — R12 hostage crisis (§3.6 named-row carve-out for response-to-existing-state vs authorization-of-new-act)
- Packet 23 — B8 Abdic / APWB rupture
- Packet 32 — B12 minority retention (purge counterfactuals punitively cost-floored on `internal_cohesion`, `military_credibility`, `recruitment_modifier`)
- Packet 33 — H6 Central Bosnia pocket (Lasva Valley canon-gate)
- Packet 35 — H40 HRHB territorial-maximalist (`expansive_conquest` -40 `international_standing`; `maximalist_with_serb_alliance` -50 `international_standing`)
- Packet 36 — B27 RBiH late-war offensive (Op Sana western-Bosnia displacement canon-gate)
- Packet 38 — R12 RS negotiated-autonomy (Drina / Prijedor / Srebrenica / hostage canon-gate list)

## Calibration impact

All 39 packets pass `node node_modules/tsx/dist/cli.mjs tools/scenario_runner/run_baseline_regression.ts`. Empirical drift profile classifier across the three baseline scenarios (`apr1992_52w`, `mar1993_40w`, `dec1993_40w`):

| Drift level | Definition | Packets observed |
|---|---|---|
| METADATA-ONLY | Only `final_save.json` + `run_summary.json` (catalog count growth) | All outside-52w packets |
| METADATA+CATALOG-PASS-THROUGH | + `end_report.md` + `weekly_report.jsonl` on `apr1992_52w` (registry growth surfacing into catalog-listing channels) | All Phase D 14+ packets on `apr1992_52w` |
| DIMENSION | + `activity_summary.json` drift (dimension-state activity counter shift) | NONE observed; Packets 29 + 32 + 33 with within-52w firing produced no activity drift |
| BOT-MILITARY | + `formation_delta.json` + `control_delta.json` + `watched_operations.json` (military propagation) | NONE observed |

**Key finding:** Historical-default responses with positive dimension boosts (`internal_cohesion`, `international_standing`, `recruitment_modifier 1.05x`) did NOT propagate into bot military behavior, even when firing within the 52-week window. See `memory/recruitment_modifier_dead_channel.md` for the recruitment-pool propagation suspicion (Packet 32 finding).

## Engine vocabulary mappings established (Phase D side-effect)

Phase D authoring forced a convergence on canonical `DimensionId` substitutions (now captured in `memory/engine_dimension_vocabulary.md`). Worksheets typically use natural-language dimensions; engine accepts only registered DimensionIds. Substitution map:

- `national_identity` -> `internal_cohesion`
- `alliance_lock(<patron>)` -> `patron_confidence` (with sign flip per direction)
- `alliance_lock(<faction>)` -> `alliance_change` (with /10 scale-down because `alliance_change` is 0-1 not 0-100)
- `territorial_loss` -> `territorial_legitimacy`
- `recruitment_pool -N%` -> `recruitment_modifier (1-N/100)x/Nt`

Confirmed canonical DimensionIds in use across Packets 14-39: `internal_cohesion`, `military_credibility`, `patron_confidence`, `patron_pressure`, `negotiating_leverage`, `international_standing`, `morale_change`, `alliance_change`, `territorial_legitimacy`, `recruitment_modifier`, `equipment_quality_modifier`.

## Open follow-ups (non-blocking, deferred)

1. **`recruitment_modifier` dead channel** (Packet 32 finding) — investigation candidate for `/formation-expert` or `/gameplay-programmer`. Within-52w events with `recruitment_modifier 0.85x` to `1.15x` ranges produced no `formation_delta.json` drift; consumer wiring is unverified.
2. **Sensitive Ring-3 events DEFAULT BLOCKED pending §6 sign-off:** R3 systematic, R4 paramilitary, R5 Drina campaign, H7 detention-camp exposure, H13 third-entity negotiating, X3 counterfactual B, the B4 `accept_*` subset, X4 counterfactual A, X5 D/E, B7 Sarajevo siege (continuous-condition deferred).
3. **B7 Sarajevo siege** — modeled as a continuous condition, not a discrete decision. Revisit if Phase E continuous-event work begins.
4. **Worktree cleanup** — `F:/awwv-baseline-probe` locked Windows junction (harmless leftover).
5. **Authoring origin note** — this closeout was authored by a dispatched Documentation Specialist per the orchestrator dispatch rule, not directly by the orchestrator.

## Verification command

To re-verify Phase D state, run:

```
node node_modules/vitest/vitest.mjs run tests/event_loader.test.ts tests/event_loader_runtime_substrate.test.ts tests/event_decisions.test.ts tests/events_evaluate.test.ts tests/sim/events/event_acceptance_report.test.ts tests/sim/events/event_taxonomy_report.test.ts tests/sim/events/event_presidential_acceptance.test.ts tests/event_families.test.ts tests/events_evaluate_b3.test.ts tests/event_state_shape_b2.test.ts --reporter=dot
```

Expected: 10 suites GREEN (247 passed / 5 skipped). Plus `npx tsc --noEmit` clean. Plus `node node_modules/tsx/dist/cli.mjs tools/scenario_runner/run_baseline_regression.ts` PASS.

## Hard constraints honored throughout

- Determinism preserved — no `Math.random()`, no `Date.now()`, no timestamps; stable sort on all event arrays via `strictCompare`
- `bot_response_logic: "historical"` on every authored event (napkin canonical lesson)
- `docs/10_canon/FORAWWV.md` never auto-edited
- `.claude/scheduled_tasks.lock` never staged
- Locked worktree never entered
- No initial OSID overrides
- No `avoided_osids_by_faction` usage
- Single-writer discipline on causality logs preserved through every packet

## Authoring lineage and source provenance

- Original scope frame: `docs/40_reports/proposals/20260527_EVENT_DATABASE_ALTERNATE_TIMELINES_SCOPE.md`
- Phase D execution proposal: `docs/40_reports/proposals/20260527_EVENT_DATABASE_RUNTIME_SEMANTICS_PACKET.md` (v1.3)
- Per-packet ledger entries: `docs/PROJECT_LEDGER.md` (Packet 1 through Packet 39 + interleaved baseline-refresh entries)
- Engine vocabulary memory: `memory/engine_dimension_vocabulary.md`
- Dead-channel memory: `memory/recruitment_modifier_dead_channel.md`
- Source standard: every authored row carries `source_tier in {icty_icj_un, agreement_text, balkan_battlegrounds, corroborated_participant, design_counterfactual}` per Phase B loader-enforced source-tier vocabulary

## §6 sensitive-history sign-off + Phase E foundation (Packets 40-44 + MVS)

After Packet 39 landed, three additional Phase D packets (40-42) cleared the §6 Sensitive-History Design Gate for Ring 1/2 sensitive-adjacent authoring, followed by dead-channel remediation (Packets 43-44) and the Phase E Minimum Viable Slice (political-dimension propagation gate, feature-flag gated). All work below was shipped on the same `codex/diagnostics-output-artifact-doc-closeout` branch following the original closeout above.

### §6 sign-off process

Each of Packets 40-42 was routed through a 4-specialist panel before authoring landed:

- **Historian** — ICTY/ICJ/UN source-tier evidence and corroborated-participant grounding (Tadić, Kvočka, Stakić, Brđanin verdicts for camp exposure; ICJ Bosnia v. Serbia 2007 for §6.2 framing).
- **Game Designer** — Ring 3 boundary verification per `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md`; cost-floor magnitudes per Rulebook §3.6.
- **Canon Compliance Reviewer** — `§3.6 STRICT` guard, `RING3_SENSITIVE_FAMILIES` exact-match verification, `validateRing3EnablingRejection` loader pass.
- **Narrative Designer** — §4 prosecutorial wording; no reward language; consequence framing only.

All three packets returned **APPROVED_WITH_REVISIONS** (revisions integrated before merge). User non-delegable on each panel because every packet touched a "reward for atrocity" risk surface.

### Packets shipped (40-44 + MVS)

- **Packet 40 — R4 extension (concentration_camps_revealed_1992)**: New `concentration_camps_revealed_1992` event firing on Trnopolje / Omarska / Keraterm exposure (August 1992 ICRC + Roy Gutman + Penny Marshall reporting). `historical_default: "deny"` is the canonical RS response; counterfactual `acknowledge` and `cooperate_investigation` options carry maximum punitive cost floors per §3.6 STRICT guard. Source row carries ICTY citations (Tadić IT-94-1, Kvočka IT-98-30/1, Stakić IT-97-24). Three-option pattern, RS-faction only.

- **Packet 41 — B5 enclave_resilience correction**: Documentary fix retiring the non-registered `enclave_resilience` dimension that had been authored on the B5 Srebrenica demilitarization row. Engine surrogate via `military_credibility -15` on the relevant counterfactual response captures the mechanical truth (RBiH credibility damage from accepting demilitarization framework) without inventing a new dimension. Loader vocabulary pass (Packet 44) now catches this class of error.

- **Packet 42 — H6 new authoring (hrhb_camp_exposure_response_1993)**: New `hrhb_camp_exposure_response_1993` event firing on Heliodrom / Dretelj / Gabela / Vojno exposure (mid-1993 ICRC investigations). Ring 3 family (`hrhb_camp_exposure`) with EMERGENT trigger via H1 foundational option-resolved conditions, NOT runtime-enabled by H1 (per canon §3.6: Ring 3 families are gate-protected from `enables_events_runtime`). Three-option pattern, HRHB-faction only. ICTY citations Prlić IT-04-74, Naletilić IT-98-34.

- **Packet 43 — Dead-channel remediation (audit + rewrite)**: Probe-driven audit scanned all 1027 occurrences of `dimension_shifts` / `effects` patterns across `data/scenarios/events/*.json`. Found **11 DEAD writes** all in the inverse-channel pattern (worksheet-named DimensionIds placed under `effects[].kind` instead of `dimension_shifts[].dimension`, or EffectKinds placed under `dimension_shifts[].dimension`). Remediation: 10 entries re-authored to the correct channel; 1 `enclave_resilience` removed entirely (no consumer); 1 duplicate consolidated. Affected packets: Packet 4 (H1a), Packet 9 (X2 RBiH), Packet 17 (B5), Packet 19 (R12), Packet 23 (B8), Packet 38 (R12 RS autonomy — `patron_pressure` axis was fully dead pre-Packet-43).

- **Packet 44 — Loader vocabulary validation**: Two new validation passes in `src/sim/events/event_loader.ts`:
  - `validateDimensionShiftVocabulary` at `event_loader.ts:939` — fails catalog load if any `dimension_shifts[].dimension` is not in the typed `DimensionId` union (6 names only).
  - `validateEffectKindVocabulary` at `event_loader.ts:1003` — fails catalog load if any `effects[].kind` is not in `EFFECT_KIND_ORDER`.
  - +8 tests in `tests/event_loader.test.ts` covering positive paths, negative paths (each disjoint vocabulary), and mixed-channel detection.

- **Phase E MVS — political_dimension_propagation_gate**: New module at `src/sim/events/political_dimension_propagation_gate.ts` with a 2-tier env flag (`AWWV_POLITICAL_DIMENSION_PROPAGATION_GATE` enables the module; per-axis sub-flags select which dimensions wire through). Single live wiring: `international_standing` → corps operation hesitation penalty in `sector_offensive.ts` (via `briefing.ts` extension that surfaces faction `international_standing` to per-corps briefing). With the flag OFF (default), baseline regression PASSES byte-identical across `apr1992_52w`, `mar1993_40w`, `dec1993_40w`; with the flag ON, an opt-in calibration validation pass becomes the next planned verification step.

### Engine canon-enforcement (compile-time + runtime guards)

- **`CAMP_EXPOSURE_OPTION_IDS` freeze** — Module-level frozen set in `event_loader.ts` enumerating the canonical option IDs for Packets 40 + 42 camp-exposure events. Loader rejects any catalog row that adds, removes, or renames option IDs in these specific events; option text/effects may change but the option-ID set is canon-bound at engine level.
- **`RING3_SENSITIVE_FAMILIES` updated** — Now exact-matches `hrhb_camp_exposure_response_1993` and prefix-matches `hrhb_camp_exposure*` / `rs_camp_exposure*` per the existing pattern. `concentration_camps_revealed_1992` is intentionally NOT a Ring 3 family because it models the exposure event (a media + diplomatic event), not the camp authorization itself.
- **`validateRing3EnablingRejection` extended** — Loader pass now also rejects any catalog row that attempts to runtime-enable a Ring 3 sensitive family from a non-foundational event (Packet 42 H6 satisfies this via EMERGENT condition trigger, not `enables_events_runtime`).

### Phase D bot-military isolation property — HOLDS

The Phase D structural isolation property (political dimensions write to FactionCapital.strategic_dimensions; bot combat loops have ZERO DimensionId reads) was confirmed re-tested through:

- All five within-52w-firing sensitive-event firings (Packets 40 / 41 / 42 / 43 remediation set / Packet 38 post-remediation).
- Packet 44 loader validation pass (no catalog load failures means no dead writes hide as silent no-ops).
- Phase E MVS feature-flag baseline regression (flag-off byte identity proves no incidental wiring leaked in).

### Updated open follow-ups (replacing entries 1-5 from the original closeout)

1. **`recruitment_modifier` dead-channel suspicion — CORRECTED.** Re-investigation in Packet 43 audit found the channel IS live (`applyRecruitmentModifier` → `state.military.recruitment_modifiers[]` → `getActiveRecruitmentMultiplier` → `ongoing_mobilization.ts`); the Packet 32 finding's "no formation_delta drift" was an artifact of small-multiplier rounding on small mid-1992 ARBiH recruitment pools (×1.05 multiplier on small pools rounds to zero deterministically). See `memory/engine_dimension_vocabulary.md` for the canonical channel map and `memory/recruitment_modifier_dead_channel.md` (now annotated CORRECTED).
2. **`enclave_resilience` — confirmed not a registered name.** Packet 41 retired this from B5 in favor of `military_credibility -15`. Loader validation (Packet 44) now catches any future reintroduction.
3. **B7 Sarajevo siege** — still modeled as continuous condition (deferred per original closeout).
4. **Sensitive Ring-3 events DEFAULT BLOCKED** — list unchanged; §6 sign-off precedent established for Ring 1/2 sensitive-adjacent surfaces only.
5. **Phase E activation gates** — `AWWV_POLITICAL_DIMENSION_PROPAGATION_GATE` MVS is ready for the next calibration validation pass; per-axis sub-flags allow incremental wiring.
6. **Worktree cleanup** — `F:/awwv-baseline-probe` locked Windows junction (unchanged).

### Cross-references

- Engine vocabulary canonical map: `memory/engine_dimension_vocabulary.md` (updated 2026-05-28 with disjoint-channel substitution table).
- §6 sign-off precedent (thematic): `docs/PROJECT_LEDGER_KNOWLEDGE.md` 2026-05-28 entry.
- Lesson on dual-write channels: `docs/life_lessons/events.md` 2026-05-28 entry.
