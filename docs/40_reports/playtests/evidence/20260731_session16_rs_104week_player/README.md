# Session 16 Evidence Manifest — RS 104-Week Player Run

## Scope

This packet preserves the selected visual and machine evidence for the 2026-07-31 RS owner-play proxy run from 6 April 1992 through turn 104 / 4 April 1994.

The canonical endpoint run reached exactly turn 104 in the production Electron entry. It did not receive a clean QA result because the final readability gate reported six peace-modal header occlusions. Two stock-harness traces were retained as supplemental defect reproductions:

- a deep-tour trace stopped at turn 20 when Army HQ failed to hand off to the Decision Room;
- a historically faithful trace stopped at turn 70 after RS acceptance of Owen–Stoltenberg immediately produced a negotiated-peace verdict.

To exercise the requested weeks 71–104, the endpoint trace used a temporary QA-only `--continue-to-target` switch that rejected the global Owen–Stoltenberg modal for RS. The separate authored RS event later recorded the historical `accept_union_three_republics` response at turn 75. The QA switch was removed after the run, and the repository harness was restored to its pre-run SHA-256.

No save was manually edited. No installer was packaged. No commit, push, branch, baseline, or release-state action was performed.

## Provenance

| Field | Value |
| --- | --- |
| Branch / HEAD | `main` / `b8ff530de08fa23cf38103d8da9557da56296130` |
| Working-tree content SHA-256 | `b4c1b23a1c55525d93d7259c8fe9ff10341b0239ac27816a31a070846b2a443c` |
| Package version | `0.9.9-beta.1` |
| Scenario | `apr1992_definitive_52w`, fresh campaign, seed `harness-seed` |
| Endpoint command | `node tools/ui/paradox_local_qa.cjs --faction=RS --turns=104 --label=20260731-session16c-rs-104w-player-final --strategic --live-events --skip-initial-tour --light-checkpoint-tour --continue-to-target` |
| Endpoint runtime | Approximately 40 minutes 12 seconds |
| Endpoint harness snapshot | `aeca7a74c95b92d37761cf577df98e62d0830ea2086b3b67cad1b659ea273a5c` |
| Restored stock harness | `37a2216e05bdf2a68962063ee86dd4429379d474a76be7b94fd6e0574853167d` |
| Repository autosave after run | Restored SHA-256 `df5fcc3d43d86dc231a55659c98a5628774634a33759586dcdf95f5cf3cf1084` |

## Save and Run-Data Hashes

| File | SHA-256 |
| --- | --- |
| `autosaves/initial-autosave.json` | `217e452cf7c62dfe691a4ab69baf7dd0f7e733742c90c9292c64eed2eb1933c6` |
| `autosaves/final-autosave.json` | `aaebe5bd01d9ac78ffb264b74f3827ba34307c4f5ad312b4e735aa65fdca7062` |
| `autosaves/historical-acceptance-turn70-autosave.json` | `63a3b17d796541ecf994b0eef12ef807bfc39715a70106a7e2bf8eab9e572be6` |
| `run-data/paradox-local-qa-progress-20260731-session16c-rs-104w-player-final.json` | `339309b08640d760bb6a7a9e9667cd3943d6ef22bf5892e403f13bc57f0a4fd4` |
| `run-data/paradox-local-qa-live-events-20260731-session16c-rs-104w-player-final.json` | `e8b0f303a1d76216bf8b84fe6bcedc0e83ab1e80e7bf06d13a4b50a0cb50d725` |
| `run-data/paradox-local-qa-netlog-20260731-session16c-rs-104w-player-final.json` | `da7d8e8e810b02cbca4a7917d8ca275c2552a483f22c2f4a7453fb016561de86` |

The packet contains 49 files totaling approximately 197.49 MiB: 31 endpoint screenshots, five supplemental screenshots, three autosaves, five run-data files, four diagnostic files, and this manifest.

## Endpoint Proof

