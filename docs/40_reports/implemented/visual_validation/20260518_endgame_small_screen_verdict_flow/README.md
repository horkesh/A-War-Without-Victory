# Endgame Small-Screen Verdict Flow Visual Validation

**Command:** `node docs\40_reports\implemented\visual_validation\20260518_endgame_small_screen_verdict_flow\capture.cjs`

## Captures

| Capture | Viewport | Active section | Screenshot | Metrics |
|---|---:|---|---|---|
| Mobile report | 390x844 | `report` | `mobile_390x844_report.png` | `mobile_390x844_report.json` |
| Mobile reckoning | 390x844 | `reckoning` | `mobile_390x844_reckoning.png` | `mobile_390x844_reckoning.json` |
| Desktop overview | 1440x900 | `report` | `desktop_1440x900_overview.png` | `desktop_1440x900_overview.json` |

## Metrics Summary

- Mobile cinematic band: `364x343`, down from the earlier crowded 578px mobile band.
- Mobile lower flow: `364x361`, with segmented `Report` / `Reckoning` controls.
- Mobile `report` active: report panel is measurable and reckoning is collapsed to `0x0`.
- Mobile `reckoning` active: reckoning panel is measurable and report is collapsed to `0x0`.
- Desktop keeps the existing stacked report and reckoning flow visible in the scroll pane.
