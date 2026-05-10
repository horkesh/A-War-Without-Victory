# v0.9.2 Playtest Triage Board

Use this board shape in GitHub Projects, Linear, Notion, Trello, or a spreadsheet.

## Columns

| Column | Meaning | Exit Rule |
|---|---|---|
| Intake | Raw form responses, Discord notes, issues, and emails. | Response is deduplicated, labeled, and linked to source. |
| Needs reproduction | A concrete bug or odd outcome needs save/log/build confirmation. | Repro steps, save, screenshot, or "cannot reproduce" note exists. |
| Canon review | Historical, ethical, OOB, event, or sensitive-history feedback. | Canon owner records accepted/rejected/deferred verdict. |
| Product review | Confusion, tutorial gap, UX problem, or "what next?" friction. | Product owner decides fix, docs update, or no-action rationale. |
| Ready for fix | Actionable code/content/docs change is scoped. | Implementer can work without rereading raw feedback thread. |
| Fixed / answered | Change shipped or response drafted. | Verification evidence or response link exists. |
| Release note / response | Needs changelog, digest note, or direct tester reply. | Public or private response is sent. |
| Archived signal | Praise, non-actionable preference, duplicate, or out-of-scope item. | Kept for pattern analysis; no active work. |

## Labels

| Label | Use For |
|---|---|
| `bug-crash` | Crash, freeze, launch, install, save/load failure |
| `bug-ui` | Layout, clickability, modal, visibility, unreadable text |
| `tutorial` | First-run confusion, onboarding step, restart/skip behavior |
| `replay` | Replay controls, inspection, post-run understanding |
| `calibration` | Territory, casualties, operations, AI military outcome |
| `history` | Historical claim, attribution, OOB, naming, chronology |
| `sensitive-history` | Representation risk, atrocity framing, ethical discomfort |
| `performance` | Slow turn, memory, startup, stutter |
| `praise-signal` | Positive signal that should be preserved |
| `needs-save` | Needs save file or reproducible state |
| `operator-only` | Outreach, build hosting, Discord/form admin |

## Intake Template

```text
Source:
Tester profile:
Build:
Scenario:
Turn/week:
Summary:
Why it matters:
Evidence:
Labels:
Owner:
Next action:
```

## Weekly Review

1. Empty Intake into labeled cards.
2. Escalate crashes/save failures before subjective feedback.
3. Route sensitive-history items to canon review before public debate.
4. Merge duplicates but preserve distinct examples.
5. Pull one praise-signal into the weekly digest.
6. Move fixed items into release-note/response before closing the loop.