- Exact final state: turn 104, phase `war`, faction `RS`, autonomy level 1.
- Final blockers: zero in every category.
- Final projected-state SHA-256: `fd480b60459e672504526144a770e927399e44933bb0506bf503619496c04b82`.
- Final autosave SHA-256: `aaebe5bd01d9ac78ffb264b74f3827ba34307c4f5ad312b4e735aa65fdca7062`.
- Formation audit: 279 total formations, 242 active combat formations, and zero unlocated active combat formations.
- Active combat formations by faction: HRHB 39, RBiH 125, RS 78.
- Control counts changed from HRHB 104 / RBiH 319 / RS 289 to HRHB 77 / RBiH 268 / RS 367.
- RS casualty ledger: 8,403 killed; 39,454 wounded; 8,265 missing or captured; 205 artillery and 94 tanks lost.
- Browser diagnostics: zero console messages, zero page errors, and zero network failures.
- Main-process stderr: two identical unresolved-assignment warnings for `rs_ajnie_brigade`; the final formation audit found no unlocated active combat formation, so this is preserved as a diagnostic anomaly rather than a confirmed player-facing bug.

## Screenshot Index

### Campaign and map

- `screenshots/...007-initial-map-probe-overview.png` — opening full-map information probe.
- `screenshots/...066-light-turn-1-map.png` — early campaign map.
- `screenshots/...167-light-turn-20-map.png` — late-August 1992 checkpoint.
- `screenshots/...213-light-turn-40-map.png` — January 1993 checkpoint.
- `screenshots/...364-light-turn-104-map.png` — 4 April 1994 endpoint map.
- `screenshots/...370-playthrough-final.png` — exact turn-104 final proof.

### Decisions and presidential surfaces

- `screenshots/...027-strategic-proposal-dossier-open.png` — opening historical-operation dossier.
- `screenshots/...055-peace-plan-before-response.png` — Cutileiro modal.
- `screenshots/...058-reserve-request-modal.png` — elite-reserve authorization.
- `screenshots/...157-officer-event-before-acknowledge.png` — Galić personnel matter.
- `screenshots/...205-peace-plan-before-response.png` — Vance–Owen modal.
- `screenshots/...210-strategic-proposal-dossier-open.png` — Operation Cerska–Kamenica, the session's best moment.
- `screenshots/...287-peace-plan-before-response.png` — Owen–Stoltenberg modal with missing title/header presentation.
- `screenshots/...297-strategic-pending-event-before-response.png` — authored RS Owen–Stoltenberg posture.
- `screenshots/...301-strategic-pending-event-before-response.png` — Belgrade-pressure response.
- `screenshots/...326-strategic-pending-event-before-response.png` — RS autonomy path.
- `screenshots/...333-strategic-pending-event-before-response.png` — strategic posture review.
- `screenshots/...347-strategic-pending-event-before-response.png` — Washington/Federation response.
- `screenshots/...354-strategic-proposal-dossier-open.png` — Operation Zvezda 94.

### Presentation checkpoints

- `screenshots/...067`, `...168`, `...214`, and `...365-light-*-command-surface.png`.
- `screenshots/...068`, `...169`, `...215`, and `...366-light-*-decision-room.png`.
- `screenshots/...069`, `...170`, `...216`, and `...367-light-*-army-hq.png`.

### Supplemental defect proof

- `supplemental-army-hq/...488-turn-20-decision-room.png`, `...497-army-hq-open.png`, and `...510-army-hq-corps-6.png` accompany the exact `army hq handoff did not open Decision Room` stack trace.
- `supplemental-peace-termination/...287-peace-plan-before-response.png` and `...288-peace-plan-after-response.png` show the historical RS Owen–Stoltenberg acceptance and immediate negotiated-peace verdict.

## Diagnostic Classification

### Confirmed bugs

1. Historical RS acceptance of the global Owen–Stoltenberg proposal ends the campaign at turn 70 as a negotiated peace, although the presentation does not disclose the other factions' positions and the historical RBiH rejection should prevent an all-party settlement.
2. The Army HQ → Decision Room handoff failed during the stock deep-tour checkpoint at turn 20.
3. Peace-modal title/header layering fails the DOM readability contract; the Owen–Stoltenberg screenshot also visibly loses the title/header.
4. Army HQ renders `Operation Operation Cerska-Kamenica concluded`, a minor duplicate-label presentation defect.

### Diagnostic anomaly, not yet a confirmed bug

- The duplicated `rs_ajnie_brigade` unresolved-assignment stderr warning did not survive into the final formation-integrity audit.

### Friction, not bugs

- The map supplies abundant detail but does not connect named Desk dossiers to their exact objectives or fronts.
- Late-campaign urgency is saturated and internally inconsistent: the global Desk reports no required signatures while the Decision Room presents 18 items, 13 urgent.
- The largest consequential decision gap was 13 weeks, and Command Authority sat at its cap for 87 of 105 observed turn states, leaving much of the campaign as notice acknowledgement plus Advance.
