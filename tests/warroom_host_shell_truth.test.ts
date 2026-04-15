import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function readSource(relPath: string): string {
  return readFileSync(resolve(process.cwd(), relPath), 'utf8');
}

describe('warroom host shell truth', () => {
  it('loaded-game host path prefers the React warroom shell over the legacy desk', () => {
    const source = readSource('src/ui/warroom/warroom.ts');
    expect(source).toContain('private showLoadedGameShellScene(): void');
    expect(source).toContain("void this.showTacticalMapScene('warroom');");
    expect(source).toContain('this.showLoadedGameShellScene();');
  });

  it("showScreen('none') no longer drops loaded games through showWarroomScene directly", () => {
    const source = readSource('src/ui/warroom/warroom.ts');
    expect(source).toMatch(/else if \(screenId === 'none'\) \{[\s\S]*this\.showLoadedGameShellScene\(\);/);
    expect(source).not.toMatch(/else if \(screenId === 'none'\) \{[\s\S]*this\.showWarroomScene\(\);/);
  });

  it('WarroomShellLayer header reflects that runtime wiring is already live', () => {
    const source = readSource('src/ui/map/components/warroom/WarroomShellLayer.tsx');
    expect(source).toContain('Runtime owner for the loaded-game Warroom room shell');
    expect(source).not.toContain('Runtime wiring (changing the Electron entry point or warroom.ts iframe URL)');
    expect(source).not.toContain('is the next slice.');
  });
});
