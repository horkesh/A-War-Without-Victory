import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import ts from 'typescript';

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

/** Identify attack UI/activation syntax, while allowing passive pending-state guards. */
function attackSurfaceViolations(source: string): string[] {
  const file = ts.createSourceFile('surface.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const violations: string[] = [];
  const factories = new Set(['createElement']);
  const component = (name: string) => /^AttackConfirmation(?:$|[A-Z])/.test(name);
  const leaf = (expression: ts.Node) => expression.getText(file).split('.').at(-1) ?? '';
  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const moduleName = node.moduleSpecifier.text.split('/').at(-1)?.replace(/\.[cm]?[jt]sx?$/, '') ?? '';
      const bindings = node.importClause?.namedBindings;
      const names = bindings && ts.isNamedImports(bindings)
        ? bindings.elements.map(binding => (binding.propertyName ?? binding.name).text) : [];
      if (component(moduleName) || names.some(component) || component(node.importClause?.name?.text ?? '')) {
        violations.push('attack component import');
      }
      if (node.moduleSpecifier.text === 'react' && bindings && ts.isNamedImports(bindings)) {
        for (const binding of bindings.elements) {
          if ((binding.propertyName ?? binding.name).text === 'createElement') factories.add(binding.name.text);
        }
      }
    }
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && component(leaf(node.tagName))) {
      violations.push('attack component mount');
    }
    if (ts.isCallExpression(node)) {
      const name = ts.isElementAccessExpression(node.expression) && ts.isStringLiteral(node.expression.argumentExpression)
        ? node.expression.argumentExpression.text : leaf(node.expression);
      if (['stageAttackOrder', 'setPendingAttackConfirmation'].includes(name)) violations.push('attack activation');
      if (factories.has(name) && node.arguments[0] && component(leaf(node.arguments[0]))) {
        violations.push('attack component factory mount');
      }
      if ((node.expression.kind === ts.SyntaxKind.ImportKeyword || name === 'require') &&
          node.arguments[0] && ts.isStringLiteral(node.arguments[0]) &&
          component(node.arguments[0].text.split('/').at(-1)?.replace(/\.[cm]?[jt]sx?$/, '') ?? '')) {
        violations.push('attack component dynamic import');
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return violations;
}

describe('presidential command model player surfaces', () => {
  it('does not mount the detailed brigade-and-axis operations planner', () => {
    const app = read('src/ui/map/App.tsx');
    const corpsDetail = read('src/ui/map/components/CorpsDetail.tsx');
    const corpsFront = read('src/ui/map/components/CorpsFrontPanel.tsx');

    expect(app).not.toContain("import { OpsPlanningModal }");
    expect(app).not.toContain('<OpsPlanningModal />');
    expect(corpsDetail).not.toContain('setOpsPlanningContext');
    expect(corpsDetail).not.toContain('prepareOperationInHq');
    expect(corpsFront).not.toContain('setOpsPlanningContext');
    expect(corpsFront).not.toContain('corps-front-draft-directive');
  });

  it('does not expose direct brigade attack or sector-assignment controls', () => {
    const app = read('src/ui/map/App.tsx');
    const map = read('src/ui/map/map/MapContainer.tsx');
    const formation = read('src/ui/map/components/FormationDetail.tsx');
    const preload = read('src/desktop/preload.cjs');

    expect(attackSurfaceViolations(app)).toEqual([]);
    expect(app).not.toContain('stageAttackOrder');
    expect(map).not.toContain('setPendingAttackConfirmation');
    expect(map).not.toContain('stageAssignBrigadeToSectorAction');
    expect(formation).not.toContain('assignBrigadeToSectorOverrideAction');
    expect(preload).not.toContain('stageAttackOrder:');
    expect(preload).not.toContain('assignBrigadeToSector:');
    expect(preload).not.toContain('stagePostureOrder:');
    expect(preload).not.toContain('stageMoveOrder:');
    expect(preload).not.toContain('stageDeployOrder:');
    expect(preload).not.toContain('stageUndeployOrder:');
    expect(preload).not.toContain('stageCorpsOperationOrder:');
    expect(preload).not.toContain('stageAssignOperationCommander:');
  });

  it('allows a read-only palette blocker without allowing attack activation', () => {
    expect(attackSurfaceViolations(`
      const pending = useGameStore(state => state.pendingAttackConfirmation);
      const blocked = pending !== null;
      if (store.pendingAttackConfirmation !== null) return;
    `)).toEqual([]);
  });

  it.each([
    `import { AttackConfirmation as Confirmation } from './components/AttackConfirmation';`,
    `const node = <AttackConfirmation />;`,
    `const node = <Dialogs.AttackConfirmationModal />;`,
    `const node = React.createElement(AttackConfirmation, {});`,
    `import { createElement as h } from 'react'; const node = h(AttackConfirmation, {});`,
    `const dialog = import('./components/AttackConfirmation');`,
    `store.setPendingAttackConfirmation({ attackerFormationId: 'own', targetOsid: 'target' });`,
    `store['stageAttackOrder']({});`,
  ])('still rejects a real attack UI or activation path: %s', source => {
    expect(attackSurfaceViolations(source).length).toBeGreaterThan(0);
  });

  it('keeps the canonical request-operation lever as the player route', () => {
    const directiveCard = read('src/ui/map/components/army_hq/DirectiveCard.tsx');
    const main = read('src/desktop/electron-main.cjs');

    expect(directiveCard).toContain('stageOpDirectiveOrder');
    expect(main).toContain("ipcMain.handle('stage-op-directive-order'");
    expect(main).toContain('The president names ONLY the objective');
  });
});
