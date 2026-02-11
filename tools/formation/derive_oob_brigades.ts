#!/usr/bin/env node
/**
 * Validate (and optionally normalize) OOB brigades and corps JSON.
 * Ensures deterministic ordering and valid mun1990_id against municipalities_1990_registry_110.json.
 * Validates home_settlement against settlement_names.json via municipality_population_1991.json mapping.
 *
 * Usage: tsx tools/formation/derive_oob_brigades.ts [--validate-only]
 *   --validate-only: only validate and report; do not write.
 *   Default: validate and write normalized JSON (same content, stable order).
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CANONICAL_FACTIONS = ['RBiH', 'RS', 'HRHB'];

interface RegistryRow {
  mun1990_id: string;
  name?: string;
  normalized_name?: string;
}

interface MunPopRecord {
  total: number;
  mun1990_id: string;
}

interface SettlementNameRecord {
  name: string;
  mun_code: string;
}

function loadRegistry(repoRoot: string): Set<string> {
  const path = resolve(repoRoot, 'data/source/municipalities_1990_registry_110.json');
  const raw = JSON.parse(readFileSync(path, 'utf8')) as { rows?: RegistryRow[] };
  const set = new Set<string>();
  for (const row of raw.rows ?? []) {
    if (typeof row.mun1990_id === 'string') set.add(row.mun1990_id);
  }
  return set;
}

function loadSettlementValidationMaps(repoRoot: string): Map<string, Set<string>> {
  // 1. Map mun1990_id -> mun_code using municipality_population_1991.json
  const popPath = resolve(repoRoot, 'data/derived/municipality_population_1991.json');
  const popRaw = JSON.parse(readFileSync(popPath, 'utf8')) as { by_municipality_id: Record<string, MunPopRecord> };

  const munIdToCode = new Map<string, string>();
  for (const [code, record] of Object.entries(popRaw.by_municipality_id)) {
    if (record.mun1990_id) {
      munIdToCode.set(record.mun1990_id, code);
    }
  }

  // 2. Map mun_code -> Set<settlement_name> using settlement_names.json
  const namesPath = resolve(repoRoot, 'data/derived/settlement_names.json');
  const namesRaw = JSON.parse(readFileSync(namesPath, 'utf8')) as { by_census_id: Record<string, SettlementNameRecord> };

  const settlementsByMunCode = new Map<string, Set<string>>();
  for (const record of Object.values(namesRaw.by_census_id)) {
    if (!settlementsByMunCode.has(record.mun_code)) {
      settlementsByMunCode.set(record.mun_code, new Set());
    }
    settlementsByMunCode.get(record.mun_code)!.add(record.name);
  }

  // 3. Combine to mun1990_id -> Set<settlement_name>
  const validationMap = new Map<string, Set<string>>();

  // Manual mapping for split municipalities (RS codes -> 1990 parent)
  // 11479 is Fed Gračanica; 20478 is RS Petrovo (part of Gračanica/Lukavac 1990)
  // 11045 is Tešanj; 11622 is Usora (Sivša/Omanjska)
  // 20141 is Doboj (RS); 20451 is Pelagićevo (RS, split from Gradačac)
  // 11436 is Bosanski Petrovac
  const SPLIT_MUNICIPALITY_MAPPING: Record<string, string[]> = {
    'gracanica': ['20478'],
    'tesanj': ['11622'],
    'doboj': ['20141'],
    'gradacac': ['20451'],
    'brcko': ['20451'] // Pelagićevo formed from parts of Gradačac/Brčko? Knowledge doc says "Pelagićevo -> Gradačac"
  };

  // Allow specific brigades to be HQ'd in a different municipality than their home_mun
  // Key: home_mun, Value: allowed settlement mun_code(s)
  const CROSS_MUNICIPALITY_HQ_MAPPING: Record<string, string[]> = {
    'gracanica': ['11177'], // 4th Ozren in Vozuća (11177 Zavidovići)
    'kotor_varos': ['20141'], // 12th Kotorsko in Kotorsko (Doboj)
    'kljuc': ['11509'], // 17th Ključ in Lanište (11509 is likely Ključ or adjacent?)
    'modrica': ['10308', '10600', '11562'], // Krnjin (10308 Derventa?), Tumare (10600 Lukavac), Paklenica (11562 Maglaj?)
    'bosanski_novi': ['10030'], // Bosanski Novi (10030)
    'ilidza': ['11479', '20141', '20214', '20320', '20346', '11568'], // Lukavica/Vojkovići codes (East Sarajevo)
    'bosanski_petrovac': ['11436'], // Bosanski Petrovac (11436)
    'tuzla': ['10600'], // 9th Muslim in Smoluća (10600 Lukavac)
    'brcko': ['20451'], // 3rd Posavina in Pelagićevo (20451)
    'skender_vakuf': ['11525'] // 22nd Krajina in Skender Vakuf (11525)
  };

  for (const [munId, code] of munIdToCode.entries()) {
    const settlements = settlementsByMunCode.get(code);
    if (settlements) {
      if (!validationMap.has(munId)) {
        validationMap.set(munId, new Set());
      }
      for (const s of settlements) validationMap.get(munId)!.add(s);
    }
  }

  // Inject split municipalities
  for (const [munId, extraCodes] of Object.entries(SPLIT_MUNICIPALITY_MAPPING)) {
    for (const code of extraCodes) {
      const extraSets = settlementsByMunCode.get(code);
      if (extraSets) {
        if (!validationMap.has(munId)) {
          validationMap.set(munId, new Set());
        }
        for (const s of extraSets) validationMap.get(munId)!.add(s);
      }
    }
  }

  return validationMap;
}

// Manual mapping for split municipalities (RS codes -> 1990 parent)
// 11479 is Fed Gračanica; 20478 is RS Petrovo (part of Gračanica/Lukavac 1990)
// 11045 is Tešanj; 11622 is Usora (Sivša/Omanjska)
// 20141 is Doboj (RS); 20451 is Pelagićevo (RS, split from Gradačac)
// 11436 is Bosanski Petrovac
const SPLIT_MUNICIPALITY_MAPPING: Record<string, string[]> = {
  'gracanica': ['20478'],
  'tesanj': ['11622'],
  'doboj': ['20141'],
  'gradacac': ['20451'],
  'brcko': ['20451']
};

// Allow specific brigades to be HQ'd in a different municipality than their home_mun
const CROSS_MUNICIPALITY_HQ_MAPPING: Record<string, string[]> = {
  'gracanica': ['11177'], // 4th Ozren in Vozuća (11177 Zavidovići)
  'kotor_varos': ['11004', '20141'], // 12th Kotorsko -> Kotorsko (20141 Doboj)
  'kljuc': ['11509'],
  'modrica': ['10308', '10600', '20141'], // Krnjin (?), Tumare (Lukavac), Gornja Paklenica (Doboj)
  'bosanski_novi': ['10030', '20397'], // Novi Grad codes
  'ilidza': ['11479', '20141', '20214', '20320', '20346', '11568', '11550', '20176', '11231'],
  'bosanski_petrovac': ['11436'],
  'tuzla': ['10600'], // Smoluća
  'brcko': ['20451'], // Pelagićevo
  'skender_vakuf': ['11525', '20257'] // Kneževo code
};


interface OOBBrigade {
  id: string;
  name: string;
  faction: string;
  home_mun: string;
  home_settlement?: string;
  subordinate_to?: string;
  [key: string]: unknown;
}

async function main() {
  const repoRoot = process.cwd();
  const isValidateOnly = process.argv.includes('--validate-only');

  const MUN_POP_FILE = resolve(repoRoot, 'data/derived/municipality_population_1991.json');
  const SETTLEMENTS_FILE = resolve(repoRoot, 'data/derived/settlement_names.json');
  const BRIGADES_FILE = resolve(repoRoot, 'data/source/oob_brigades.json');

  // Load Registry to validate home_mun
  const registry = loadRegistry(repoRoot);

  // Load Mun Pop (to map mun1990_id -> census codes)
  const munPopRaw = readFileSync(MUN_POP_FILE, 'utf8');
  const munPop = JSON.parse(munPopRaw) as { by_municipality_id: Record<string, MunPopRecord> };

  // Build munId -> main census code (e.g. "banovici" -> "10014")
  const munIdToCode = new Map<string, string>();
  if (munPop.by_municipality_id) {
    for (const [code, entry] of Object.entries(munPop.by_municipality_id)) {
      const e = entry as MunPopRecord;
      if (e.mun1990_id) {
        munIdToCode.set(e.mun1990_id, code);
      }
    }
  }

  // Load Settlement Names (to validate settlement existence)
  const settlementsRaw = readFileSync(SETTLEMENTS_FILE, 'utf8');
  const settlementsData = JSON.parse(settlementsRaw) as { by_census_id: Record<string, SettlementNameRecord> };

  // Build settlementName -> Set<mun_code>
  // Because names are not unique, we store all mun_codes where this name appears.
  const settlementCodeMap = new Map<string, Set<string>>();
  if (settlementsData.by_census_id) {
    for (const [id, entry] of Object.entries(settlementsData.by_census_id)) {
      const e = entry as SettlementNameRecord;
      if (!settlementCodeMap.has(e.name)) {
        settlementCodeMap.set(e.name, new Set());
      }
      settlementCodeMap.get(e.name)?.add(e.mun_code);
    }
  }

  // Load OOB Brigades
  const brigadesRaw = readFileSync(BRIGADES_FILE, 'utf8');
  const brigadesData = JSON.parse(brigadesRaw) as { brigades?: OOBBrigade[] };

  let hasError = false;

  // Deduplicate: keep last occurrence of each ID
  const brigadeMap = new Map<string, OOBBrigade>();
  for (const b of (brigadesData.brigades ?? [])) {
    if (!b.id) {
      console.error('Found brigade without ID');
      hasError = true;
      continue;
    }
    brigadeMap.set(b.id, b);
  }

  const sortedIds = Array.from(brigadeMap.keys()).sort();
  const validBrigades: OOBBrigade[] = [];

  for (const id of sortedIds) {
    const b = brigadeMap.get(id)!;

    // Validate faction
    if (!CANONICAL_FACTIONS.includes(b.faction)) {
      console.error(`OOB brigade ${id}: invalid faction ${b.faction}`);
      hasError = true;
    }

    // Validate home_mun
    if (!registry.has(b.home_mun)) {
      console.error(`OOB brigade ${id}: home_mun "${b.home_mun}" not in registry`);
      hasError = true;
    }

    // Validate subordinate_to
    if (b.subordinate_to) {
      if (!CANONICAL_FACTIONS.includes(b.subordinate_to)) {
        console.error(`OOB brigade ${id}: invalid subordinate_to "${b.subordinate_to}"`);
        hasError = true;
      }
    }

    // Validation: home_settlement must exist in home_mun (or allowed cross-mapping)
    if (b.home_settlement) {
      const allowedCodes = new Set<string>();

      // 1. Direct municipality codes
      const directCode = munIdToCode.get(b.home_mun);
      if (directCode) allowedCodes.add(directCode);

      // 2. Split municipality codes
      if (SPLIT_MUNICIPALITY_MAPPING[b.home_mun]) {
        SPLIT_MUNICIPALITY_MAPPING[b.home_mun].forEach(c => allowedCodes.add(c));
      }

      // 3. Cross-municipality exceptions
      if (CROSS_MUNICIPALITY_HQ_MAPPING[b.home_mun]) {
        CROSS_MUNICIPALITY_HQ_MAPPING[b.home_mun].forEach(c => allowedCodes.add(c));
      }

      // Find the settlement
      let valid = false;
      const home_settlement_name = typeof b.home_settlement === 'string' ? b.home_settlement.trim() : '';
      const candidates = settlementCodeMap.get(home_settlement_name);
      if (candidates) {
        for (const code of candidates) {
          if (allowedCodes.has(code)) {
            valid = true;
            break;
          }
        }
      }

      if (!valid) {
        console.warn(`OOB brigade ${b.id}: home_settlement "${b.home_settlement}" not found in municipality ${b.home_mun} (or allowed mappings)`);

        // Strict mode check unless warn-only
        if (!process.argv.includes('--warn-only')) {
          console.error(`FAILED: Settlement validation strict mode.`);
          hasError = true;
        }
      }
    }

    validBrigades.push(b);
  }

  // Check Corps
  const CORPS_FILE = resolve(repoRoot, 'data/source/oob_corps.json');
  const corpsRaw = JSON.parse(readFileSync(CORPS_FILE, 'utf8')) as { corps?: Array<Record<string, unknown>> };
  const corps = corpsRaw.corps ?? [];
  const seenCorpsIds = new Set<string>();

  for (let i = 0; i < corps.length; i++) {
    const c = corps[i];
    const id = typeof c.id === 'string' ? c.id.trim() : '';
    if (!id) {
      console.error(`OOB corps index ${i}: missing id`);
      hasError = true;
    } else if (seenCorpsIds.has(id)) {
      console.error(`OOB corps duplicate id: ${id}`);
      hasError = true;
    }
    seenCorpsIds.add(id);

    const faction = typeof c.faction === 'string' ? c.faction.trim() : '';
    if (!CANONICAL_FACTIONS.includes(faction)) {
      console.error(`OOB corps ${id}: invalid faction ${faction}`);
      hasError = true;
    }

    const hq_mun = typeof c.hq_mun === 'string' ? c.hq_mun.trim() : '';
    if (hq_mun && !registry.has(hq_mun)) {
      console.error(`OOB corps ${id}: hq_mun "${hq_mun}" not in registry`);
      hasError = true;
    }
  }

  if (hasError) {
    process.exit(1);
  }

  if (isValidateOnly) {
    console.log('OOB validation passed (brigades:', validBrigades.length, ', corps:', corps.length, ')');
    return;
  }

  // Normalize: stable order (by faction then name) and write
  const brigadesSorted = [...validBrigades].sort((a, b) => {
    const fa = (a.faction as string) ?? '';
    const fb = (b.faction as string) ?? '';
    const c = fa.localeCompare(fb);
    if (c !== 0) return c;
    return ((a.name as string) ?? '').localeCompare((b.name as string) ?? '');
  });

  const corpsSorted = [...corps].sort((a, b) => {
    const fa = (a.faction as string) ?? '';
    const fb = (b.faction as string) ?? '';
    const c = fa.localeCompare(fb);
    if (c !== 0) return c;
    // @ts-ignore
    return ((a.name as string) ?? '').localeCompare((b.name as string) ?? '');
  });

  writeFileSync(
    BRIGADES_FILE,
    JSON.stringify({ ...brigadesData, brigades: brigadesSorted }, null, 2),
    'utf8'
  );
  writeFileSync(
    CORPS_FILE,
    JSON.stringify({ ...corpsRaw, corps: corpsSorted }, null, 2),
    'utf8'
  );
  console.log('OOB validated and normalized (brigades:', validBrigades.length, ', corps:', corps.length, ')');
}

main();
