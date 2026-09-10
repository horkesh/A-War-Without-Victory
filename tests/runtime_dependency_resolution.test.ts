import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { resolveConfig, type UserConfig } from 'vite';
import directConfig from '../vitest.config';
import productionMapConfig from '../src/ui/map/vite.config';
import { renderBalancedVitestConfig } from '../tools/test/run_vitest_balanced.mjs';
import { writeVitestSliceConfig } from '../tools/test/run_vitest_slice.mjs';

type RuntimeIdentity = {
  packageName: string;
  packageRoot: string;
  version: string;
};

type VitestConfig = {
  resolve?: {
    alias?: Record<string, string>;
  };
};

const root = process.cwd();
const generatedBalancedRoot = join(root, '.tmp_vitest_balanced', 'runtime-dependency-resolution');
const generatedBalancedConfig = join(generatedBalancedRoot, 'worker.config.mjs');
const generatedSliceRoot = join(root, '.tmp_vitest_slice_runtime_dependency_resolution');
const generatedSliceConfig = join(generatedSliceRoot, 'vitest.slice.config.mjs');

const runtimeConsumers: Record<string, string> = {
  '@deck.gl/core': 'src/ui/map/map/MapContainer.tsx',
  '@deck.gl/extensions': 'src/ui/map/components/ops_modal/OpsMap.tsx',
  '@deck.gl/layers': 'src/ui/map/components/ops_modal/OpsMap.tsx',
  '@deck.gl/mapbox': 'src/ui/map/map/MapContainer.tsx',
  'maplibre-gl': 'src/ui/map/map/MapContainer.tsx',
  'pmtiles': 'src/ui/map/map/pmtilesProtocol.ts',
  'react': 'src/ui/map/App.tsx',
  'react-dom': 'src/ui/map/main.tsx',
  'zustand': 'src/ui/map/store/gameStore.ts',
};

const expectedRuntimeVersions: Record<string, string> = {
  '@deck.gl/core': '9.2.11',
  '@deck.gl/extensions': '9.2.11',
  '@deck.gl/layers': '9.2.11',
  '@deck.gl/mapbox': '9.2.11',
  'maplibre-gl': '4.7.1',
  'pmtiles': '3.2.1',
  'react': '18.3.1',
  'react-dom': '18.3.1',
  'zustand': '4.5.7',
};

const expectedStorybookVersions: Record<string, string> = {
  '@storybook/addon-a11y': '10.2.13',
  '@storybook/addon-docs': '10.2.13',
  '@storybook/react-vite': '10.2.13',
  'storybook': '10.2.13',
};

function packageIdentityFromResolvedPath(packageName: string, resolvedPath: string): RuntimeIdentity {
  let cursor = existsSync(resolvedPath) && statSync(resolvedPath).isDirectory()
    ? resolvedPath
    : dirname(resolvedPath);

  while (cursor !== dirname(cursor)) {
    const packageJsonPath = join(cursor, 'package.json');
    if (existsSync(packageJsonPath)) {
      const document = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { name?: string; version?: string };
      if (document.name === packageName && typeof document.version === 'string') {
        return { packageName, packageRoot: resolve(cursor), version: document.version };
      }
    }
    cursor = dirname(cursor);
  }

  throw new Error(`Could not find ${packageName} package.json above ${resolvedPath}`);
}

function resolveFromConsumer(packageName: string, consumer: string): RuntimeIdentity {
  const resolvedPath = createRequire(join(root, consumer)).resolve(packageName);
  return packageIdentityFromResolvedPath(packageName, resolvedPath);
}

function resolveForRunner(packageName: string, config: VitestConfig): RuntimeIdentity {
  const alias = config.resolve?.alias?.[packageName];
  if (alias) return packageIdentityFromResolvedPath(packageName, alias);
  return resolveFromConsumer(packageName, 'tests/runtime_dependency_resolution.test.ts');
}

export function runtimeIdentityMismatches(
  production: RuntimeIdentity,
  runners: Record<string, RuntimeIdentity>,
): string[] {
  return Object.entries(runners)
    .filter(([, identity]) => (
      identity.version !== production.version || identity.packageRoot !== production.packageRoot
    ))
    .map(([runner, identity]) => (
      `${production.packageName}: production=${production.version}@${production.packageRoot}; `
      + `${runner}=${identity.version}@${identity.packageRoot}`
    ));
}

let sliceConfig: VitestConfig;
let balancedConfig: VitestConfig;
let resolveProductionId: ReturnType<Awaited<ReturnType<typeof resolveConfig>>['createResolver']>;

