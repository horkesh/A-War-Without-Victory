# v0.9.2 Feedback Form Schema

Use this as a Google Forms, Tally, Airtable, or GitHub Discussions template. Keep the form short enough that a tired tester will finish it immediately after a run.

## Required Fields

| # | Question | Type |
|---:|---|---|
| 1 | How would you describe yourself? | Multiple choice: strategy/wargame player; historian/researcher; programmer/sim enthusiast; BiH/Balkan-history reader; other |
| 2 | Which build did you play? | Short text |
| 3 | Which scenario did you play? | Multiple choice: 40-week default; 188-week full campaign; probe scenario; other |
| 4 | How long did the session take? | Multiple choice: under 30 min; 30-60 min; 1-2h; 2h+ |
| 5 | Did the game run to completion? | Multiple choice: yes; no-crash; no-stuck; no-other |
| 6 | What was the clearest part of the experience? | Long text |
| 7 | What was the most confusing part? | Long text |
| 8 | What was the most surprising event or outcome? | Long text |
| 9 | What felt implausible, ahistorical, or unfair? | Long text |
| 10 | How did the AI commanders behave? | Long text |
| 11 | Name any territorial anchor or place outcome that felt wrong. | Long text |
| 12 | Did you encounter crashes, freezes, save/load problems, or visual bugs? | Long text |
| 13 | Would you play again? | Multiple choice: yes; maybe; no |
| 14 | Would you recommend it to another strategy player or historian? | Multiple choice: yes; maybe; no |
| 15 | What should be added, removed, or explained better before v1.0? | Long text |

## Optional Specialist Fields

Use these only when recruiting historians, researchers, or deterministic-sim testers.

| Question | Type |
|---|---|
| Did any historical description, label, or attribution feel wrong? | Long text |
| Did any sensitive-history representation feel exploitative, evasive, or too abstract? | Long text |
| Did the result feel reproducible and inspectable enough? | Long text |
| If you filed a bug, paste the GitHub issue or discussion link. | Short text |

## Response Routing

Use this triage labeling after responses arrive:

| Label | Meaning | Owner |
|---|---|---|
| `bug-crash` | crash, freeze, save/load failure | engineering |
| `bug-ui` | visibility, clickability, layout, text, tutorial confusion | UI/UX |
| `calibration` | territory, casualty, operation, or AI result feels wrong | scenario/calibration |
| `history` | source, historical claim, OOB, ethics, sensitive-history feedback | historian/canon |
| `onboarding` | first-session confusion, tutorial gap, missing explanation | product/tutorial |
| `praise-signal` | what worked and should not be broken | product |

## Weekly Digest Shape

Publish one anonymized digest each week while the playtest window is open:

```text
Week [N] playtest digest

Runs received: [count]
Builds tested: [versions]
Top 3 bugs:
1. ...
2. ...
3. ...

Top 3 confusion points:
1. ...
2. ...
3. ...

Calibration/history flags:
1. ...
2. ...
3. ...

Already fixed:
- ...

Next build focus:
- ...
```
