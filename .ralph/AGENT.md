# AWWV Build & Run Instructions

## Prerequisites
- Node.js (with npm)
- TypeScript via tsx

## Build & Check
```bash
npm run typecheck          # TypeScript type checking
```

## Run Tests
```bash
npm test                   # node:test runner
npm run test:vitest        # Vitest (193 tests, 18 suites)
```

## Run Simulation
```bash
npm run sim:scenario:run:default   # 52-week historical scenario
npm run sim:scenario:run:40w       # 40-week calibration scenario
```

## Run GUI
```bash
npm run desktop            # Electron app
npm run dev:map            # Vite dev server (port 3001)
```

## Key Scripts
```bash
npm run canon:check        # Determinism scan
```

## Notes
- Many test stubs report "No test suite found" — this is normal (145+)
- On Windows/PowerShell, use `;` not `&&` to chain commands
- Replay generation disabled by default; use `--video` flag if needed
