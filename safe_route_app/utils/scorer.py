"""
Safety scoring algorithm for RouteGuard.
Calculates safety scores for routes based on crime data and contextual factors.
"""
from datetime import datetime
from ..models import CrimePoint, SafetyZone
import math


class SafetyScorer:
    """
    Calculate safety scores for routes based on multiple factors.
    """
    
    # Risk weights by crime type
    CRIME_WEIGHTS = {
        'theft': 2.0,
        'assault': 4.0,
        'robbery': 3.5,
        'harassment': 3.0,
        'vandalism': 1.0,
        'burglary': 2.0,
        'other': 1.5,
    }
    
    # Time of day multipliers
    TIME_MULTIPLIERS = {
        'morning': 0.7,    # 6 AM - 12 PM (safer)
        'afternoon': 0.8,  # 12 PM - 6 PM
        'evening': 1.2,    # 6 PM - 10 PM (moderate risk)
        'night': 2.0,      # 10 PM - 6 AM (highest risk)
    }
    
    # Search radius for crimes near route (in meters)
    SEARCH_RADIUS = 500
    
    def __init__(self, current_time=None):
        """
        Initialize the scorer with optional time context.
        
        Args:
            current_time: datetime object, defaults to now
        """
        self.current_time = current_time or datetime.now()
        self.time_of_day = self._get_time_of_day()
        self.time_multiplier = self.TIME_MULTIPLIERS[self.time_of_day]
    
    def _get_time_of_day(self):
        """Determine time of day category."""
        hour = self.current_time.hour
        
        if 6 <= hour < 12:
            return 'morning'
        elif 12 <= hour < 18:
            return 'afternoon'
        elif 18 <= hour < 22:
            return 'evening'
        else:
            return 'night'
    
    def calculate_route_score(self, route_coordinates):
        """
        Calculate comprehensive safety score for a route.
        
        Args:
            route_coordinates: List of [lat, lon] pairs
            
        Returns:
            dict with score, risk_factors, and details
        """
        if not route_coordinates or len(route_coordinates) < 2:
            return {
                'score': 50,
                'grade': 'Unknown',
                'risk_level': 'unknown',
                'details': 'Insufficient route data'
            }
        
        # Calculate total route length
        total_length_km = self._calculate_route_length(route_coordinates)
        
        # Find crimes near the route
        crimes_nearby = self._get_crimes_near_route(route_coordinates)
        
        # Find safety zones near the route
        safety_zones_nearby = self._get_safety_zones_near_route(route_coordinates)
        
        # Calculate base risk from crimes
        crime_risk = self._calculate_crime_risk(crimes_nearby, total_length_km)
        
        # Calculate safety bonus from safe zones
        safety_bonus = self._calculate_safety_bonus(safety_zones_nearby, total_length_km)
        
        # Apply time of day multiplier
        adjusted_risk = crime_risk * self.time_multiplier
        
        # Calculate final score (0-100 scale)
        base_score = 100
        final_score = max(0, min(100, base_score - adjusted_risk + safety_bonus))
        
        # Determine grade and risk level
        grade, risk_level = self._get_grade_and_risk(final_score)
        
        return {
            'score': round(final_score, 1),
            'grade': grade,
            'risk_level': risk_level,
            'crime_count': len(crimes_nearby),
            'safety_zone_count': len(safety_zones_nearby),
            'time_of_day': self.time_of_day,
            'distance_km': round(total_length_km, 2),
            'details': self._generate_details(crimes_nearby, safety_zones_nearby, final_score)
        }
    
    def _get_crimes_near_route(self, route_coordinates):
        """Find all crimes within SEARCH_RADIUS of the route using simple distance calculation."""
        crimes_nearby = []
        
        # Get all crimes (in production, you'd want to limit this to a bounding box)
        all_crimes = CrimePoint.objects.all()
        
        for crime in all_crimes:
            # Check if crime is near any point on the route
            for lat, lon in route_coordinates:
                distance = self._haversine_distance(lat, lon, crime.latitude, crime.longitude)
                if distance * 1000 <= self.SEARCH_RADIUS:  # Convert km to meters
                    crimes_nearby.append(crime)
                    break  # Don't count the same crime multiple times
        
        return crimes_nearby
    
    def _get_safety_zones_near_route(self, route_coordinates):
        """Find all safety zones near the route."""
        zones_nearby = []
        
        all_zones = SafetyZone.objects.filter(is_active=True)
        
        for zone in all_zones:
            # Check if zone is near any point on the route
            for lat, lon in route_coordinates:
                distance = self._haversine_distance(lat, lon, zone.latitude, zone.longitude)
                if distance * 1000 <= self.SEARCH_RADIUS:  # Convert km to meters
                    zones_nearby.append(zone)
                    break
        
        return zones_nearby
    
    def _haversine_distance(self, lat1, lon1, lat2, lon2):
        """
        Calculate distance between two points using Haversine formula.
        Returns distance in kilometers.
        """
        R = 6371  # Earth's radius in km
        
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        
        a = (math.sin(dlat / 2) ** 2 +
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
             math.sin(dlon / 2) ** 2)
        
        c = 2 * math.asin(math.sqrt(a))
        return R * c
    
    def _calculate_crime_risk(self, crimes, route_length_km):
        """
        Calculate risk score from crimes.
        
        Formula: Sum of (crime_weight * severity) / route_length
        """
        if route_length_km == 0:
            return 0
        
        total_risk = 0
        for crime in crimes:
            weight = self.CRIME_WEIGHTS.get(crime.crime_type, 1.5)
            severity_multiplier = crime.severity
            total_risk += weight * severity_multiplier
        
        # Normalize by route length (longer routes naturally have more crimes nearby)
        normalized_risk = (total_risk / max(route_length_km, 0.1)) * 5
        
        return normalized_risk
    
    def _calculate_safety_bonus(self, safety_zones, route_length_km):
        """
        Calculate safety bonus from nearby safety zones.
        
        Police stations and hospitals provide safety bonuses.
        """
        if route_length_km == 0:
            return 0
        
        bonus_weights = {
            'police_station': 5,
            'hospital': 3,
            'public_place': 2,
            'well_lit': 2,
            'cctv': 3,
        }
        
        total_bonus = 0
        for zone in safety_zones:
            bonus = bonus_weights.get(zone.zone_type, 1)
            total_bonus += bonus
        
        # Normalize by route length
        normalized_bonus = (total_bonus / max(route_length_km, 0.1)) * 2
        
        return min(normalized_bonus, 15)  # Cap bonus at 15 points
    
    def _calculate_route_length(self, coordinates):
        """Calculate approximate route length in kilometers using Haversine formula."""
        total_distance = 0
        
        for i in range(len(coordinates) - 1):
            lat1, lon1 = coordinates[i]
            lat2, lon2 = coordinates[i + 1]
            
            distance = self._haversine_distance(lat1, lon1, lat2, lon2)
            total_distance += distance
        
        return total_distance
    
    def _get_grade_and_risk(self, score):
        """Convert numeric score to letter grade and risk level."""
        if score >= 85:
            return 'A', 'very_low'
        elif score >= 70:
            return 'B', 'low'
        elif score >= 55:
            return 'C', 'moderate'
        elif score >= 40:
            return 'D', 'high'
        else:
            return 'F', 'very_high'
    
    def _generate_details(self, crimes, safety_zones, score):
        """Generate human-readable details about the route safety."""
        details = []
        
        if score >= 85:
            details.append("This route is very safe with minimal reported incidents.")
        elif score >= 70:
            details.append("This route is generally safe with few concerns.")
        elif score >= 55:
            details.append("This route has moderate safety concerns.")
        elif score >= 40:
            details.append("This route has elevated safety risks.")
        else:
            details.append("This route has significant safety concerns.")
        
        if crimes:
            crime_types = {}
            for crime in crimes:
                crime_types[crime.crime_type] = crime_types.get(crime.crime_type, 0) + 1
            
            crime_summary = ", ".join([f"{count} {ctype}" for ctype, count in crime_types.items()])
            details.append(f"Recent incidents: {crime_summary}")
        
        if safety_zones:
            details.append(f"Route passes near {len(safety_zones)} safety zone(s)")
        
        if self.time_of_day in ['evening', 'night']:
            details.append(f"Traveling during {self.time_of_day} increases risk")
        
        return " | ".join(details)


def calculate_safety_score(route_coordinates, current_time=None):
    """
    Convenience function to calculate safety score.
    
    Args:
        route_coordinates: List of [lat, lon] pairs
        current_time: Optional datetime object
        
    Returns:
        dict with safety score and details
    """
    scorer = SafetyScorer(current_time)
    return scorer.calculate_route_score(route_coordinates)
