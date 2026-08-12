# QA Gates Archive Pointer

Full pre-restructure archive: ./full_archive_20260708.md

Use this topic when working on release gates, browser gates, packaged probes, baseline regression, engine-health, structural fingerprint, or verification discipline.

High-value current rule: release-facing claims require fresh proof from the relevant gate; browser gates must capture network/request failures, not only console errors.

## Demoted from the napkin index 2026-08-12 (still valid, just lower-frequency)

- **[2026-06-26] Browser gates must watch network failures** — collect `requestfailed` and HTTP >=400, ignoring only deterministic teardown noise.
- **[2026-06-26] Trusted CI detectors must restore HEAD** — run the trusted base detector, then restore detector scripts from HEAD before setup/build/test.
