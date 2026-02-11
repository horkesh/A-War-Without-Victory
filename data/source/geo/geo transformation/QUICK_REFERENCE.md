# Settlement GeoJSON Generation - Quick Reference

## Initial Setup (Do Once)

```bash
# 1. Update file paths
edit extract_validate_settlements.py
  - svg_path = Path('/your/settlements.svg')
  - metadata_path = Path('/your/metadata.json')

# 2. Configure coordinate system  
edit utils/coordinate_transform.py
  - svg_width, svg_height (check your SVG file)
  - bbox (min/max lat/lng for Bosnia)

# 3. Customize SVG parser
edit extract_validate_settlements.py
  - Update extract_settlements_from_svg() function
  - Match your SVG structure (id-based, class-based, etc.)
```

## Running Validation

```bash
# Run the validation script
python3 extract_validate_settlements.py

# Check output
cat validation_report.json | grep "success_rate"
```

## Interpreting Results

```
Success Rate ≥ 80%  → Good! Proceed to Phase 2
Success Rate 50-80% → OK, may need Voronoi
Success Rate < 50%  → Debug SVG extraction
```

## Common Validation Issues

| Issue | Severity | Auto-Fix? | Action |
|-------|----------|-----------|--------|
| "Polygon not closed" | Low | ✓ Yes | Automatic |
| "Clockwise winding" | Low | ✓ Yes | Automatic |
| "Insufficient points" | High | ✗ No | Point fallback |
| "Self-intersecting" | High | ✗ No | Point fallback |
| "Missing geometry" | High | ✗ No | Use centroid |

## Testing Coordinate Transformation

```python
# Quick test in Python
from utils.coordinate_transform import CoordinateTransformer

transformer = CoordinateTransformer(
    svg_width=1000, 
    svg_height=800
)

# Test SVG center → should be near Bosnia center
svg_center = (500, 400)
lng, lat = transformer.svg_to_latlng(*svg_center)
print(f"SVG center maps to: {lat}°N, {lng}°E")
# Expected: ~43.8°N, ~17.7°E (center of Bosnia)

# Test known city (e.g., Sarajevo at 43.856°N, 18.413°E)
sarajevo_svg = transformer.latlng_to_svg(18.413, 43.856)
print(f"Sarajevo SVG coords: {sarajevo_svg}")
```

## Checking a Specific Settlement

```python
# Load validation report
import json

with open('validation_report.json') as f:
    report = json.load(f)

# Find specific settlement
for result in report['results']:
    if result['name'] == 'Sarajevo':
        print(json.dumps(result, indent=2))
        break
```

## Most Common SVG Formats

### Format 1: ID-based paths
```xml
<path id="settlement_001" d="M 100,200 L ..."/>
```
**Parser**:
```python
settlement_id = path.get('id')
path_data = path.get('d')
```

### Format 2: Class + data attributes
```xml
<path class="settlement" data-id="001" data-name="Sarajevo" d="M ..."/>
```
**Parser**:
```python
settlement_id = path.get('data-id')
name = path.get('data-name')
path_data = path.get('d')
```

### Format 3: Grouped by municipality
```xml
<g id="muni_071">
  <path id="settlement_001" d="M ..."/>
  <path id="settlement_002" d="M ..."/>
</g>
```
**Parser**:
```python
for group in root.findall('.//svg:g', ns):
    muni_id = group.get('id')
    for path in group.findall('.//svg:path', ns):
        settlement_id = path.get('id')
```

## File Checklist

Before running validation:
- [ ] Settlement metadata JSON exists
- [ ] SVG file exists and is readable
- [ ] SVG dimensions configured correctly
- [ ] Geographic bbox configured correctly
- [ ] SVG parser customized for your format
- [ ] Output directory writable

## Expected Runtime

| Settlements | Validation Time |
|-------------|----------------|
| 100 | ~1 second |
| 1,000 | ~10 seconds |
| 6,000 | ~2 minutes |
| 10,000 | ~5 minutes |

*Self-intersection checks are O(n²) per polygon*

## Success Indicators

✓ **Good validation run**:
```
Total Settlements: 6234
Valid Polygons:    5123 (82.2%)
Invalid Polygons:  987
Missing Geometry:  124
```

✗ **Problem validation run**:
```
Total Settlements: 6234
Valid Polygons:    234 (3.8%)
Invalid Polygons:  0
Missing Geometry:  6000
```
→ Check SVG parser and file paths

## Quick Debugging

### No settlements found
```bash
# Check SVG file structure
head -50 /path/to/settlements.svg

# Look for path elements
grep "<path" /path/to/settlements.svg | head -5
```

### Wrong coordinates
```python
# Test transformation on known point
from utils.coordinate_transform import CoordinateTransformer

t = CoordinateTransformer()
print(t.get_bounds_info())
# Check if aspect ratios match

# Test known city
sarajevo_svg = (650, 320)  # Example SVG coords
lng, lat = t.svg_to_latlng(*sarajevo_svg)
print(f"({lng:.3f}, {lat:.3f})")
# Should be ~(18.4, 43.8)
```

## Next Steps After Validation

1. **Review validation_report.json**
   - Check success rate
   - Identify common issues
   - Sample invalid settlements

2. **Decide on fallback strategy**
   - High success (≥80%): Point fallbacks
   - Medium success (50-80%): Voronoi option
   - Low success (<50%): Debug first

3. **Proceed to Phase 2**
   - Generate fallback geometries
   - Build complete GeoJSON
   - Integrate with map

## File Locations

```
/home/claude/
├── extract_validate_settlements.py    ← Run this
├── validation_report.json             ← Check this
├── utils/
│   ├── coordinate_transform.py        ← Configure this
│   └── geometry_validation.py
├── README.md                          ← Overview
├── CONFIGURATION_GUIDE.md             ← Detailed setup
└── QUICK_REFERENCE.md                 ← This file
```

## Getting Help

**Issue**: Script errors
→ Check Python imports, verify file paths exist

**Issue**: Wrong coordinates
→ Verify SVG dimensions and bbox configuration

**Issue**: Low success rate
→ Review validation report, check SVG parser

**Issue**: Slow performance
→ Expected for 6K+ settlements (~2 min)

## Contact

Part of AWWV simulation project.
See README.md for architecture overview.
See CONFIGURATION_GUIDE.md for detailed setup.
