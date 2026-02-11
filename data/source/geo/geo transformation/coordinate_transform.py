#!/usr/bin/env python3
"""
Coordinate Transformation Utilities
Handles conversion between SVG coordinates and geographic lat/lng
"""

from typing import List, Tuple, Dict, Optional
import math


class CoordinateTransformer:
    """
    Transform coordinates between SVG space and geographic (WGS84) coordinates
    """
    
    def __init__(self, svg_width: float = 1000, svg_height: float = 800,
                 bbox: Optional[Dict[str, float]] = None):
        """
        Initialize transformer with SVG dimensions and geographic bounds
        
        Args:
            svg_width: Width of SVG canvas in pixels
            svg_height: Height of SVG canvas in pixels
            bbox: Geographic bounding box {min_lat, max_lat, min_lng, max_lng}
        """
        self.svg_width = svg_width
        self.svg_height = svg_height
        
        # Default to Bosnia & Herzegovina bounds
        self.bbox = bbox or {
            'min_lat': 42.5,
            'max_lat': 45.3,
            'min_lng': 15.7,
            'max_lng': 19.6
        }
        
        self.lat_range = self.bbox['max_lat'] - self.bbox['min_lat']
        self.lng_range = self.bbox['max_lng'] - self.bbox['min_lng']
    
    def svg_to_latlng(self, x: float, y: float) -> Tuple[float, float]:
        """
        Convert single SVG coordinate to lat/lng
        
        Args:
            x: SVG x-coordinate
            y: SVG y-coordinate
            
        Returns:
            (longitude, latitude) tuple
        """
        # Normalize to 0-1 range
        norm_x = x / self.svg_width
        norm_y = 1 - (y / self.svg_height)  # Invert Y axis
        
        # Scale to geographic bounds
        lng = self.bbox['min_lng'] + (norm_x * self.lng_range)
        lat = self.bbox['min_lat'] + (norm_y * self.lat_range)
        
        return (lng, lat)
    
    def latlng_to_svg(self, lng: float, lat: float) -> Tuple[float, float]:
        """
        Convert lat/lng to SVG coordinates (for reverse operations)
        
        Args:
            lng: Longitude
            lat: Latitude
            
        Returns:
            (x, y) SVG coordinate tuple
        """
        # Normalize to 0-1 range
        norm_lng = (lng - self.bbox['min_lng']) / self.lng_range
        norm_lat = (lat - self.bbox['min_lat']) / self.lat_range
        
        # Convert to SVG space
        x = norm_lng * self.svg_width
        y = (1 - norm_lat) * self.svg_height  # Invert Y axis
        
        return (x, y)
    
    def transform_coordinates(self, coords: List[Tuple[float, float]], 
                            to_latlng: bool = True) -> List[Tuple[float, float]]:
        """
        Transform a list of coordinates
        
        Args:
            coords: List of (x,y) or (lng,lat) tuples
            to_latlng: If True, convert SVG->lat/lng; if False, convert lat/lng->SVG
            
        Returns:
            List of transformed coordinates
        """
        if to_latlng:
            return [self.svg_to_latlng(x, y) for x, y in coords]
        else:
            return [self.latlng_to_svg(lng, lat) for lng, lat in coords]
    
    def get_bounds_info(self) -> Dict:
        """Return information about current coordinate bounds"""
        return {
            'svg': {
                'width': self.svg_width,
                'height': self.svg_height
            },
            'geographic': self.bbox,
            'aspect_ratio_svg': self.svg_width / self.svg_height,
            'aspect_ratio_geo': self.lng_range / self.lat_range
        }


class BoundsCalculator:
    """Calculate geographic bounds from coordinate sets"""
    
    @staticmethod
    def calculate_bbox(coords: List[Tuple[float, float]]) -> Dict[str, float]:
        """
        Calculate bounding box from coordinate list
        
        Args:
            coords: List of (lng, lat) tuples
            
        Returns:
            Dict with min_lng, max_lng, min_lat, max_lat
        """
        if not coords:
            return {
                'min_lng': 0, 'max_lng': 0,
                'min_lat': 0, 'max_lat': 0
            }
        
        lngs = [c[0] for c in coords]
        lats = [c[1] for c in coords]
        
        return {
            'min_lng': min(lngs),
            'max_lng': max(lngs),
            'min_lat': min(lats),
            'max_lat': max(lats)
        }
    
    @staticmethod
    def expand_bbox(bbox: Dict[str, float], 
                    padding_percent: float = 5.0) -> Dict[str, float]:
        """
        Expand bounding box by a percentage
        
        Args:
            bbox: Bounding box dict
            padding_percent: Percentage to expand (default 5%)
            
        Returns:
            Expanded bounding box
        """
        lng_range = bbox['max_lng'] - bbox['min_lng']
        lat_range = bbox['max_lat'] - bbox['min_lat']
        
        lng_padding = lng_range * (padding_percent / 100)
        lat_padding = lat_range * (padding_percent / 100)
        
        return {
            'min_lng': bbox['min_lng'] - lng_padding,
            'max_lng': bbox['max_lng'] + lng_padding,
            'min_lat': bbox['min_lat'] - lat_padding,
            'max_lat': bbox['max_lat'] + lat_padding
        }


