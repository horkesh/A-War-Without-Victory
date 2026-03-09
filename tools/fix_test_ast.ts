import { Project, SyntaxKind, ObjectLiteralExpression, ReturnStatement, SpreadAssignment, PropertyAssignment, AsExpression } from 'ts-morph';

const project = new Project({ tsConfigFilePath: 'tsconfig.json' });

const files = [
  'tests/brigade_aor.test.ts',
  'tests/brigade_corps_front_assign.test.ts',
  'tests/settlement_control.test.ts',
  'tests/ongoing_mobilization.test.ts',
  'tests/displacement_reporting_fix.test.ts',
  'tests/supply_reserves.test.ts',
  'tests/supply_reserves_phase_b.test.ts',
  'tests/supply_airdrop.test.ts',
  'tests/phase_c_supply_agency.test.ts',
  'tests/phase_e_municipality_support.test.ts',
  'tests/paramilitary_sweep.test.ts',
  'tests/enclave_resilience_phase_c.test.ts'
];

for (const file of files) {
  const sourceFile = project.getSourceFile(file);
  if (!sourceFile) {
    console.log('Not found:', file);
    continue;
  }
  
  const funcs = sourceFile.getFunctions().filter(f => f.getName()?.startsWith('make') || f.getName()?.includes('State'));
  let changed = false;
  
  for (const func of funcs) {
    const returnStmt = func.getFirstDescendantByKind(SyntaxKind.ReturnStatement);
    if (!returnStmt) continue;
    
    let expr = returnStmt.getExpression();
    if (!expr) continue;
    while (expr.getKind() === SyntaxKind.AsExpression) {
        expr = (expr as AsExpression).getExpression();
    }
    
    if (expr.getKind() !== SyntaxKind.ObjectLiteralExpression) continue;
    const objLiteral = expr as ObjectLiteralExpression;
    
    const spreads = objLiteral.getProperties().filter(p => p.getKind() === SyntaxKind.SpreadAssignment) as SpreadAssignment[];
    if (spreads.length === 0) continue;
    
    const overrideName = spreads[0].getExpression().getText();
    if (overrideName === 'base' || overrideName === '_base') continue;
    
    const domains = ['military', 'political', 'displacement'];
    for (const domain of domains) {
      const prop = objLiteral.getProperty(domain);
      if (prop && prop.getKind() === SyntaxKind.PropertyAssignment) {
        let initializer = (prop as PropertyAssignment).getInitializer();
        if (initializer) {
            while (initializer.getKind() === SyntaxKind.AsExpression) {
                initializer = (initializer as AsExpression).getExpression();
            }
            if (initializer.getKind() === SyntaxKind.ObjectLiteralExpression) {
                const innerObj = initializer as ObjectLiteralExpression;
                if (!innerObj.getText().includes('...(' + overrideName)) {
                    innerObj.addProperty('...(' + overrideName + '?.' + domain + ' || {})');
                    changed = true;
                }
            }
        }
      }
    }
  }
  
  if (changed) {
    sourceFile.saveSync();
    console.log('Saved', file);
  }
}
