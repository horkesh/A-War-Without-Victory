#!/usr/bin/env python3
"""
Geometry Validation Utilities
Comprehensive polygon validation and quality checks
"""

from typing import List, Tuple, Optional, Dict
import math


class PolygonValidator:
    """Validate polygon geometry for GeoJSON compliance"""
    
    @staticmethod
    def is_closed(coords: List[Tuple[float, float]], 
                  tolerance: float = 1e-8) -> bool:
        """
        Check if polygon is closed (first point equals last point)
        
        Args:
            coords: List of (lng, lat) tuples
            tolerance: Distance tolerance for equality check
            
        Returns:
            True if closed, False otherwise
        """
        if len(coords) < 2:
            return False
        
        first = coords[0]
        last = coords[-1]
        
        dist = math.sqrt((first[0] - last[0])**2 + (first[1] - last[1])**2)
        return dist < tolerance
    
    @staticmethod
    def close_polygon(coords: List[Tuple[float, float]]) -> List[Tuple[float, float]]:
        """
        Ensure polygon is closed by adding first point at end if needed
        
        Args:
            coords: List of (lng, lat) tuples
            
        Returns:
            Closed coordinate list
        """
        if not coords:
            return coords
        
        if PolygonValidator.is_closed(coords):
            return coords
        
        return coords + [coords[0]]
    
    @staticmethod
    def has_minimum_points(coords: List[Tuple[float, float]], 
                          minimum: int = 4) -> bool:
        """
        Check if polygon has minimum number of points
        GeoJSON requires at least 4 points (3 unique + closing point)
        
        Args:
            coords: List of coordinates
            minimum: Minimum required points (default 4)
            
        Returns:
            True if meets minimum, False otherwise
        """
        return len(coords) >= minimum
    
    @staticmethod
    def has_duplicate_points(coords: List[Tuple[float, float]], 
                           tolerance: float = 1e-8) -> bool:
        """
        Check for consecutive duplicate points (except closure)
        
        Args:
            coords: List of (lng, lat) tuples
            tolerance: Distance tolerance for duplicate detection
            
        Returns:
            True if duplicates found, False otherwise
        """
        for i in range(len(coords) - 1):
            if i == len(coords) - 2:  # Skip last pair (closure is ok)
                continue
            
            curr = coords[i]
            next_point = coords[i + 1]
            
            dist = math.sqrt((curr[0] - next_point[0])**2 + 
                           (curr[1] - next_point[1])**2)
            
            if dist < tolerance:
                return True
        
        return False
    
    @staticmethod
    def check_winding_order(coords: List[Tuple[float, float]]) -> str:
        """
        Determine winding order of polygon (clockwise or counter-clockwise)
        GeoJSON spec requires counter-clockwise for exterior rings
        
        Args:
            coords: List of (lng, lat) tuples
            
        Returns:
            'cw' for clockwise, 'ccw' for counter-clockwise
        """
        if len(coords) < 3:
            return 'unknown'
        
        # Calculate signed area
        area = 0.0
        for i in range(len(coords) - 1):
            x1, y1 = coords[i]
            x2, y2 = coords[i + 1]
            area += (x2 - x1) * (y2 + y1)
        
        return 'ccw' if area < 0 else 'cw'
    
    @staticmethod
    def reverse_winding(coords: List[Tuple[float, float]]) -> List[Tuple[float, float]]:
        """
        Reverse winding order of polygon
        Preserves first point position, reverses rest
        
        Args:
            coords: List of (lng, lat) tuples
            
        Returns:
            Reversed coordinate list
        """
        if len(coords) < 2:
            return coords
        
        # Keep first point, reverse middle points, keep last if closed
        is_closed = PolygonValidator.is_closed(coords)
        
        if is_closed:
            # [first, ...middle..., first] -> [first, ...reversed_middle..., first]
            return [coords[0]] + coords[-2:0:-1] + [coords[0]]
        else:
            return [coords[0]] + coords[-1:0:-1]
    
    @staticmethod
    def calculate_area(coords: List[Tuple[float, float]]) -> float:
        """
        Calculate polygon area using Shoelace formula
        Returns signed area (negative for clockwise, positive for ccw)
        
        Args:
            coords: List of (lng, lat) tuples
            
        Returns:
            Area in square degrees (approximate)
        """
        if len(coords) < 3:
            return 0.0
        
        area = 0.0
        for i in range(len(coords) - 1):
            x1, y1 = coords[i]
            x2, y2 = coords[i + 1]
            area += x1 * y2 - x2 * y1
        
        return abs(area) / 2.0
    
    @staticmethod
    def has_self_intersection(coords: List[Tuple[float, float]]) -> bool:
        """
        Check for self-intersecting edges using line segment intersection
        
        Args:
            coords: List of (lng, lat) tuples
            
        Returns:
            True if self-intersection detected, False otherwise
        """
        if len(coords) < 4:
            return False
        
        def ccw(A: Tuple[float, float], 
                B: Tuple[float, float], 
                C: Tuple[float, float]) -> bool:
            """Counter-clockwise orientation test"""
            return (C[1] - A[1]) * (B[0] - A[0]) > (B[1] - A[1]) * (C[0] - A[0])
        
        def segments_intersect(A: Tuple[float, float], 
                             B: Tuple[float, float],
                             C: Tuple[float, float], 
                             D: Tuple[float, float]) -> bool:
            """Check if line segments AB and CD intersect"""
            return ccw(A, C, D) != ccw(B, C, D) and ccw(A, B, C) != ccw(A, B, D)
        
        n = len(coords)
        for i in range(n - 1):
            for j in range(i + 2, n - 1):
                # Skip adjacent segments and closure edge
                if j == i + 1:
                    continue
                if i == 0 and j == n - 2:
                    continue
                
                if segments_intersect(coords[i], coords[i + 1], 
                                    coords[j], coords[j + 1]):
                    return True
        
        return False
    
    @staticmethod
    def calculate_centroid(coords: List[Tuple[float, float]]) -> Tuple[float, float]:
        """
        Calculate polygon centroid
        
        Args:
            coords: List of (lng, lat) tuples
            
        Returns:
            (lng, lat) tuple of centroid
        """
        if not coords:
            return (0.0, 0.0)
        
        # Simple arithmetic mean (good enough for small polygons)
        lng_sum = sum(c[0] for c in coords)
        lat_sum = sum(c[1] for c in coords)
        n = len(coords)
        
        return (lng_sum / n, lat_sum / n)
    
    @staticmethod
    def validate(coords: List[Tuple[float, float]], 
                fix_issues: bool = False) -> Dict:
        """
        Comprehensive polygon validation
        
        Args:
            coords: List of (lng, lat) tuples
            fix_issues: If True, attempt to fix common issues
            
        Returns:
            Dict with validation results and optionally fixed coordinates
        """
        result = {
            'is_valid': True,
            'issues': [],
            'warnings': [],
            'fixed_coords': None,
            'properties': {}
        }
        
        working_coords = coords.copy()
        
        # Check minimum points
        if not PolygonValidator.has_minimum_points(working_coords):
            result['is_valid'] = False
            result['issues'].append(
                f'Insufficient points: {len(working_coords)} (need at least 4)'
            )
            return result
        
        # Check and fix closure
        if not PolygonValidator.is_closed(working_coords):
            result['warnings'].append('Polygon not closed')
            if fix_issues:
                working_coords = PolygonValidator.close_polygon(working_coords)
                result['warnings'][-1] += ' (fixed)'
        
        # Check duplicates
        if PolygonValidator.has_duplicate_points(working_coords):
            result['warnings'].append('Consecutive duplicate points detected')
        
        # Check winding order
        winding = PolygonValidator.check_winding_order(working_coords)
        result['properties']['winding_order'] = winding
        
        if winding == 'cw':
            result['warnings'].append('Clockwise winding (GeoJSON prefers CCW)')
            if fix_issues:
                working_coords = PolygonValidator.reverse_winding(working_coords)
                result['warnings'][-1] += ' (fixed)'
        
        # Check self-intersection (expensive, so optional flag later)
        if PolygonValidator.has_self_intersection(working_coords):
            result['is_valid'] = False
            result['issues'].append('Self-intersecting polygon')
        
        # Calculate properties
        result['properties']['area'] = PolygonValidator.calculate_area(working_coords)
        result['properties']['centroid'] = PolygonValidator.calculate_centroid(working_coords)
        result['properties']['point_count'] = len(working_coords)
        
        if fix_issues and result['warnings']:
            result['fixed_coords'] = working_coords
        
        return result


