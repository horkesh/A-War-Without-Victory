#!/usr/bin/env python3
"""
Settlement SVG Extraction and Validation Script
Extracts geometry from SVG paths and validates quality for GeoJSON conversion
"""

import json
import re
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass, asdict
import sys


@dataclass
class ValidationResult:
    """Results of validating a single settlement geometry"""
    settlement_id: str
    name: str
    municipality_id: str
    status: str  # 'valid', 'invalid', 'missing'
    issues: List[str]
    point_count: int
    has_closure: bool
    has_self_intersection: bool
    centroid: Optional[Tuple[float, float]]


@dataclass
class ExtractionReport:
    """Overall report of extraction process"""
    total_settlements: int
    valid_polygons: int
    invalid_polygons: int
    missing_geometry: int
    validation_results: List[ValidationResult]
    
    def success_rate(self) -> float:
        if self.total_settlements == 0:
            return 0.0
        return (self.valid_polygons / self.total_settlements) * 100


class SVGPathParser:
    """Parse SVG path data into coordinate sequences"""
    
    @staticmethod
    def parse_path_data(path_string: str) -> List[Tuple[float, float]]:
        """
        Extract coordinate pairs from SVG path data
        Handles M, L, and Z commands (absolute coordinates)
        """
        if not path_string:
            return []
        
        coordinates = []
        
        # Remove all command letters except M, L (we'll handle them separately)
        # Keep Z for closure detection
        cleaned = path_string.strip()
        
        # Split into commands
        # Match patterns like: M x,y L x,y x,y Z
        parts = re.split(r'([MLZ])', cleaned)
        parts = [p.strip() for p in parts if p.strip()]
        
        current_command = None
        for part in parts:
            if part in ['M', 'L', 'Z']:
                current_command = part
                continue
            
            if current_command in ['M', 'L']:
                # Parse coordinate pairs
                coord_pairs = part.replace(',', ' ').split()
                for i in range(0, len(coord_pairs) - 1, 2):
                    try:
                        x = float(coord_pairs[i])
                        y = float(coord_pairs[i + 1])
                        coordinates.append((x, y))
                    except (ValueError, IndexError):
                        continue
        
        return coordinates
    
    @staticmethod
    def coordinates_to_latlng(coords: List[Tuple[float, float]], 
                             svg_width: float = 1000, 
                             svg_height: float = 800,
                             bbox: Dict = None) -> List[Tuple[float, float]]:
        """
        Convert SVG coordinates to lat/lng
        
        Assumes SVG coordinate system needs to be:
        1. Inverted on Y axis (SVG Y increases downward)
        2. Scaled to geographic bounds
        3. Translated to proper Bosnia bounds
        
        Default Bosnia bounds: approximately 42.5°N to 45.3°N, 15.7°E to 19.6°E
        """
        if not coords:
            return []
        
        # Default Bosnia bounding box
        if bbox is None:
            bbox = {
                'min_lat': 42.5,
                'max_lat': 45.3,
                'min_lng': 15.7,
                'max_lng': 19.6
            }
        
        lat_range = bbox['max_lat'] - bbox['min_lat']
        lng_range = bbox['max_lng'] - bbox['min_lng']
        
        latlng_coords = []
        for x, y in coords:
            # Normalize to 0-1 range
            norm_x = x / svg_width
            norm_y = 1 - (y / svg_height)  # Invert Y
            
            # Scale to geographic bounds
            lng = bbox['min_lng'] + (norm_x * lng_range)
            lat = bbox['min_lat'] + (norm_y * lat_range)
            
            latlng_coords.append((lng, lat))
        
        return latlng_coords