beforeAll(async () => {
  const resolvedProductionConfig = await resolveConfig(productionMapConfig as UserConfig, 'build');
  resolveProductionId = resolvedProductionConfig.createResolver();
  writeVitestSliceConfig(
    root,
    [join(root, 'tests', 'runtime_dependency_resolution.test.ts')],
    generatedSliceConfig,
  );
  mkdirSync(generatedBalancedRoot, { recursive: true });
  writeFileSync(
    generatedBalancedConfig,
    renderBalancedVitestConfig(['tests/runtime_dependency_resolution.test.ts']),
    'utf8',
  );

  sliceConfig = (await import(pathToFileURL(generatedSliceConfig).href)).default as VitestConfig;
  balancedConfig = (await import(pathToFileURL(generatedBalancedConfig).href)).default as VitestConfig;
});

afterAll(() => {
  rmSync(generatedBalancedRoot, { recursive: true, force: true });
  rmSync(generatedSliceRoot, { recursive: true, force: true });
});

describe('runtime dependency resolution authority', () => {
  it('detects a deliberate runner mismatch', () => {
    const production = { packageName: 'example-runtime', version: '1.0.0', packageRoot: '/runtime/v1' };
    const mismatches = runtimeIdentityMismatches(production, {
      direct: { ...production },
      sliced: { packageName: production.packageName, version: '2.0.0', packageRoot: '/runtime/v2' },
    });

    expect(mismatches).toHaveLength(1);
    expect(mismatches[0]).toContain('sliced=2.0.0@/runtime/v2');
  });

  for (const [packageName, consumer] of Object.entries(runtimeConsumers)) {
    it(`${packageName} has one production and Vitest identity`, async () => {
      const productionPath = await resolveProductionId(packageName, join(root, consumer));
      expect(productionPath, `production Vite must resolve ${packageName}`).toBeTruthy();
      const production = packageIdentityFromResolvedPath(packageName, productionPath!);
      expect(production.version).toBe(expectedRuntimeVersions[packageName]);

      const mismatches = runtimeIdentityMismatches(production, {
        direct: resolveForRunner(packageName, directConfig as VitestConfig),
        sliced: resolveForRunner(packageName, sliceConfig),
        balanced: resolveForRunner(packageName, balancedConfig),
      });

      expect(mismatches, mismatches.join('\n')).toEqual([]);
    });
  }

  it('uses one root workspace lock for the preserved production runtime versions', () => {
    const rootPackage = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
      workspaces?: string[];
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      overrides?: Record<string, string | Record<string, string>>;
    };
    const mapPackage = JSON.parse(readFileSync(join(root, 'src/ui/map/package.json'), 'utf8')) as {
      dependencies?: Record<string, string>;
    };

    expect(rootPackage.workspaces).toContain('src/ui/map');
    expect(existsSync(join(root, 'src/ui/map/package-lock.json'))).toBe(false);
    expect(rootPackage.overrides?.['@luma.gl/shadertools']).toMatchObject({ wgsl_reflect: '1.2.3' });
    for (const [packageName, version] of Object.entries(expectedRuntimeVersions)) {
      const rootDeclaration = rootPackage.dependencies?.[packageName]
        ?? rootPackage.devDependencies?.[packageName];
      expect(rootDeclaration, `root must preserve ${packageName}`).toBe(version);
      expect(mapPackage.dependencies?.[packageName], `map workspace must own ${packageName}`).toBe(version);
    }
    for (const [packageName, version] of Object.entries(expectedStorybookVersions)) {
      const mapDocument = mapPackage as typeof mapPackage & { devDependencies?: Record<string, string> };
      expect(mapDocument.devDependencies?.[packageName], `map workspace must preserve ${packageName}`).toBe(version);
    }
  });

  it('CI installs the map workspace through the root lock', () => {
    const workflowDir = join(root, '.github', 'workflows');
    const violations = readdirSync(workflowDir)
      .filter((file) => file.endsWith('.yml') || file.endsWith('.yaml'))
      .sort((left, right) => left < right ? -1 : left > right ? 1 : 0)
      .flatMap((file) => {
        const source = readFileSync(join(workflowDir, file), 'utf8');
        return /run:\s*npm ci --legacy-peer-deps\s*\r?\n\s*working-directory:\s*src\/ui\/map/g.test(source)
          ? [file]
          : [];
      });

    expect(violations).toEqual([]);
  });
});
