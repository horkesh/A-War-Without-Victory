/**
 * Warroom regions script: canonical 12-anchor contract for all modals.
 *
 * - Defines the full set of anchor IDs, actions, tooltips, and layer/type.
 * - generate: write a template region JSON with all 12 anchors (placeholder bounds).
 * - validate: check existing region JSON files for presence of all 12 anchors and schema.
 *
 * See docs/40_reports/handovers/20260311_WARROOM_EXTERNAL_MASTER_HANDOVER.md §3.
 *
 * Usage:
 *   npx tsx tools/ui/warroom_regions_all_modals.ts list
 *   npx tsx tools/ui/warroom_regions_all_modals.ts generate [--out path]
 *   npx tsx tools/ui/warroom_regions_all_modals.ts validate <path> [path ...]
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SCHEMA_VERSION = '2.1';
const IMAGE_WIDTH = 2752;
const IMAGE_HEIGHT = 1536;
const PLACEHOLDER_SIZE = 100;

export type WarroomAnchorSpec = {
  id: string;
  type: 'baked_prop' | 'runtime_overlay';
  action: string;
  tooltip: string;
  layer: 'desk' | 'wall';
  hover_style?: string;
  cursor?: string;
};

/** Canonical 12 modal anchors (IDs must match ClickableRegionManager / handover). */
export const WARROOM_ANCHORS_ALL: WarroomAnchorSpec[] = [
  { id: 'wall_flag_area', type: 'runtime_overlay', action: 'open_faction_archive', tooltip: 'Faction Flag', layer: 'wall', hover_style: 'glow', cursor: 'pointer' },
  { id: 'wall_calendar_area', type: 'runtime_overlay', action: 'advance_turn', tooltip: 'Wall Calendar', layer: 'wall', hover_style: 'glow', cursor: 'pointer' },
  { id: 'desk_map', type: 'baked_prop', action: 'open_operational_map', tooltip: 'Operational Map', layer: 'desk', hover_style: 'glow', cursor: 'pointer' },
  { id: 'command_briefing_folio', type: 'baked_prop', action: 'open_command_briefing', tooltip: 'Command Briefing', layer: 'desk', hover_style: 'glow', cursor: 'pointer' },
  { id: 'newspaper_stack', type: 'baked_prop', action: 'open_press_briefing', tooltip: 'Press Briefing', layer: 'desk', hover_style: 'glow', cursor: 'pointer' },
  { id: 'intelligence_journal', type: 'baked_prop', action: 'open_intelligence_journal', tooltip: 'Intelligence Journal', layer: 'wall', hover_style: 'glow', cursor: 'pointer' },
  { id: 'diplomatic_telephone', type: 'baked_prop', action: 'open_diplomatic_telephone', tooltip: 'Diplomatic Telephone', layer: 'desk', hover_style: 'glow', cursor: 'pointer' },
  { id: 'desk_radio', type: 'baked_prop', action: 'open_radio_net', tooltip: 'Radio Net', layer: 'desk', hover_style: 'glow', cursor: 'pointer' },
  { id: 'commander_coatrack', type: 'baked_prop', action: 'open_commander_register', tooltip: 'Commander Register', layer: 'wall', hover_style: 'glow', cursor: 'pointer' },
  { id: 'enclave_dispatch_folder', type: 'baked_prop', action: 'open_enclave_crisis', tooltip: 'Enclave Crisis', layer: 'desk', hover_style: 'glow', cursor: 'pointer' },
  { id: 'intelligence_packet', type: 'baked_prop', action: 'open_intelligence_packet', tooltip: 'Turn-End Intelligence', layer: 'desk', hover_style: 'glow', cursor: 'pointer' },
  { id: 'honors_memorial', type: 'baked_prop', action: 'open_honors_memorial', tooltip: 'Honors and Memorials', layer: 'wall', hover_style: 'glow', cursor: 'pointer' },
];

export const REQUIRED_ANCHOR_IDS = WARROOM_ANCHORS_ALL.map((a) => a.id).sort();

type RegionBounds = { x: number; y: number; width: number; height: number };
type RegionEntry = {
  id: string;
  type: string;
  bounds: RegionBounds;
  polygon: [number, number][];
  action: string;
  hover_style?: string;
  cursor?: string;
  tooltip: string;
  layer: string;
};

function placeholderBounds(index: number): RegionBounds {
  const col = index % 6;
  const row = Math.floor(index / 6);
  return {
    x: col * (PLACEHOLDER_SIZE + 10),
    y: row * (PLACEHOLDER_SIZE + 10),
    width: PLACEHOLDER_SIZE,
    height: PLACEHOLDER_SIZE,
  };
}

