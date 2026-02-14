# NATO Map Aesthetic Specification (Phase A1)
**Era**: 1990-1995 (Cold War End / Yugoslav Wars)
**Role**: Wargame Specialist

## 1. Color Palette (JOG/Tactical Standard)
| Feature | Hex | Description |
|---------|-----|-------------|
| Background (Ground) | `#F4EBD0` | "NATO Sand" - Desaturated, parchment-like. |
| Forest/Woodland | `#A3B18A` | Desaturated sage green (not vibrant). |
| Urban (Density) | `#D1A7A7` | Muted brick/red shading (variable opacity). |
| MSR (Main Supply Route) | `#BA181B` | Bold dark red for primary highways. |
| Secondary Roads | `#000000` | Thin black lines. |
| Waterways/Rivers | `#0077B6` | Strong blue for obstacles; black outline for major rivers. |

## 2. Symbolic Language
### 2.1 Road Hierarchy
- **Class 1 (MSR)**: Multi-lane highways or critical logistics routes. Double-line or thick red stroke.
- **Class 2 (Secondary)**: Paved municipal connections. Single black stroke.
- **Class 3 (Terrtiary)**: Unpaved/dirt tracks. Dashed black stroke.

### 2.2 River Systems
- Rivers are **Terrain Obstacles** first, visual features second.
- Major rivers (Sava, Drina) must have double-line banks if width > 50m.
- Tributaries use variable stroke width based on flow/size.

### 2.3 Urban Density
Using 1991 Census Data:
- **Urban Center (Pop > 20k)**: Solid cross-hatch shading.
- **Town (Pop 5k - 20k)**: Light tint shading.
- **Village (Pop < 5k)**: Settlement marker (circle/square) with label.

## 3. Topography
- Desaturated contour lines or hillshading (from DEM) to provide situational awareness of heights without cluttering the tactical symbols.
- Strategic heights (peaks) marked with elevation in meters.

## 4. Path A Constraints
- Styles must be applied based on the unique `sid` (settlement) and `poly_id` (territory) keys.
- No visual element shall be non-deterministic (all derived from geo-math).
