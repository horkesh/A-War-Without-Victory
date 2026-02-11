# Settlement GeoJSON Extraction - Configuration Guide

## Overview

This toolset extracts settlement geometries from SVG files and validates them for conversion to proper GeoJSON format. The process handles coordinate transformation, geometry validation, and quality assessment.

## Required Input Files

### 1. Settlement Metadata JSON
**Path**: Configure in `extract_validate_settlements.py`
**Format**:
```json
{
  "settlement_001": {
    "name": "Sarajevo",
    "municipality_id": "muni_071",
    "population_1991": {
      "total": 49497,
      "serb": 7788,
      "bosniak": 28500,
      "croat": 9876,
      "other": 3333
    },
    "centroid": {
      "lat": 43.8564,
      "lng": 18.4131
    }
  },
  "settlement_002": {
    ...
  }
}
```

**Required fields**:
- `name`: Settlement name (string)
- `municipality_id`: Parent municipality identifier (string)
- `population_1991`: Census data object
- `centroid`: Fallback coordinates if geometry invalid

**Optional fields**:
- `brigade_id`: Military unit assignment
- `control`: Initial faction control
- Any other simulation metadata

### 2. Settlement SVG File
**Path**: Configure in `extract_validate_settlements.py`
**Format**: SVG file with settlement boundary paths

**Expected structure** (adjust parser based on your actual format):
```xml
<svg>
  <g id="settlements">
    <path id="settlement_001" d="M 100,200 L 150,200 L 150,250 L 100,250 Z"/>
    <path id="settlement_002" d="M 200,300 L ..."/>
  </g>
</svg>
```

**Alternative structure** (if using separate SVG per settlement):
```
settlements/
  settlement_001.svg
  settlement_002.svg
  ...
```

### 3. Municipality GeoJSON (Optional)
**Path**: Used for validation
**Format**: Standard GeoJSON FeatureCollection
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[lng, lat], ...]]
      },
      "properties": {
        "municipality_id": "muni_071",
        "name": "Centar Sarajevo"
      }
    }
  ]
}
```

## Configuration Parameters

### SVG Coordinate Space
Update in `coordinate_transform.py`:

```python
transformer = CoordinateTransformer(
    svg_width=1000,    # Width of your SVG canvas
    svg_height=800,    # Height of your SVG canvas
    bbox={
        'min_lat': 42.5,   # Southern Bosnia boundary
        'max_lat': 45.3,   # Northern Bosnia boundary
        'min_lng': 15.7,   # Western Bosnia boundary
        'max_lng': 19.6    # Eastern Bosnia boundary
    }
)
```

**Finding your SVG dimensions**:
1. Open SVG in text editor
2. Look for `<svg width="..." height="...">`
3. Or check viewBox: `viewBox="0 0 1000 800"` (width=1000, height=800)

**Finding your geographic bounds**:
1. Use your municipality GeoJSON bounds
2. Or check min/max of all settlement centroids
3. Add 5% padding for safety

### Validation Tolerances
Update in `geometry_validation.py`:

```python
# Coordinate equality tolerance (degrees)
CLOSURE_TOLERANCE = 1e-8  # ~1mm at equator

# Duplicate point detection
DUPLICATE_TOLERANCE = 1e-8

# Minimum points for valid polygon
MINIMUM_POINTS = 4  # GeoJSON requirement
```

## Running the Extraction

### Step 1: Update File Paths
Edit `extract_validate_settlements.py`:

```python
def main():
    # Update these to match your files
    svg_path = Path('/path/to/your/settlements.svg')
    metadata_path = Path('/path/to/your/settlements_metadata.json')
    output_path = Path('/path/to/validation_report.json')
```

### Step 2: Customize SVG Parser
The script includes a placeholder `extract_settlements_from_svg()` function. Update it based on your SVG structure.

**Example for id-based paths**:
```python
from xml.etree import ElementTree as ET

def extract_settlements_from_svg(svg_path: Path) -> Dict:
    tree = ET.parse(svg_path)
    root = tree.getroot()
    
    # Define SVG namespace
    ns = {'svg': 'http://www.w3.org/2000/svg'}
    
    settlements = {}
    for path in root.findall('.//svg:path', ns):
        settlement_id = path.get('id')
        path_data = path.get('d')
        
        if settlement_id and path_data:
            settlements[settlement_id] = {
                'path': path_data,
                'name': settlement_id  # Or parse from data-name attribute
            }
    
    return settlements
