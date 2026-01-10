"""
Sample data generator for RouteGuard.
Creates realistic crime data patterns for demonstration purposes.
"""
from datetime import datetime, timedelta
import random
from ..models import CrimePoint, SafetyZone


class SampleDataGenerator:
    """
    Generate realistic sample crime data for any location.
    """
    
    CRIME_TYPES = ['theft', 'assault', 'robbery', 'harassment', 'vandalism', 'burglary', 'other']
    
    # Crime patterns: some areas are naturally safer
    AREA_PATTERNS = {
        'commercial': {'density': 0.7, 'types': ['theft', 'vandalism', 'other']},
        'residential': {'density': 0.4, 'types': ['burglary', 'theft', 'vandalism']},
        'industrial': {'density': 0.5, 'types': ['theft', 'vandalism', 'other']},
        'isolated': {'density': 0.9, 'types': ['assault', 'robbery', 'harassment']},
    }
    
    def __init__(self, center_lat, center_lon, radius_km=5):
        """
        Initialize generator for a specific area.
        
        Args:
            center_lat: Center latitude
            center_lon: Center longitude
            radius_km: Radius to generate data within (km)
        """
        self.center_lat = center_lat
        self.center_lon = center_lon
        self.radius_km = radius_km
    
    def generate_crime_data(self, num_points=100, days_back=90):
        """
        Generate sample crime data points.
        
        Args:
            num_points: Number of crime points to generate
            days_back: How many days back to generate data
            
        Returns:
            List of created CrimePoint objects
        """
        created_points = []
        
        # Delete existing sample data for this area
        self._clear_existing_sample_data()
        
        for _ in range(num_points):
            # Generate random location within radius
            lat, lon = self._random_location_in_radius()
            
            # Determine area type and crime characteristics
            area_type = random.choice(list(self.AREA_PATTERNS.keys()))
            pattern = self.AREA_PATTERNS[area_type]
            
            # Select crime type based on area pattern
            crime_type = random.choice(pattern['types'])
            
            # Generate severity (weighted towards medium)
            severity = random.choices([1, 2, 3, 4], weights=[10, 40, 35, 15])[0]
            
            # Generate random time in the past
            days_ago = random.randint(0, days_back)
            hours_ago = random.randint(0, 23)
            occurred_at = datetime.now() - timedelta(days=days_ago, hours=hours_ago)
            
            # Create crime point
            crime_point = CrimePoint.objects.create(
                latitude=lat,
                longitude=lon,
                crime_type=crime_type,
                severity=severity,
                description=f"Sample {crime_type} incident in {area_type} area",
                occurred_at=occurred_at,
                is_sample_data=True,
                source='auto_generated'
            )
            
            created_points.append(crime_point)
        
        # Generate some safety zones
        self._generate_safety_zones()
        
        return created_points
    
    def _random_location_in_radius(self):
        """
        Generate random lat/lon within radius of center.
        Uses uniform distribution in a circle.
        """
        # Convert km to degrees (approximate)
        radius_deg = self.radius_km / 111.0  # 1 degree ≈ 111 km
        
        # Random angle and distance
        angle = random.uniform(0, 2 * 3.14159)
        distance = random.uniform(0, radius_deg)
        
        # Calculate offset
        lat_offset = distance * random.uniform(-1, 1)
        lon_offset = distance * random.uniform(-1, 1)
        
        lat = self.center_lat + lat_offset
        lon = self.center_lon + lon_offset
        
        return lat, lon
    
    def _generate_safety_zones(self):
        """Generate safety zones (police stations, hospitals, etc.)"""
        safety_zones = [
            {
                'name': 'Central Police Station',
                'zone_type': 'police_station',
                'radius': 800
            },
            {
                'name': 'City Hospital',
                'zone_type': 'hospital',
                'radius': 500
            },
            {
                'name': 'Main Market Area',
                'zone_type': 'public_place',
                'radius': 600
            },
            {
                'name': 'CCTV Monitored Zone',
                'zone_type': 'cctv',
                'radius': 400
            },
        ]
        
        for zone_data in safety_zones:
            lat, lon = self._random_location_in_radius()
            
            SafetyZone.objects.get_or_create(
                name=zone_data['name'],
                defaults={
                    'zone_type': zone_data['zone_type'],
                    'latitude': lat,
                    'longitude': lon,
                    'radius': zone_data['radius'],
                    'is_active': True
                }
            )
    
    def _clear_existing_sample_data(self):
        """Clear existing sample data in the area."""
        # Calculate bounding box
        radius_deg = self.radius_km / 111.0
        
        # Delete sample crime data in the area
        CrimePoint.objects.filter(
            is_sample_data=True,
            latitude__gte=self.center_lat - radius_deg,
            latitude__lte=self.center_lat + radius_deg,
            longitude__gte=self.center_lon - radius_deg,
            longitude__lte=self.center_lon + radius_deg,
        ).delete()


def generate_sample_data_for_location(lat, lon, num_points=100, radius_km=5):
    """
    Convenience function to generate sample data.
    
    Args:
        lat: Center latitude
        lon: Center longitude
        num_points: Number of crime points
        radius_km: Radius in kilometers
        
    Returns:
        dict with generation statistics
    """
    generator = SampleDataGenerator(lat, lon, radius_km)
    created_points = generator.generate_crime_data(num_points)
    
    return {
        'success': True,
        'crimes_created': len(created_points),
        'center': {'lat': lat, 'lon': lon},
        'radius_km': radius_km,
        'message': f'Generated {len(created_points)} sample crime points'
    }
