'use strict';

// Shared non-field-command guard for the corps-scoped presidential levers
// (REPLACE-CO / STOP-OP / REQUEST-OP staging handlers).
//
// The main-staff / general-staff entities (`arbih_general_staff`, `vrs_main_staff`,
// `hvo_main_staff`) are supreme-command reserve pools, NOT field corps: they hold no
// sector, command no front, and cannot be the target of a corps-scoped lever. The
// engine already classifies them — `kind: "army_hq"` in `data/source/oob_corps.json`
// (mirrored by EXEMPT_CORPS_IDS / isSectorAssignmentExemptCorpsId in
// `src/sim/combat/corps_front_sectors_constants.ts`) — and that `kind` survives into
// the serialized formation. The RS-ahistorical-playthrough Pyrrhic panel (five
// independent specialists) found the lever handlers never consulted it, so Main Staff
// was offered as a lever target and 1,047 automated REPLACE-CO attempts hit the
// dead-end. This guard reuses the existing `kind` data — no second id list — so every
// caller (not just the one known UI path) rejects a non-field-command target.

/**
 * True when `corpsId` names a supreme-command / army-HQ entity rather than a field
 * corps, keyed off the serialized formation's `kind === 'army_hq'`. Defensive: a
 * missing formation is NOT treated as non-field-command (that path returns the
 * existing `corps_not_found`).
 * @param {any} state Deserialized canonical GameState.
 * @param {string} corpsId
 * @returns {boolean}
 */
function isNonFieldCommandCorps(state, corpsId) {
  const formations = state && state.military && state.military.formations;
  const formation = formations ? formations[corpsId] : undefined;
  return !!formation && formation.kind === 'army_hq';
}

module.exports = { isNonFieldCommandCorps };