def haversine_distance(coord1: Tuple[float, float], 
                      coord2: Tuple[float, float]) -> float:
    """
    Calculate distance between two lat/lng points in kilometers
    
    Args:
        coord1: (lng, lat) tuple
        coord2: (lng, lat) tuple
        
    Returns:
        Distance in kilometers
    """
    lng1, lat1 = coord1
    lng2, lat2 = coord2
    
    # Convert to radians
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    
    # Haversine formula
    a = (math.sin(dlat / 2) ** 2 + 
         math.cos(lat1_rad) * math.cos(lat2_rad) * 
         math.sin(dlng / 2) ** 2)
    c = 2 * math.asin(math.sqrt(a))
    
    # Earth radius in kilometers
    r = 6371
    
    return c * r


def simplify_coordinates(coords: List[Tuple[float, float]], 
                        tolerance: float = 0.0001) -> List[Tuple[float, float]]:
    """
    Simplify coordinate list using Douglas-Peucker algorithm
    
    Args:
        coords: List of (lng, lat) tuples
        tolerance: Distance tolerance in degrees (~10m at 45°N)
        
    Returns:
        Simplified coordinate list
    """
    if len(coords) < 3:
        return coords
    
    def perpendicular_distance(point: Tuple[float, float], 
                              line_start: Tuple[float, float],
                              line_end: Tuple[float, float]) -> float:
        """Calculate perpendicular distance from point to line"""
        x0, y0 = point
        x1, y1 = line_start
        x2, y2 = line_end
        
        if x1 == x2 and y1 == y2:
            return math.sqrt((x0 - x1)**2 + (y0 - y1)**2)
        
        num = abs((y2 - y1) * x0 - (x2 - x1) * y0 + x2 * y1 - y2 * x1)
        den = math.sqrt((y2 - y1)**2 + (x2 - x1)**2)
        
        return num / den
    
    def douglas_peucker(points: List[Tuple[float, float]], 
                       tol: float) -> List[Tuple[float, float]]:
        """Recursive Douglas-Peucker implementation"""
        if len(points) < 3:
            return points
        
        # Find point with maximum distance from line
        max_dist = 0
        max_index = 0
        
        for i in range(1, len(points) - 1):
            dist = perpendicular_distance(points[i], points[0], points[-1])
            if dist > max_dist:
                max_dist = dist
                max_index = i
        
        # If max distance is greater than tolerance, recursively simplify
        if max_dist > tol:
            left = douglas_peucker(points[:max_index + 1], tol)
            right = douglas_peucker(points[max_index:], tol)
            
            # Combine results (avoiding duplicate at join point)
            return left[:-1] + right
        else:
            return [points[0], points[-1]]
    
    return douglas_peucker(coords, tolerance)


if __name__ == '__main__':
    # Example usage
    transformer = CoordinateTransformer()
    
    print("Coordinate Transformer Example")
    print("=" * 60)
    print(f"SVG dimensions: {transformer.svg_width} x {transformer.svg_height}")
    print(f"Geographic bounds: {transformer.bbox}")
    print()
    
    # Test transformation
    svg_point = (500, 400)  # Center of SVG
    lat, lng = transformer.svg_to_latlng(*svg_point)
    print(f"SVG center {svg_point} -> Geographic ({lng:.4f}, {lat:.4f})")
    
    # Test reverse
    svg_back = transformer.latlng_to_svg(lng, lat)
    print(f"Back to SVG: ({svg_back[0]:.1f}, {svg_back[1]:.1f})")
    print()
    
    # Test distance calculation
    sarajevo = (18.4131, 43.8564)
    banja_luka = (17.1910, 44.7722)
    dist = haversine_distance(sarajevo, banja_luka)
    print(f"Distance Sarajevo to Banja Luka: {dist:.1f} km")
