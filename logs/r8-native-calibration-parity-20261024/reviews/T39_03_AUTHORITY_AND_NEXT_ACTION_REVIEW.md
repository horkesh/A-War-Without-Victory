# Turn-39 divergence: authority and next-action review

Date: 2026-10-24

Verdict: **no routine bug fix is authorized or warranted from the 700/712 result.** The earliest state difference and the first controller divergence both arise from intentional, source-owned player-versus-bot boundaries. Changing them would alter event timing, sensitive-history canon, player agency, or the accepted calibration baseline. The owner must choose the product contract before implementation or another campaign.

## Why this is not a small parity bug

The player path is behaving exactly as authored:

- `data/scenarios/events/war_1992.json:2141-2145` requires an RBiH player response and sets the Historical default to `always_deny`, with cited chain-of-command evidence.
- `data/scenarios/events/war_1992.json:2153-2161` labels that response “Refuse paramilitary deployment” and persists `rbih_paramilitary_policy=always_deny`.
- `data/scenarios/events/war_1992.json:2344-2345` declares this a canon-bound sensitive-history surface, states that RBiH Historical defaults to denial, and says the bounded option set may not be expanded.
- `src/sim/combat/paramilitary_sweep.ts:407-410`, `:512-545`, and `:801-830` explicitly split player and bot behavior. A player faction respects `always_deny`; bot factions auto-approve qualifying deployments.
- The New War copy says “Other commands follow the historical response path” (`src/ui/map/i18n/messages.en.ts:1846-1847`). It does not promise to surrender the selected player command to bot decisions.

The accepted n94 run has no selected player and uses headless auto-control. The normal packaged run has `playerFaction=RBiH`, `headless=false`, and a visible authored Historical denial receipt. Those are legitimate, material inputs. Equal startup control does not make the subsequent policies equal.

The frozen causal audit also identifies an earlier non-controller difference: the packaged opening flow applies `rbih_state_identity/civic` visibly at turn 0, while n94 bot-applies the same response at turn 3 under its authored trigger. The first controller difference follows at turn 1, when the headless bot auto-spawns two RBiH paramilitary captures while the player route suppresses generation pending the policy decision and then applies the Historical denial. Later Historical response IDs match, but timing and state no longer do.

The turn-39 evidence is also too broad for a seven-cell patch. Only Bukvik Gornji 2 and Obadi directly retain the accepted run's turn-1 paramilitary captures. By turn 39 the histories contain 49 accepted-only and 42 native-only exact control events across combat and paramilitary mechanisms. The five other endpoint differences occur later on the diverged state. No evidence proves that a single defect independently caused all seven, and no direct controller write, forced flip, special-case permission, RNG alignment, or tuning is permissible.

The operation/autonomy boundary does not supply a routine fix. At shipped autonomy 2, player-assisted brigade execution is intentionally active (`war_phases.ts:947-957`, `:2701-2721`). Engine Invariants §14.10b records distinct player authorization and headless sweep behavior, and explicitly preserves measured player endpoint divergence without claiming convergence (`Engine_Invariants_v0_9_0.md:459-467`). The clean engine, input, archive, seal, and save/load gates further argue against a transport or execution defect.

## Authority boundary

The user's broad authorization covers investigation and fixes within the agreed contract. It does not resolve a direct conflict between these authoritative product choices:

1. Preserve the Historical player's canon-bound denial and player agency.
2. Preserve n94 as the accepted no-player headless calibration result.
3. Require a normal Historical player campaign to reproduce n94's exact checkpoint controllers and scores.

All three cannot currently hold together. A code change that makes the player auto-approve would contradict the Historical response and sensitive-history text. A change that makes bots deny would change the accepted calibration trajectory and require a new baseline. A packaged observer/no-player mode would be a new product surface and would not prove ordinary player-campaign parity. Retiring exact player-to-n94 convergence or accepting a distinct player baseline changes acceptance. Each is an owner/product/canon decision, not a routine implementation choice.

## Smallest next action

Stop campaigns and make one explicit owner disposition, using the retained qualified run:

- **Recommended:** preserve current player and bot mechanics, record that n94 is the no-player calibration baseline, and retire exact n94 checkpoint equality as a requirement for normal player campaigns. Define any separate normal-player historical acceptance deliberately, with 700/712 as measured evidence rather than an automatically adopted floor.
- If the owner instead requires one shared historical policy, convene the required sensitive-history/canon decision and choose which behavior changes. The technically coherent candidate is to make headless bot policy respect faction-specific Historical defaults, then recalibrate and re-adopt a new baseline. This does not preserve the current n94 results.
- If the owner requires a visible packaged reproduction of n94 itself, scope an explicit observer/no-player product mode. Do not present it as ordinary New War player behavior.

No further native run can answer this contract conflict. A repeated turn-39 run would only remeasure the same deterministic input difference; a turn-188 run is barred by the failed checkpoint stopping rule.

The source-backed causal record is `tmp/r8-native-calibration-parity-20261024/NATIVE_PLAYER_VS_N94_CAUSAL_AUDIT.md` (SHA-256 `f52552d3fcd572ec510874177c2a328b9f6753a702feb9840c879bc4ac737c47`).