class GeometryValidator:
    """Validate polygon geometry"""
    
    @staticmethod
    def is_closed(coords: List[Tuple[float, float]], tolerance: float = 0.0001) -> bool:
        """Check if polygon is closed (first point ≈ last point)"""
        if len(coords) < 3:
            return False
        
        first = coords[0]
        last = coords[-1]
        
        dist = ((first[0] - last[0])**2 + (first[1] - last[1])**2)**0.5
        return dist < tolerance
    
    @staticmethod
    def has_self_intersection(coords: List[Tuple[float, float]]) -> bool:
        """
        Simple self-intersection check using line segment intersection
        Note: This is O(n²) but should be fine for settlement polygons
        """
        if len(coords) < 4:
            return False
        
        def ccw(A, B, C):
            return (C[1] - A[1]) * (B[0] - A[0]) > (B[1] - A[1]) * (C[0] - A[0])
        
        def segments_intersect(A, B, C, D):
            return ccw(A, C, D) != ccw(B, C, D) and ccw(A, B, C) != ccw(A, B, D)
        
        n = len(coords)
        for i in range(n - 1):
            for j in range(i + 2, n - 1):
                # Don't check adjacent segments
                if j == i + 1 or (i == 0 and j == n - 2):
                    continue
                
                if segments_intersect(coords[i], coords[i+1], coords[j], coords[j+1]):
                    return True
        
        return False
    
    @staticmethod
    def calculate_centroid(coords: List[Tuple[float, float]]) -> Optional[Tuple[float, float]]:
        """Calculate polygon centroid using simple average"""
        if not coords:
            return None
        
        lng_sum = sum(c[0] for c in coords)
        lat_sum = sum(c[1] for c in coords)
        n = len(coords)
        
        return (lng_sum / n, lat_sum / n)
    
    @staticmethod
    def validate_polygon(coords: List[Tuple[float, float]]) -> Tuple[bool, List[str]]:
        """
        Validate polygon geometry
        Returns (is_valid, list_of_issues)
        """
        issues = []
        
        if len(coords) < 3:
            issues.append(f"Insufficient points: {len(coords)} (need at least 3)")
            return False, issues
        
        if not GeometryValidator.is_closed(coords):
            issues.append("Polygon not closed (first != last point)")
        
        if GeometryValidator.has_self_intersection(coords):
            issues.append("Self-intersecting polygon detected")
        
        # Check for degenerate (zero-area) polygons
        if len(set(coords)) < 3:
            issues.append("Degenerate polygon (duplicate points)")
        
        is_valid = len(issues) == 0
        return is_valid, issues


def extract_settlements_from_svg(svg_path: Path) -> Dict:
    """
    Extract settlement data from SVG file
    Expected format: SVG with path elements containing settlement boundaries
    """
    # This is a placeholder - you'll need to provide the actual SVG structure
    # For now, returning empty dict to show where this fits
    print(f"Note: SVG parsing requires your actual SVG file structure")
    print(f"Looking for: {svg_path}")
    
    if not svg_path.exists():
        print(f"Warning: SVG file not found at {svg_path}")
        return {}
    
    # TODO: Implement actual SVG parsing based on your file structure
    # Should return: { settlement_id: { 'path': '...', 'name': '...', 'municipality': '...' } }
    return {}


