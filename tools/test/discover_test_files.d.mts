export interface DiscoveredTests {
  vitestFiles: string[];
  fastVitestFiles: string[];
  scenarioVitestFiles: string[];
  nodeTestFiles: string[];
  jsdomVitestFiles: string[];
}

export function listTsFiles(dir: string): string[];
export function fileUsesVitest(path: string): boolean;
export function fileNeedsJsdom(path: string): boolean;
export function fileRunsScenario(path: string): boolean;
export function discoverTests(rootDir: string): DiscoveredTests;
export function toRepoRelative(rootDir: string, files: string[]): string[];
