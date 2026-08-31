# Authored Operation / Probe Ownership Design

**Goal:** Keep disposable reconnaissance operations from consuming formations already named for queued historical operations, and make a probe end after its first resolved contact.

## Evidence and invariant

The bounded Foča run exposed two reproducible ownership failures. `arbih_102nd_motorized` was destroyed while serving `probe_arbih_1st_corps_t5`, so Operation Circle injected without its Trnovo axis. `rs_4th_sarajevo_light_infantry` was still committed to `probe_vrs_sarajevo_romanija_t23` when Operation Kijevo injected, so the authored Prača axis was omitted. The existing queue already declares those formations as historical-operation participants, and other generic-routing systems already treat queued participants as reserved.

The probe lifecycle also contains a split contract: a legacy flat probe enters recovery after one recorded attempt, while the normal factory-built multi-axis probe can attack repeatedly. A probe fully reveals its sector intelligence after a resolved battle, so further attacks no longer serve reconnaissance.

## Considered approaches

1. **Let the authored operation reclaim a live probe at injection.** This repairs the Kijevo collision but cannot recover a formation already destroyed by an earlier probe. It also leaves ownership ambiguous until the last moment.
2. **Reserve queued historical participants from generic probes, and close every probe after its first resolved contact.** This prevents both observed failure shapes, uses the queue as the existing source of ownership truth, and makes the multi-axis lifecycle match the legacy probe contract.
3. **Increase force strength or retune Goražde/Foča objectives.** This could repaint symptoms while leaving the operation-ownership defect active and would calibrate against false engine behavior.

## Decision

Use approach 2, with the reservation narrowed to each corps' **head queued operation**. Probe selection will exclude identities returned by `getHeadQueuedPrePlannedBrigadeIds`; later queued operations do not freeze their brigades months before they can inject. After the first resolved objective battle, a multi-axis probe will enter recovery with `probe_complete`, whether the result was success or failure. No control rule, combat odds, casualty formula, initial control, painted reference, enclave rule, or operation roster changes in this engine correction.

## Verification

- A commander-emission regression test must show that a queued Operation Kijevo participant cannot be selected for a probe.
- A lifecycle regression test must show that a factory-shaped multi-axis probe enters recovery after one failed resolved contact.
- Focused suites and typecheck must pass.
- A Node 22 bounded 40-week replay must confirm that Operation Circle retains the Trnovo participants and Operation Kijevo retains the Prača participant. Territorial checkpoint movement is report-only if operation-schedule divergence exceeds the calibration threshold.
- Only after engine verification may the Foča objective order be changed, one authored change at a time, if Kolovarice remains unattempted.

## Falsified Circle budget experiment

A bounded one-change follow-up raised Operation Circle's marching budget from four to six turns so its four/five-hop Trnovo formations could be admitted. It restored only `arbih_109th_mountain`; `arbih_102nd_motorized` still lacked a friendly route. More importantly, the added live axis made the operation fail with zero captures and 652 attackers killed, versus two captures and 325 killed under the engine-only correction. January fell 699 to 696. The experiment is rejected and the four-turn catalog value is retained.

## Falsified Foča sequencing experiment

A second one-change follow-up moved Kolovarice ahead of Ustikolina on `foca_valley`. It did not capture Kolovarice and instead prevented the required ordinary-combat takeover of Ustikolina. January remained 699 only because downstream schedule movement let Operation Circle capture Donje Žešće. That is an exchange of one regional error for another, not a Kolovarice fix. The original objective order is retained.

## Final bounded evidence

The final Node 22.23.2 replay is
`F:\A-War-Without-Victory\runs\codex_gorazde_engine_fix\apr1992_definitive_188w__7c3a0f299a8c80e9__w40_n3`
(40-week development override, dirty provenance, final hash `0030aaf43578c06f`). January measures
699/712, up from 694 in the preceding Foča candidate. Operation Circle captures
`op:gorazde:glamoc` and `op:gorazde:sopotnica`; Operation Kijevo retains
`rs_4th_sarajevo_light_infantry` and captures both Kijevo and `op:pale:praca`. Operation Foca
still makes 14 attacks and earns all five former start overrides through ordinary combat.

Rung-4 corps-plus-objectives schedule divergence against the prior candidate is 4/25 (16.0%),
below the Calibration Master's 20% attribution ceiling. Engine-health fields applicable at this
bounded horizon are green: zero zero-eligible operations, zero invalid-operation weeks, zero ghost
destructions, 15 stranded brigades, zero consistency failures, and K:W 3.864. The health tool's
nonzero exit is expected because a 40-week artifact cannot contain later 188-week checkpoints or a
terminal floor. This candidate neither supersedes clean 188-week baseline `n388` nor authorizes a
manifest or floor change.

An identical second replay at
`F:\A-War-Without-Victory\runs\codex_gorazde_engine_fix\apr1992_definitive_188w__7c3a0f299a8c80e9__w40_n4`
reproduced final hash `0030aaf43578c06f`, confirming deterministic bounded output.

The AAR now classifies a successful one-contact probe as a `probe_complete` planning exit. That
raises the advisory count of probes recorded as planning deaths (72/74 in this bounded run), but it
does not mean those probes died without contact: the lifecycle regression explicitly requires one
resolved attempt before recovery. A future health-schema change should distinguish completed
reconnaissance from pre-contact planning failure.

## Verification record

The seven focused suites pass 194/194, repository typecheck passes, the tactical-map production
build passes through the available root Vite runtime, `git diff --check` passes, and the EOL policy
check passes. The unsharded full Vitest command was stopped after one CPU-active integration worker
produced no result for 30 minutes; it emitted no assertion failure before interruption and is not
reported as a pass. `canon:check` was also stopped when its wrapper unexpectedly began a baseline
regression reaching turn 108; that incomplete run is not evidence and was not allowed to finish.