def load_settlement_metadata(metadata_path: Path) -> Dict:
    """Load settlement metadata (names, IDs, municipalities, etc.)"""
    if not metadata_path.exists():
        print(f"Warning: Metadata file not found at {metadata_path}")
        return {}
    
    with open(metadata_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def validate_all_settlements(settlements_data: Dict, 
                            metadata: Dict,
                            svg_width: float = 1000,
                            svg_height: float = 800) -> ExtractionReport:
    """
    Validate all settlement geometries
    
    Args:
        settlements_data: Dict of settlement_id -> svg_path_data
        metadata: Dict of settlement_id -> metadata (name, municipality, etc.)
    """
    parser = SVGPathParser()
    validator = GeometryValidator()
    
    results = []
    valid_count = 0
    invalid_count = 0
    missing_count = 0
    
    # Process each settlement from metadata
    for settlement_id, meta in metadata.items():
        name = meta.get('name', settlement_id)
        municipality_id = meta.get('municipality_id', 'unknown')
        
        # Check if we have SVG geometry for this settlement
        if settlement_id not in settlements_data:
            results.append(ValidationResult(
                settlement_id=settlement_id,
                name=name,
                municipality_id=municipality_id,
                status='missing',
                issues=['No SVG geometry found'],
                point_count=0,
                has_closure=False,
                has_self_intersection=False,
                centroid=None
            ))
            missing_count += 1
            continue
        
        # Parse SVG path
        svg_path = settlements_data[settlement_id].get('path', '')
        svg_coords = parser.parse_path_data(svg_path)
        
        if not svg_coords:
            results.append(ValidationResult(
                settlement_id=settlement_id,
                name=name,
                municipality_id=municipality_id,
                status='invalid',
                issues=['Failed to parse SVG path data'],
                point_count=0,
                has_closure=False,
                has_self_intersection=False,
                centroid=None
            ))
            invalid_count += 1
            continue
        
        # Convert to lat/lng
        latlng_coords = parser.coordinates_to_latlng(svg_coords, svg_width, svg_height)
        
        # Validate geometry
        is_valid, issues = validator.validate_polygon(latlng_coords)
        centroid = validator.calculate_centroid(latlng_coords)
        
        results.append(ValidationResult(
            settlement_id=settlement_id,
            name=name,
            municipality_id=municipality_id,
            status='valid' if is_valid else 'invalid',
            issues=issues,
            point_count=len(latlng_coords),
            has_closure=validator.is_closed(latlng_coords),
            has_self_intersection=validator.has_self_intersection(latlng_coords),
            centroid=centroid
        ))
        
        if is_valid:
            valid_count += 1
        else:
            invalid_count += 1
    
    return ExtractionReport(
        total_settlements=len(metadata),
        valid_polygons=valid_count,
        invalid_polygons=invalid_count,
        missing_geometry=missing_count,
        validation_results=results
    )


def print_report(report: ExtractionReport, output_path: Optional[Path] = None):
    """Print validation report to console and optionally save to JSON"""
    
    print("\n" + "="*80)
    print("SETTLEMENT GEOMETRY VALIDATION REPORT")
    print("="*80)
    print(f"\nTotal Settlements: {report.total_settlements}")
    print(f"Valid Polygons:    {report.valid_polygons} ({report.success_rate():.1f}%)")
    print(f"Invalid Polygons:  {report.invalid_polygons}")
    print(f"Missing Geometry:  {report.missing_geometry}")
    
    # Group issues by type
    issue_counts = {}
    for result in report.validation_results:
        for issue in result.issues:
            issue_counts[issue] = issue_counts.get(issue, 0) + 1
    
    if issue_counts:
        print("\n" + "-"*80)
        print("ISSUE BREAKDOWN")
        print("-"*80)
        for issue, count in sorted(issue_counts.items(), key=lambda x: -x[1]):
            print(f"  {count:4d}  {issue}")
    
    # Show sample of problematic settlements
    invalid_results = [r for r in report.validation_results if r.status == 'invalid']
    if invalid_results:
        print("\n" + "-"*80)
        print("SAMPLE INVALID SETTLEMENTS (first 10)")
        print("-"*80)
        for result in invalid_results[:10]:
            print(f"\n  {result.settlement_id} - {result.name}")
            print(f"    Municipality: {result.municipality_id}")
            print(f"    Points: {result.point_count}")
            for issue in result.issues:
                print(f"    - {issue}")
    
    # Save full report to JSON
    if output_path:
        report_dict = {
            'summary': {
                'total_settlements': report.total_settlements,
                'valid_polygons': report.valid_polygons,
                'invalid_polygons': report.invalid_polygons,
                'missing_geometry': report.missing_geometry,
                'success_rate': report.success_rate()
            },
            'issue_counts': issue_counts,
            'results': [asdict(r) for r in report.validation_results]
        }
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(report_dict, f, indent=2, ensure_ascii=False)
        
        print(f"\n\nFull report saved to: {output_path}")
    
    print("\n" + "="*80 + "\n")


def main():
    """Main execution function"""
    
    # TODO: Update these paths to match your actual file locations
    svg_path = Path('/mnt/user-data/uploads/settlements.svg')  # Your SVG file
    metadata_path = Path('/mnt/user-data/uploads/settlements_metadata.json')  # Your metadata
    output_path = Path('/home/claude/validation_report.json')
    
    print("Settlement Geometry Extraction & Validation")
    print("=" * 80)
    
    # Step 1: Load data
    print("\n1. Loading settlement data...")
    settlements_svg = extract_settlements_from_svg(svg_path)
    metadata = load_settlement_metadata(metadata_path)
    
    print(f"   Found metadata for {len(metadata)} settlements")
    print(f"   Found SVG data for {len(settlements_svg)} settlements")
    
    if not metadata:
        print("\n⚠️  No metadata loaded. Please provide:")
        print("   - Settlement metadata JSON file")
        print("   - Expected format: { settlement_id: { name, municipality_id, ... } }")
        return
    
    # Step 2: Validate geometries
    print("\n2. Validating geometries...")
    report = validate_all_settlements(settlements_svg, metadata)
    
    # Step 3: Print report
    print_report(report, output_path)
    
    # Step 4: Recommendations
    print("\nRECOMMENDATIONS")
    print("="*80)
    
    success_rate = report.success_rate()
    
    if success_rate >= 80:
        print("✓ Good geometry quality - proceed with GeoJSON conversion")
        print("  Use point fallbacks for invalid/missing settlements")
    elif success_rate >= 50:
        print("⚠ Moderate geometry quality")
        print("  Consider Voronoi tessellation for invalid settlements")
        print("  Or use point fallbacks for simplicity")
    else:
        print("✗ Poor geometry quality")
        print("  Recommend investigation of SVG source data")
        print("  May need alternative approach (point-based, municipality subdivision)")
    
    print("\nNEXT STEPS")
    print("="*80)
    print("1. Review validation_report.json for detailed issues")
    print("2. Inspect specific invalid settlements")
    print("3. Decide on fallback strategy based on success rate")
    print("4. Proceed to GeoJSON generation with chosen approach")
    print()


if __name__ == '__main__':
    main()