function boundsToPolygon(b: RegionBounds): [number, number][] {
  return [
    [b.x, b.y],
    [b.x + b.width, b.y],
    [b.x + b.width, b.y + b.height],
    [b.x, b.y + b.height],
  ];
}

/** Build region entries for all 12 anchors with placeholder geometry (replace in region_mapper). */
export function buildTemplateRegions(): RegionEntry[] {
  return WARROOM_ANCHORS_ALL.map((spec, index) => {
    const bounds = placeholderBounds(index);
    return {
      id: spec.id,
      type: spec.type,
      bounds,
      polygon: boundsToPolygon(bounds),
      action: spec.action,
      ...(spec.hover_style && { hover_style: spec.hover_style }),
      ...(spec.cursor && { cursor: spec.cursor }),
      tooltip: spec.tooltip,
      layer: spec.layer,
    };
  });
}

export function generateTemplateJson(): string {
  const payload = {
    schema_version: SCHEMA_VERSION,
    image_dimensions: { width: IMAGE_WIDTH, height: IMAGE_HEIGHT },
    options: { calendar_baked_in_art: true },
    regions: buildTemplateRegions(),
  };
  return JSON.stringify(payload, null, 2);
}

type ValidateResult = { ok: boolean; path: string; missing?: string[]; errors?: string[] };

export function validateRegionsFile(filePath: string): ValidateResult {
  const path = resolve(filePath);
  let data: { schema_version?: string; image_dimensions?: { width?: number; height?: number }; regions?: { id: string }[] };
  try {
    const raw = readFileSync(path, 'utf-8');
    data = JSON.parse(raw) as typeof data;
  } catch (e) {
    return { ok: false, path: filePath, errors: [(e as Error).message] };
  }

  const errors: string[] = [];
  if (data.schema_version !== SCHEMA_VERSION) {
    errors.push(`schema_version must be "${SCHEMA_VERSION}" (got ${String(data.schema_version)})`);
  }
  const dims = data.image_dimensions;
  if (!dims || dims.width !== IMAGE_WIDTH || dims.height !== IMAGE_HEIGHT) {
    errors.push(`image_dimensions must be ${IMAGE_WIDTH}x${IMAGE_HEIGHT} (got ${dims?.width ?? '?'}x${dims?.height ?? '?'})`);
  }

  const present = new Set((data.regions ?? []).map((r) => r.id));
  const missing = REQUIRED_ANCHOR_IDS.filter((id) => !present.has(id));
  if (missing.length > 0) {
    errors.push(`Missing required anchor IDs: ${missing.join(', ')}`);
  }

  return {
    ok: errors.length === 0,
    path: filePath,
    ...(missing.length > 0 && { missing }),
    ...(errors.length > 0 && { errors }),
  };
}

function listAnchors(): void {
  console.log('Warroom 12-anchor contract (all modals)\n');
  console.log('ID\t\t\t\tAction\t\t\t\tLayer\tType');
  console.log('─'.repeat(90));
  for (const a of WARROOM_ANCHORS_ALL) {
    console.log(`${a.id.padEnd(28)} ${a.action.padEnd(24)} ${a.layer.padEnd(6)} ${a.type}`);
  }
  console.log('\nTooltips:', WARROOM_ANCHORS_ALL.map((a) => a.tooltip).join(' | '));
}

function main(): void {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (cmd === 'list') {
    listAnchors();
    return;
  }

  if (cmd === 'generate') {
    const outIdx = args.indexOf('--out');
    const outPath = outIdx >= 0 ? args[outIdx + 1] : undefined;
    const json = generateTemplateJson();
    if (outPath) {
      const abs = resolve(outPath);
      writeFileSync(abs, json, 'utf-8');
      console.log(`Wrote template with 12 regions to ${abs}`);
    } else {
      console.log(json);
    }
    return;
  }

  if (cmd === 'validate') {
    const paths = args.slice(1).filter((p) => p !== '--out' && !p.startsWith('-'));
    if (paths.length === 0) {
      console.error('Usage: validate <path> [path ...]');
      process.exit(1);
    }
    let failed = 0;
    for (const p of paths) {
      const result = validateRegionsFile(p);
      if (result.ok) {
        console.log(`OK ${result.path}`);
      } else {
        failed++;
        console.error(`FAIL ${result.path}`);
        (result.errors ?? []).forEach((e) => console.error(`  - ${e}`));
      }
    }
    process.exit(failed > 0 ? 1 : 0);
  }

  console.error('Usage: list | generate [--out path] | validate <path> [path ...]');
  process.exit(1);
}

main();