class BoundsChecker:
    """Check if geometries fall within expected bounds"""
    
    def __init__(self, bbox: Dict[str, float]):
        """
        Initialize with bounding box
        
        Args:
            bbox: Dict with min_lat, max_lat, min_lng, max_lng
        """
        self.bbox = bbox
    
    def point_in_bounds(self, point: Tuple[float, float]) -> bool:
        """Check if single point is within bounds"""
        lng, lat = point
        return (self.bbox['min_lng'] <= lng <= self.bbox['max_lng'] and
                self.bbox['min_lat'] <= lat <= self.bbox['max_lat'])
    
    def polygon_in_bounds(self, coords: List[Tuple[float, float]]) -> Dict:
        """
        Check if polygon is within bounds
        
        Returns:
            Dict with: all_in_bounds (bool), points_out_of_bounds (int), 
                      out_of_bounds_points (list)
        """
        out_of_bounds = []
        
        for i, point in enumerate(coords):
            if not self.point_in_bounds(point):
                out_of_bounds.append({
                    'index': i,
                    'point': point
                })
        
        return {
            'all_in_bounds': len(out_of_bounds) == 0,
            'points_out_of_bounds': len(out_of_bounds),
            'out_of_bounds_points': out_of_bounds
        }


if __name__ == '__main__':
    # Example usage
    print("Polygon Validator Examples")
    print("=" * 60)
    
    # Test polygon (simple square)
    square = [
        (0, 0),
        (1, 0),
        (1, 1),
        (0, 1),
        (0, 0)  # Closed
    ]
    
    validator = PolygonValidator()
    result = validator.validate(square)
    
    print(f"Valid: {result['is_valid']}")
    print(f"Issues: {result['issues']}")
    print(f"Warnings: {result['warnings']}")
    print(f"Area: {result['properties']['area']:.4f}")
    print(f"Centroid: {result['properties']['centroid']}")
    print(f"Winding: {result['properties']['winding_order']}")
    print()
    
    # Test unclosed polygon
    unclosed = [(0, 0), (1, 0), (1, 1), (0, 1)]
    result = validator.validate(unclosed, fix_issues=True)
    print(f"Unclosed polygon fixed: {result['fixed_coords'] is not None}")
