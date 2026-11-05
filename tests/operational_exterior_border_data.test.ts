import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';
import {
  OSID_EXTERIOR_BORDER_BY_OSID,
  type ExteriorBorderState,
} from '../src/sim/combat/commander/osid_exterior_border_data.js';

type Artifact = {
  schema_version: number;
  provenance: {
    crs: string;
    operational_geometry: {
      source_feature_count: number;
      active_osid_count: number;
      fold_count: number;
    };
    neighbor_boundaries: Array<{
      state: ExteriorBorderState;
      metadata_path: string;
      metadata_sha256: string;
      source_url: string;
      license: string;
      sha256: string;
    }>;
    method: {
      ordering: string;
      exterior_tolerance_km: number;
      neighbor_attribution_tolerance_km: number;
      minimum_shared_border_km: number;
    };
  };
  osids: Record<string, ExteriorBorderState[]>;
};

const artifactPath = resolve('data/derived/operational/osid_exterior_border.json');
const artifact = JSON.parse(readFileSync(artifactPath, 'utf8')) as Artifact;
const strictCompare = (left: string, right: string): number => left < right ? -1 : left > right ? 1 : 0;

describe('operational exterior border data', () => {
  it('conforms to the checked-in v1 schema contract and the active 744-to-712 fold', () => {
    const schema = JSON.parse(readFileSync(resolve('data/reference/osid_exterior_border.schema.json'), 'utf8'));
    const validate = new Ajv2020({ allErrors: true, strict: true }).compile(schema);
    expect(validate(artifact), JSON.stringify(validate.errors, null, 2)).toBe(true);
    const invalidProvenance = structuredClone(artifact) as any;
    invalidProvenance.provenance.crs = 42;
    invalidProvenance.provenance.neighbor_boundaries = [];
    invalidProvenance.provenance.method = 'bad';
    expect(validate(invalidProvenance)).toBe(false);
    expect(artifact.schema_version).toBe(1);
    expect(artifact.provenance.crs).toBe('OGC:CRS84 (WGS84 longitude, latitude)');
    expect(artifact.provenance.operational_geometry).toMatchObject({
      source_feature_count: 744,
      active_osid_count: 712,
      fold_count: 32,
    });
    expect(artifact.provenance.method).toEqual(expect.objectContaining({
      ordering: 'strictCompare',
      exterior_tolerance_km: 0.02,
      neighbor_attribution_tolerance_km: 3,
      minimum_shared_border_km: 0.05,
    }));

    const activeOsids = new Set<string>(
      JSON.parse(readFileSync(resolve('data/derived/operational/operational_contact_graph.json'), 'utf8'))
        .nodes.map((node: { id: string }) => node.id),
    );
    expect(activeOsids.size).toBe(712);
    expect(Object.keys(artifact.osids).length).toBe(108);
    for (const [osid, states] of Object.entries(artifact.osids)) {
      expect(activeOsids.has(osid)).toBe(true);
      expect(osid).toMatch(/^op:[a-z0-9_]+:[a-z0-9_]+$/);
      expect(states.length).toBeGreaterThan(0);
      expect(states).toEqual([...new Set(states)].sort(strictCompare));
      expect(states.every((state) => ['HRV', 'MNE', 'SRB'].includes(state))).toBe(true);
    }
    expect(Object.keys(artifact.osids)).toEqual(Object.keys(artifact.osids).sort(strictCompare));
  });

  it('records pinned geoBoundaries source, version, checksum, and ODbL licence', () => {
    expect(artifact.provenance.neighbor_boundaries.map((source) => source.state)).toEqual(['HRV', 'MNE', 'SRB']);
    for (const source of artifact.provenance.neighbor_boundaries) {
      expect(source.source_url).toMatch(/^https:\/\/github\.com\/wmgeolab\/geoBoundaries\/raw\/9469f09\//);
      expect(source.license).toBe('Open Data Commons Open Database License 1.0');
      expect(source.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(source.metadata_path).toMatch(/geoBoundaries-[A-Z]{3}-ADM0-metaData\.json$/);
      expect(source.metadata_sha256).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it('passes required border spot checks', () => {
    expect(artifact.osids['op:orasje:orasje']).toContain('HRV');
    expect(artifact.osids['op:orasje:donja_mahala']).toContain('HRV');
    expect(artifact.osids['op:zvornik:zvornik']).toContain('SRB');
    expect(artifact.osids['op:visegrad:donji_dobrun_2']).toContain('SRB');
    expect(artifact.osids['op:bileca:bileca_2']).toContain('MNE');
    expect(artifact.osids['op:foca:tjentiste_2']).toContain('MNE');
    expect(artifact.osids['op:bihac:bihac_2']).toContain('HRV');
  });

  it('keeps the generated runtime constant byte-derived from the JSON artifact', () => {
    expect(OSID_EXTERIOR_BORDER_BY_OSID).toEqual(artifact.osids);
  });

  it('reproduces both checked-in outputs byte-for-byte', () => {
    expect(() => execFileSync(
      process.execPath,
      [resolve('node_modules/tsx/dist/cli.mjs'), 'scripts/map/derive_operational_exterior_border.ts', '--check'],
      { cwd: resolve('.'), encoding: 'utf8', stdio: 'pipe' },
    )).not.toThrow();
  }, 60_000);
});
