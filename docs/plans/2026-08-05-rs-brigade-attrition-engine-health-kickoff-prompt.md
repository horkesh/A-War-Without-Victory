# Kickoff prompt — RS brigade-attrition engine-health workstream

Copy the block below into a new session/agent to start this workstream.

---

You're starting a new engine-health investigation for AWWV (A War Without Victory), a deterministic strategic-level simulation of the 1992-1995 Bosnian War. Read `.claude/napkin.md`, `docs/PROJECT_LEDGER.md` (latest 80 lines), and `docs/life_lessons.md` per the standard session-startup protocol in `CLAUDE.md` before anything else.

## The problem, in one paragraph

At week 188 of the calibration baseline, every ARBiH brigade ever fielded across three major corps (103 brigades total: `arbih_1st_corps`, `arbih_2nd_corps`, `arbih_3rd_corps`) is still `status: active` — zero permanent losses across the entire war. RS corps over the same period show 11%-63% permanent brigade destruction (`vrs_drina` 11%, `vrs_east_bosnian` 20%, `vrs_1st_krajina` 61%, `vrs_herzegovina` 63%). This is not subtle — it's a near-total, faction-wide asymmetry, and it's the likely root cause behind why RS's late-war defensive sectors become pathologically oversized/thin, and why every narrow fix attempted so far to specific RS combat behavior cascades unpredictably through the rest of the 188-week campaign.

## Required reading before you do anything else

- **`docs/40_reports/audits/20260805_RS_BRIGADE_ATTRITION_ASYMMETRY_AUDIT.md`** — the full audit. Read this completely; it has every number, every file:line reference, every ruled-out hypothesis, and the exact reproduction commands. Do not re-derive what's already in there.
- `docs/plans/2026-07-31-historical-gameplay-depth-calibration-plan.md`, Task 0.3 section — the originating investigation (Zvornik/Doboj/Gračanica anchors). Five independently-designed fixes were built, tested, and reverted there, all failing via the same unpredictable-cascade pattern. Do not re-attempt any of them; they're documented in full technical detail specifically so nobody has to re-derive why they failed.
- Memory: `rs-brigade-destruction-asymmetry-engine-flaw` (project memory, if you have access to this project's memory system) — same findings, shorter form.
- `docs/40_reports/audits/20260504_FORCE_QUALITY_GAP_2_VERIFICATION.md` — the prior, opposite-direction bug (VRS personnel over-reinforcing, "+753 over 188w") that the current RS reinforcement-decay curve was built to fix. Useful context for why that curve exists and roughly how it was reasoned about at the time.
- `docs/40_reports/CALIBRATION_MASTER.md` — current calibration floor, so you know what you're not allowed to regress without a documented, deliberate decision.

## What's already been ruled out — do not re-test these as your starting hypothesis

1. **Dissolution-threshold data asymmetry.** `brigade_dissolution.ts`'s personnel/cohesion/morale thresholds are faction-symmetric in both code and live scenario data (checked directly — no `war_timeline.dissolution_*_threshold` override exists anywhere). Not the cause.
2. **Reinforcement-multiplier supply as the sole, isolated driver.** RS's reinforcement multiplier does crash to 0.45x for the last 85 weeks of the war while RBiH's sits flat at 1.0x for 136 weeks — real and confirmed. But a direct experiment (flattening RS's curve to 1.0x for the whole war) made destruction WORSE for the two hardest-hit corps (`vrs_1st_krajina` 61%→72%, `vrs_east_bosnian` 20%→50%), not better. This is not a simple "give RS more manpower" fix. The likely explanation — untested — is that reinforcement level feeds into AI operation-commitment decisions in a way that increases exposure rather than reducing losses; see open question #2 below.

## What's been found but not fully explained — these are your starting points

1. **A ~4x combat-exposure-volume asymmetry.** RS defends 416 times over the 188-week campaign vs RBiH's 112; RS attacks only 136 times vs RBiH's 367. RS is actually the *better* attacker (77.9% win rate vs RBiH's 68.1%) but absorbs over 5x RBiH's casualties on defense. This looks substantially intentional — `data/scenarios/timelines/apr1992.json`'s `doctrine_phases.aggression_modifier` deliberately ramps RBiH up to "Full counteroffensives" by week 80 while RS ramps down to "constrained" — matching the real war's 1994-95 turn. Open question: is the *magnitude* of this ratio (3.7x) historically defensible, or overtuned? This needs comparison against real operational-tempo sources (Balkan Battlegrounds, OOB masters — see the `scenario-creator-runner-tester` skill's required reading list), not just "the direction matches the narrative."
2. **The reinforcement-level-to-AI-behavior interaction.** Why did giving RS more replacement personnel make destruction worse? The corps-commander operation-launch scorer (`src/sim/combat/commander/`) is the most likely place this interaction lives — check whether brigade personnel/health level is a factor in which brigades get selected for risky operations, and whether "healthier" brigades get thrown into more fights rather than conserved.
3. **RBiH has no late-war exhaustion curve at all.** RS and HRHB both decline late-war (reinforcement multiplier); RBiH climbs to 1.0x at week 52 and never comes back down for the remaining 136 weeks. Is that a deliberate, defensible asymmetry (ARBiH professionalized and never regressed) or a gap?

## Guardrails (from `CLAUDE.md`, binding)

- **Determinism is sacred**: no `Math.random()`, no `Date.now()`, sorted iteration via `strictCompare`.
- **Never override initial OSIDs** and **never use `avoided_osids_by_faction`** (banned). Fix engine, OOB, operations, or scenario params instead.
- **One change per calibration run.** Every experiment in the source audit was tested, measured, and reverted individually. Do the same — this investigation has already shown that even small, well-reasoned changes cascade unpredictably over the campaign's remaining turns, so bundling changes will make attribution impossible.
- **40w GO + green CI is a false-green for combat-behavior changes.** Validate at 188w before drawing conclusions — the corridor/campaign-length effects this whole investigation is about only show up there.
- Given the calibration and canon stakes (any real fix here will move `matched_osids`/anchors/net-territory broadly, not narrowly), route findings and any proposed fix through the Pyrrhic-panel review discipline (`docs/20_engineering/CLAUDE_EXECUTION_STANDARD.md`, `.claude/AGENT_TEAM_ROSTER.md`) rather than shipping unilaterally. Given the cross-cutting nature (touches combat resolution, corps-commander AI, scenario doctrine data, and reinforcement/dissolution mechanics simultaneously), start with a `technical-architect`-led scoping pass before writing any fix code.

## Suggested first steps

1. Read everything in "Required reading" above.
2. Reproduce the baseline destruction-rate table and the exposure-volume table from the audit yourself (commands are in the audit's "Reproducibility" section) — confirm you're seeing the same numbers on current `HEAD` before building on them; the codebase moves fast and floor numbers go stale.
3. Pick ONE of the three open questions above and design a single, isolated, measurable experiment for it — matching the audit's own methodology (typecheck → unit tests → 40w sanity → 188w measurement → revert → document, whether the result confirms or disproves the hypothesis).
4. Report findings — including negative results — as honestly and completely as the source audit does. A disproven hypothesis with clear evidence is exactly as valuable as a confirmed one; it's what let this investigation avoid wasting a sixth attempt on Task 0.3's anchors before the real problem was even understood.

Do not attempt to "fix" the three R6 Task 0.3 anchors (Zvornik/Doboj/Gračanica) as part of this workstream. They are downstream of whatever's found here and are almost certainly unfixable in isolation while the deeper asymmetry stands, per the audit's own recommendation.
