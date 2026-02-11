# Settlement GeoJSON Generation System

## Purpose

Convert settlement boundary data from SVG format to proper GeoJSON while preserving settlement-level granularity (6,000+ settlements) and ensuring geographic accuracy for the AWWV simulation.

## Why This Approach?

**Problem**: SVG-based rendering has geometry issues and doesn't work well with standard mapping libraries.

**Solution**: Convert to GeoJSON format using existing SVG data as source, with intelligent fallbacks for problematic geometries.

**Benefits**:
- ✓ Maintains 6,000+ settlement granularity
- ✓ Works with standard mapping libraries (Leaflet, Mapbox, etc.)
- ✓ Proper coordinate system (WGS84)
- ✓ Validates geometry quality
- ✓ Preserves all simulation metadata
- ✓ Deterministic output

## System Architecture

```
Input Data:
  ├─ Settlement SVG paths (boundaries)
  ├─ Settlement metadata JSON (names, demographics, control)
  └─ Municipality GeoJSON (validation reference)

Processing Pipeline:
  ├─ Phase 1: Extract & Validate
  │   ├─ Parse SVG paths
  │   ├─ Transform coordinates (SVG → lat/lng)
  │   └─ Validate geometry quality
  │
  ├─ Phase 2: Gap Resolution
  │   ├─ Point fallbacks for invalid geometries
  │   ├─ Voronoi tessellation (if needed)
  │   └─ Quality flagging
  │
  ├─ Phase 3: GeoJSON Construction
  │   ├─ Build FeatureCollection
  │   ├─ Attach metadata properties
  │   └─ Validate output
  │
  └─ Phase 4: Integration
      ├─ Update map rendering
      └─ Test with simulation

Output:
  └─ settlements.geojson (complete GeoJSON with all 6K+ settlements)
```

## Quick Start

### 1. Prepare Your Data

Ensure you have:
- [ ] Settlement metadata JSON (names, demographics, municipality assignments)
- [ ] Settlement SVG file (boundary paths)
- [ ] Municipality GeoJSON (for validation)

### 2. Configure the System

Edit `extract_validate_settlements.py`:

```python
# Update these paths
svg_path = Path('/path/to/settlements.svg')
metadata_path = Path('/path/to/settlements_metadata.json')
output_path = Path('/path/to/validation_report.json')
```

Edit `utils/coordinate_transform.py`:

```python
# Set your SVG dimensions and geographic bounds
transformer = CoordinateTransformer(
    svg_width=1000,     # Your SVG width
    svg_height=800,     # Your SVG height
    bbox={
        'min_lat': 42.5,
        'max_lat': 45.3,
        'min_lng': 15.7,
        'max_lng': 19.6
    }
)
```

### 3. Customize SVG Parser

Update `extract_settlements_from_svg()` to match your SVG structure. See `CONFIGURATION_GUIDE.md` for examples.

### 4. Run Validation

```bash
python3 extract_validate_settlements.py
```

### 5. Review Results

Check `validation_report.json`:
- Overall success rate
- Specific geometry issues
- Settlement-by-settlement status

### 6. Proceed Based on Results

**≥80% success**: Continue to GeoJSON generation with point fallbacks
**50-80% success**: Consider Voronoi tessellation or investigate issues
**<50% success**: Debug SVG extraction and coordinate transformation

## File Structure

```
/home/claude/
├── README.md                          (This file)
├── CONFIGURATION_GUIDE.md             (Detailed setup instructions)
│
├── extract_validate_settlements.py    (Main validation script)
│
├── utils/
│   ├── coordinate_transform.py        (SVG ↔ lat/lng conversion)
│   ├── geometry_validation.py         (Polygon quality checks)
│   └── geojson_helpers.py             (GeoJSON utilities - to be created)
│
└── outputs/
    ├── validation_report.json         (Validation results)
    └── settlements.geojson            (Final output - after Phase 3)
```

## Current Status: Phase 1

✓ **Completed**:
- Extraction framework
- Coordinate transformation utilities  
- Geometry validation system
- Quality assessment reporting

⏳ **Next Steps**:
1. Configure for your specific data files
2. Run initial validation
3. Review validation report
4. Proceed to Phase 2 (Gap Resolution)

## Key Design Decisions

### 1. Coordinate System
- **Input**: SVG coordinates (pixels, Y-axis down)
- **Output**: WGS84 (degrees, Y-axis up)
- **Transformation**: Configurable bounds, automatic Y-inversion

### 2. Geometry Validation
- Minimum 4 points (GeoJSON requirement)
- Closed polygon check (auto-fixable)
- Self-intersection detection
- Winding order validation (prefer CCW)
- Bounds checking

### 3. Fallback Strategy
**Priority order**:
1. Use valid polygon from SVG (if available)
2. Point geometry from centroid (if polygon invalid)
3. Voronoi tessellation (if clustering needed)
4. Manual review flag (last resort)

### 4. Quality Transparency
Every feature includes `geometry_source` property:
- `"svg"` - Valid polygon from SVG
- `"point"` - Centroid fallback
- `"voronoi"` - Generated tessellation
- `"manual"` - Requires human review

