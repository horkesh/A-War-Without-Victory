import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('Army HQ recruitment and autonomy routes', () => {
  it('exposes both commands from the Personnel tab', () => {
    const personnel = read('src/ui/map/components/army_hq/PersonnelContent.tsx');

    expect(personnel).toContain('onOpenRecruitment?: () => void');
    expect(personnel).toContain('onOpenAutonomy?: () => void');
    expect(personnel).toContain('data-testid="personnel-open-recruitment"');
    expect(personnel).toContain('data-testid="personnel-open-autonomy"');
  });

  it('threads Personnel commands through Army HQ without duplicating decision ownership', () => {
    const armyHq = read('src/ui/map/components/army_hq/ArmyHQModal.tsx');

    expect(armyHq).toContain('onOpenRecruitment?: () => void');
    expect(armyHq).toContain('onOpenAutonomy?: () => void');
    expect(armyHq).toContain('<PersonnelContent');
    expect(armyHq).toContain('onOpenRecruitment={handleOpenRecruitment}');
    expect(armyHq).toContain('onOpenAutonomy={handleOpenAutonomy}');
  });

  it('mounts both live surfaces in App and closes Army HQ before opening them', () => {
    const app = read('src/ui/map/App.tsx');

    expect(app).toContain("import { AutonomyPanel } from './components/AutonomyPanel';");
    expect(app).toContain('const [autonomyOpen, setAutonomyOpen] = useState(false);');
    expect(app).toContain('onOpenRecruitment={openRecruitmentModal}');
    expect(app).toContain('onOpenAutonomy={() => {');
    expect(app).toContain('setAutonomyOpen(true);');
    expect(app).toContain('{autonomyOpen && (');
    expect(app).toContain('<AutonomyPanel');
  });

  it('exposes stable primary and close actions for live recruitment proof', () => {
    const modal = read('src/ui/map/components/RecruitmentModal.tsx');

    expect(modal).toContain('data-testid="recruitment-apply"');
    expect(modal).toContain('data-testid="recruitment-close"');
  });
});
