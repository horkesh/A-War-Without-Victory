# BCS Letter Home Localization

**Date:** 2026-05-23
**Type:** Implemented authored-template localization slice
**Scope:** Chief of Staff Letter Home casualty vignette templates

## Summary

Letter Home now supports localized template selection through `LetterHomeInput.locale`, and the Chief of Staff UI passes the active locale into the deterministic generator. The shipped Letter Home catalog now carries BCS prose for all 25 casualty vignette templates.

This is presentation/content only. It does not change casualty selection, template selection, deterministic hashing, battle casualty splits, formation lookup, scenario data, save schema, calibration/army-arc behavior, or generated artifacts.

## Verification

- Red: `npx.cmd vitest run tests\letter_home_i18n.test.ts --reporter=dot` failed while BCS requests still used English template prose.
- Green: `npx.cmd vitest run tests\letter_home_i18n.test.ts tests\ui\chief_of_staff_briefing_i18n.test.ts --reporter=dot` passed 9/9.
- Catalog check: all 25 Letter Home templates include `text_template_bcs`.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with existing Vite browser-external/chunk warnings.
- `git diff --check` passed.

## Remaining Work

Shared date formatting and broader non-Army-HQ surfaces remain follow-up localization targets. Native-speaker terminology review remains required before release-quality BCS sign-off.
