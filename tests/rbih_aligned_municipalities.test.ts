import assert from 'node:assert';
import { test } from 'node:test';
import { MUN1990_IDS_ALIGNED_TO_RBIH, isMunicipalityAlignedToRbih } from '../src/state/rbih_aligned_municipalities.js';

test('RBiH-aligned municipality exceptions include Vogošća and Ilijaš', () => {
  assert.ok(MUN1990_IDS_ALIGNED_TO_RBIH.includes('vogosca'));
  assert.ok(MUN1990_IDS_ALIGNED_TO_RBIH.includes('ilijas'));
  assert.strictEqual(isMunicipalityAlignedToRbih('vogosca'), true);
  assert.strictEqual(isMunicipalityAlignedToRbih('ilijas'), true);
});