```

**Example for class-based paths**:
```python
def extract_settlements_from_svg(svg_path: Path) -> Dict:
    tree = ET.parse(svg_path)
    root = tree.getroot()
    
    ns = {'svg': 'http://www.w3.org/2000/svg'}
    
    settlements = {}
    for path in root.findall('.//svg:path[@class="settlement"]', ns):
        settlement_id = path.get('data-id')
        path_data = path.get('d')
        
        settlements[settlement_id] = {
            'path': path_data,
            'name': path.get('data-name', settlement_id)
        }
    
    return settlements
```

### Step 3: Run Validation
```bash
cd /home/claude
python3 extract_validate_settlements.py
```

### Step 4: Review Report
Check `validation_report.json`:

```json
{
  "summary": {
    "total_settlements": 6234,
    "valid_polygons": 5123,
    "invalid_polygons": 987,
    "missing_geometry": 124,
    "success_rate": 82.2
  },
  "issue_counts": {
    "Polygon not closed": 456,
    "Self-intersecting polygon": 234,
    "Insufficient points": 297
  },
  "results": [
    {
      "settlement_id": "settlement_001",
      "name": "Sarajevo",
      "status": "valid",
      "issues": [],
      "point_count": 87,
      "centroid": [18.4131, 43.8564]
    },
    ...
  ]
}
```

## Interpreting Results

### Success Rate Thresholds

**≥ 80% valid** ✓ Good quality
- Proceed directly to GeoJSON generation
- Use simple point fallbacks for invalid settlements

**50-80% valid** ⚠ Moderate quality
- Consider Voronoi tessellation for better coverage
- Or investigate SVG extraction issues
- May still use point fallbacks for simplicity

**< 50% valid** ✗ Poor quality
- Investigate SVG source data
- Check coordinate transformation parameters
- May need alternative approach (Voronoi from centroids only)

### Common Issues

**"Polygon not closed"**
- Easy fix: Script can auto-close by duplicating first point
- Usually not a serious problem

**"Self-intersecting polygon"**
- More serious: Indicates bad geometry
- Cannot be auto-fixed
- Use point fallback for these settlements

**"Insufficient points"**
- SVG parsing may have failed
- Check if path data format matches parser expectations
- Use point fallback

**"Missing geometry"**
- Settlement in metadata but not in SVG
- Expected if SVG is incomplete
- Use centroid from metadata as point

## Next Steps After Validation

Based on success rate, proceed to:

1. **Phase 2: Gap Resolution** - Generate fallback geometries
2. **Phase 3: GeoJSON Construction** - Build proper GeoJSON
3. **Phase 4: Integration** - Update map rendering code

See `IMPLEMENTATION_ROADMAP.md` for detailed next steps.

## Troubleshooting

### No settlements extracted from SVG
- Check SVG structure matches parser expectations
- Verify namespace declarations
- Try opening SVG in text editor to inspect structure
- Add debug prints to parser function

### All coordinates out of bounds
- Check SVG dimensions match configuration
- Verify geographic bbox is correct
- May need to adjust coordinate transformation

### High rate of self-intersections
- SVG paths may be malformed
- Check if coordinate order is correct
- May indicate Y-axis inversion issue

### Performance issues
- For 6000+ settlements, validation takes ~1-2 minutes
- Self-intersection check is O(n²) per polygon
- Can disable for initial run if too slow

## File Dependencies

```
/home/claude/
├── extract_validate_settlements.py  (Main script)
├── utils/
│   ├── coordinate_transform.py      (SVG ↔ lat/lng)
│   ├── geometry_validation.py       (Polygon checks)
│   └── geojson_helpers.py          (To be created)
└── validation_report.json          (Output)
```

## Support

If you encounter issues:
1. Check validation report for specific error messages
2. Inspect a few problematic settlements manually
3. Verify SVG structure matches parser expectations
4. Review coordinate transformation parameters

The validation report provides detailed information about each settlement, making it easy to identify patterns in failures.
