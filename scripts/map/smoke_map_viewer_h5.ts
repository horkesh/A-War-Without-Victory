/**
 * Phase H5: Unified viewer smoke test + sanity check
 * 
 * Validates that the unified map viewer can be built end-to-end and that
 * all expected datasets are present with correct structure.
 * 
 * Usage:
 *   npm run map:smoke:map-viewer
 *   or: tsx scripts/map/smoke_map_viewer_h5.ts
 * 
 * Outputs:
 *   - data/derived/_debug/map_viewer_smoke_report.txt (not committed)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Mistake guard

interface SmokeResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  checks: Record<string, boolean>;
}

async function main(): Promise<void> {
  const result: SmokeResult = {
    ok: true,
    errors: [],
    warnings: [],
    checks: {},
  };
  
  process.stdout.write('Phase H5: Unified map viewer smoke test\n\n');
  
  // Check 1: data_index.json exists and is valid JSON
  const dataIndexPath = resolve('data/derived/data_index.json');
  if (!existsSync(dataIndexPath)) {
    result.errors.push('data_index.json does not exist');
    result.ok = false;
  } else {
    try {
      const content = readFileSync(dataIndexPath, 'utf8');
      const index = JSON.parse(content);
      result.checks['data_index_exists'] = true;
      
      // Check required top-level fields
      if (!index.schema_version) {
        result.errors.push('data_index.json missing schema_version');
        result.ok = false;
      }
      if (!index.coordinate_space) {
        result.errors.push('data_index.json missing coordinate_space');
        result.ok = false;
      }
      if (!Array.isArray(index.canonical_bbox) || index.canonical_bbox.length !== 4) {
        result.errors.push('data_index.json missing or invalid canonical_bbox');
        result.ok = false;
      }
      if (!index.datasets) {
        result.errors.push('data_index.json missing datasets');
        result.ok = false;
      }
      if (!index.layers) {
        result.errors.push('data_index.json missing layers');
        result.ok = false;
      }
      
      result.checks['data_index_valid'] = result.ok;
      
      // Check 2: datasets registry has expected entries
      const expectedDatasets = [
        'settlements',
        'municipalities_1990_boundaries',
        'political_control',
        'settlement_ethnicity',
        'graph_v3',
        'graph_continuity',
        'displacement_settlement_turn0',
        'displacement_municipality_turn0',
      ];
      
      for (const ds of expectedDatasets) {
        if (!index.datasets[ds]) {
          result.warnings.push(`Dataset ${ds} missing from registry`);
        } else {
          result.checks[`dataset_${ds}_registered`] = true;
        }
      }
      
      // Check 3: layers registry has expected entries
      const expectedLayers = [
        'base_settlements',
        'mun1990_boundaries',
        'political_control',
        'ethnicity_majority',
        'displacement_settlement',
        'displacement_municipality',
      ];
      
      for (const layer of expectedLayers) {
        if (!index.layers[layer]) {
          result.warnings.push(`Layer ${layer} missing from registry`);
        } else {
          result.checks[`layer_${layer}_registered`] = true;
        }
      }
      
      // Check 4: Available datasets have files
      for (const [dsKey, ds] of Object.entries(index.datasets)) {
        if (typeof ds !== 'object' || ds === null) continue;
        const meta = ds as Record<string, unknown>;
        if (meta.available === true) {
          const dsPath = resolve('data/derived', String(meta.path || ''));
          if (!existsSync(dsPath)) {
            result.errors.push(`Dataset ${dsKey} marked available but file missing: ${meta.path}`);
            result.ok = false;
          } else {
            result.checks[`dataset_${dsKey}_file_exists`] = true;
          }
        }
      }
    } catch (err) {
      result.errors.push(`Failed to parse data_index.json: ${err instanceof Error ? err.message : String(err)}`);
      result.ok = false;
    }
  }
  
  // Check 5: Map viewer HTML exists
  const htmlPath = resolve('data/derived/map_viewer/index.html');
  if (!existsSync(htmlPath)) {
    result.errors.push('map_viewer/index.html does not exist');
    result.ok = false;
  } else {
    result.checks['map_viewer_html_exists'] = true;
  }
  
  // Check 6: Map viewer JS exists
  const jsPath = resolve('data/derived/map_viewer/viewer.js');
  if (!existsSync(jsPath)) {
    result.errors.push('map_viewer/viewer.js does not exist');
    result.ok = false;
  } else {
    result.checks['map_viewer_js_exists'] = true;
  }
  
  // Output report
  const reportPath = resolve('data/derived/_debug/map_viewer_smoke_report.txt');
  mkdirSync(resolve('data/derived/_debug'), { recursive: true });
  
  const reportLines: string[] = [];
  reportLines.push('AWWV Unified Map Viewer Smoke Test Report');
  reportLines.push('Phase H5');
  reportLines.push('');
  reportLines.push(`Status: ${result.ok ? 'PASS' : 'FAIL'}`);
  reportLines.push('');
  
  if (result.errors.length > 0) {
    reportLines.push('ERRORS:');
    for (const err of result.errors) {
      reportLines.push(`  - ${err}`);
    }
    reportLines.push('');
  }
  
  if (result.warnings.length > 0) {
    reportLines.push('WARNINGS:');
    for (const warn of result.warnings) {
      reportLines.push(`  - ${warn}`);
    }
    reportLines.push('');
  }
  
  reportLines.push('CHECKS:');
  for (const [check, passed] of Object.entries(result.checks).sort()) {
    reportLines.push(`  ${passed ? '✓' : '✗'} ${check}`);
  }
  reportLines.push('');
  
  reportLines.push('MANUAL INSPECTION:');
  reportLines.push('  1. Run: npx http-server -p 8080 -c-1');
  reportLines.push('  2. Open: http://localhost:8080/data/derived/map_viewer/index.html');
  reportLines.push('  3. Verify:');
  reportLines.push('     - Settlements render');
  reportLines.push('     - Municipality outlines align (if available)');
  reportLines.push('     - Political control colors correct (if available)');
  reportLines.push('     - Ethnicity colors correct (if available)');
  reportLines.push('     - Layer toggles work');
  reportLines.push('     - No blank screens');
  reportLines.push('     - Fatal error banner shows clear messages on failures');
  reportLines.push('');
  
  const reportText = reportLines.join('\n');
  writeFileSync(reportPath, reportText, 'utf8');
  
  process.stdout.write(reportText);
  process.stdout.write(`\nWrote smoke report to ${reportPath}\n`);
  
  if (!result.ok) {
    process.exitCode = 1;
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exitCode = 1;
});