## Validation Criteria

### Valid Polygon Requirements
✓ At least 4 coordinate points
✓ First point equals last point (closed)
✓ No consecutive duplicate points
✓ No self-intersections
✓ Falls within Bosnia bounds
✓ Non-zero area

### Automatic Fixes
- Unclosed polygons → Add closing point
- Clockwise winding → Reverse to CCW
- Out-of-spec precision → Round coordinates

### Cannot Auto-Fix
- Self-intersecting paths
- Insufficient points
- Completely invalid path data
→ These use point fallbacks

## Output Format

### GeoJSON Structure
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[lng, lat], [lng, lat], ...]]
      },
      "properties": {
        "settlement_id": "settlement_001",
        "name": "Sarajevo",
        "municipality_id": "muni_071",
        "population_1991": {
          "total": 49497,
          "serb": 7788,
          "bosniak": 28500,
          "croat": 9876,
          "other": 3333
        },
        "centroid": [18.4131, 43.8564],
        "geometry_source": "svg",
        "brigade_id": "arbih_001",
        "initial_control": "ARBiH"
      }
    }
  ]
}
```

### Properties Preserved
All metadata from original settlement data:
- Demographics (1991 census)
- Military assignments (brigade, corps)
- Political control
- Geographic references
- Simulation state

## Performance Characteristics

**Validation Speed** (6,000 settlements):
- SVG parsing: ~10 seconds
- Coordinate transformation: ~5 seconds
- Basic validation: ~20 seconds
- Self-intersection check: ~60 seconds
- **Total**: ~2 minutes

**Output Size**:
- ~6,000 features
- ~50-100 KB per settlement (with boundaries)
- **Total**: 300-600 MB uncompressed
- Can simplify coordinates if too large

## Integration with AWWV Simulation

### Map Rendering
Replace current SVG rendering with:
```javascript
// Load GeoJSON
fetch('settlements.geojson')
  .then(r => r.json())
  .then(data => {
    L.geoJSON(data, {
      style: feature => ({
        fillColor: getControlColor(feature.properties.initial_control),
        weight: 1,
        opacity: 1,
        fillOpacity: 0.7
      }),
      onEachFeature: (feature, layer) => {
        layer.bindPopup(`
          <strong>${feature.properties.name}</strong><br>
          Population: ${feature.properties.population_1991.total}<br>
          Control: ${feature.properties.initial_control}
        `);
      }
    }).addTo(map);
  });
```

### State Management
Settlement control/exhaustion still tracked by `settlement_id`:
```javascript
// Existing code works unchanged
gameState.settlements[settlementId].control = 'VRS';
gameState.settlements[settlementId].exhaustion = 0.45;

// Update map colors
updateSettlementColor(settlementId, gameState);
```

### Performance
GeoJSON rendering is well-optimized in Leaflet/Mapbox:
- Vector tiles for large datasets
- Clustering for dense areas
- Selective rendering based on zoom level

## Next Phase Preview

### Phase 2: Gap Resolution Script
Will create `generate_fallback_geometries.py`:
- Read validation report
- Generate point geometries for invalid settlements
- Optional: Voronoi tessellation for clusters
- Output: Enhanced GeoJSON with fallbacks

### Phase 3: GeoJSON Builder
Will create `build_settlement_geojson.py`:
- Combine valid polygons + fallbacks
- Attach all metadata properties
- Validate complete output
- Generate final `settlements.geojson`

### Phase 4: Integration
Will create `update_map_rendering.js`:
- Replace SVG rendering code
- Add GeoJSON layer handling
- Update interaction handlers
- Test with all scenarios

## Troubleshooting

### Issue: No settlements extracted
**Cause**: SVG structure doesn't match parser
**Fix**: Update `extract_settlements_from_svg()` to match your SVG format

### Issue: All coordinates wrong
**Cause**: Incorrect SVG dimensions or bbox
**Fix**: Verify `svg_width`, `svg_height`, and geographic `bbox` in config

### Issue: High invalid rate
**Cause**: SVG paths malformed or transformation issues
**Fix**: 
1. Check validation report for specific issues
2. Inspect a few settlements manually in SVG
3. Verify coordinate transformation is correct
4. May need to adjust tolerance values

### Issue: Script runs slow
**Cause**: Self-intersection check is O(n²)
**Fix**: Can disable in initial runs, or reduce settlement count for testing

## Documentation Files

- `README.md` - This overview document
- `CONFIGURATION_GUIDE.md` - Detailed setup and customization
- `API_REFERENCE.md` - Function documentation (to be created)
- `IMPLEMENTATION_ROADMAP.md` - Next phases (to be created)

## Support

For questions about:
- **SVG structure**: Share a sample of your SVG file
- **Coordinate issues**: Check validation report for specific settlements
- **Integration**: Review Phase 4 plan once Phases 1-3 complete

## License

Part of the AWWV (A War Without Victory) educational simulation project.
