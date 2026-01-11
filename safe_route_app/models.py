"""
Database models for RouteGuard application.
"""
from django.db import models
from django.utils import timezone
import random
import uuid


class CrimePoint(models.Model):
    """
    Represents a crime incident with geographic location.
    """
    CRIME_TYPES = [
        ('theft', 'Theft'),
        ('assault', 'Assault'),
        ('robbery', 'Robbery'),
        ('harassment', 'Harassment'),
        ('vandalism', 'Vandalism'),
        ('burglary', 'Burglary'),
        ('other', 'Other'),
    ]
    
    SEVERITY_LEVELS = [
        (1, 'Low'),
        (2, 'Medium'),
        (3, 'High'),
        (4, 'Critical'),
    ]
    
    # Geographic location (latitude, longitude)
    latitude = models.FloatField()
    longitude = models.FloatField()
    
    # Crime details
    crime_type = models.CharField(max_length=50, choices=CRIME_TYPES)
    severity = models.IntegerField(choices=SEVERITY_LEVELS, default=2)
    description = models.TextField(blank=True, null=True)
    
    # Temporal data
    occurred_at = models.DateTimeField()
    reported_at = models.DateTimeField(auto_now_add=True)
    
    # Data source tracking
    is_sample_data = models.BooleanField(default=False)
    source = models.CharField(max_length=100, default='manual')
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-occurred_at']
        indexes = [
            models.Index(fields=['occurred_at']),
            models.Index(fields=['crime_type']),
        ]
    
    def __str__(self):
        return f"{self.crime_type} at {self.location} on {self.occurred_at.date()}"
    
    @property
    def risk_weight(self):
        """
        Calculate risk weight based on crime type and severity.
        Higher weight = more dangerous.
        """
        base_weights = {
            'theft': 2,
            'assault': 4,
            'robbery': 3,
            'harassment': 3,
            'vandalism': 1,
            'burglary': 2,
            'other': 1,
        }
        return base_weights.get(self.crime_type, 1) * self.severity


class SafetyZone(models.Model):
    """
    Represents safe zones like police stations, hospitals, well-lit areas.
    """
    ZONE_TYPES = [
        ('police_station', 'Police Station'),
        ('hospital', 'Hospital'),
        ('public_place', 'Public Place'),
        ('well_lit', 'Well-Lit Area'),
        ('cctv', 'CCTV Coverage'),
    ]
    
    name = models.CharField(max_length=200)
    zone_type = models.CharField(max_length=50, choices=ZONE_TYPES)
    latitude = models.FloatField()
    longitude = models.FloatField()
    radius = models.IntegerField(default=500, help_text='Safety radius in meters')
    
    # Metadata
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.zone_type})"


class RouteHistory(models.Model):
    """
    Store user route searches for analytics and improvement.
    """
    start_latitude = models.FloatField()
    start_longitude = models.FloatField()
    end_latitude = models.FloatField()
    end_longitude = models.FloatField()
    
    # Route details
    selected_route = models.JSONField(help_text='Coordinates of the selected route')
    safety_score = models.FloatField()
    distance_km = models.FloatField()
    duration_minutes = models.FloatField()
    
    # Context
    searched_at = models.DateTimeField(auto_now_add=True)
    time_of_day = models.CharField(max_length=20)  # morning, afternoon, evening, night
    
    class Meta:
        ordering = ['-searched_at']
    
    def __str__(self):
        return f"Route on {self.searched_at.date()} - Score: {self.safety_score}"


# ==========================================
# NEW MODELS FOR HYBRID ARCHITECTURE
# ==========================================

class UserProfile(models.Model):
    """
    Extended user profile linked to Firebase Authentication.
    """
    firebase_uid = models.CharField(max_length=128, unique=True, primary_key=True)
    email = models.EmailField()
    phone = models.CharField(max_length=20)
    full_name = models.CharField(max_length=200)
    profile_picture_url = models.URLField(blank=True, null=True)
    
    # Emergency contacts
    emergency_contact_1_name = models.CharField(max_length=100, blank=True)
    emergency_contact_1_phone = models.CharField(max_length=20, blank=True)
    emergency_contact_2_name = models.CharField(max_length=100, blank=True)
    emergency_contact_2_phone = models.CharField(max_length=20, blank=True)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.full_name} ({self.email})"


class PoliceAuthority(models.Model):
    """
    Police authority profile linked to Firebase Authentication.
    """
    firebase_uid = models.CharField(max_length=128, unique=True, primary_key=True)
    user_profile = models.OneToOneField(UserProfile, on_delete=models.CASCADE, related_name='police_profile')
    badge_number = models.CharField(max_length=50, unique=True)
    station_name = models.CharField(max_length=200)
    rank = models.CharField(max_length=100)
    jurisdiction_area = models.CharField(max_length=200)
    
    # Coordinates for jurisdiction center
    jurisdiction_lat = models.FloatField()
    jurisdiction_lng = models.FloatField()
    jurisdiction_radius = models.IntegerField(default=5000)  # meters
    
    verified_by_admin = models.BooleanField(default=False)
    verified_at = models.DateTimeField(null=True, blank=True)
    
    # Live Duty Status
    is_on_duty = models.BooleanField(default=False)
    current_lat = models.FloatField(null=True, blank=True)
    current_lng = models.FloatField(null=True, blank=True)
    last_updated = models.DateTimeField(auto_now=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.badge_number} - {self.station_name}"


class TravelHistory(models.Model):
    """
    Detailed travel history with route data and safety metrics.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='travels')
    
    # Route info
    start_latitude = models.FloatField()
    start_longitude = models.FloatField()
    start_address = models.CharField(max_length=500)
    end_latitude = models.FloatField()
    end_longitude = models.FloatField()
    end_address = models.CharField(max_length=500)
    
    # Trip details
    distance_km = models.FloatField()
    duration_minutes = models.IntegerField()
    safety_score = models.CharField(max_length=1)  # A, B, C, D, F
    route_data = models.JSONField()  # Full route coordinates
    
    # Ride info
    ride_service = models.CharField(max_length=20, blank=True, null=True)  # ola, uber
    ride_booking_id = models.CharField(max_length=100, blank=True, null=True)
    
    # Video info
    video_enabled = models.BooleanField(default=False)
    video_urls = models.JSONField(default=list)  # List of Firebase Storage URLs
    
    # Timestamps
    start_time = models.DateTimeField()
    end_time = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()  # Auto-delete after 30 days
    
    # Evidence flag
    is_evidence = models.BooleanField(default=False)
    flagged_by = models.ForeignKey(PoliceAuthority, on_delete=models.SET_NULL, null=True, blank=True)
    flagged_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['expires_at']),
        ]
    
    def __str__(self):
        return f"Travel {self.id} - {self.user.full_name}"


class EmergencyAlert(models.Model):
    """
    Emergency alerts triggered by users.
    """
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('responded', 'Responded'),
        ('resolved', 'Resolved'),
        ('false_alarm', 'False Alarm'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='alerts')
    travel_history = models.ForeignKey(TravelHistory, on_delete=models.CASCADE, null=True, blank=True)
    
    # Location when alert triggered
    alert_latitude = models.FloatField()
    alert_longitude = models.FloatField()
    alert_address = models.CharField(max_length=500)
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    alert_time = models.DateTimeField(auto_now_add=True)
    
    # Police response
    assigned_officer = models.ForeignKey(PoliceAuthority, on_delete=models.SET_NULL, null=True, blank=True)
    response_time = models.DateTimeField(null=True, blank=True)
    resolved_time = models.DateTimeField(null=True, blank=True)
    
    # Evidence
    video_clips = models.JSONField(default=list)  # Firebase Storage URLs
    notes = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-alert_time']
        indexes = [
            models.Index(fields=['status', '-alert_time']),
            models.Index(fields=['assigned_officer', 'status']),
        ]
    
    def __str__(self):
        return f"Alert {self.id} - {self.status}"


class SafetyNews(models.Model):
    """
    News updates posted by police for users.
    """
    PRIORITY_CHOICES = [
        ('low', 'General Info'),
        ('medium', 'Advisory'),
        ('high', 'Safety Alert'),
        ('critical', 'Emergency'),
    ]
    
    title = models.CharField(max_length=200)
    content = models.TextField()
    author = models.ForeignKey(PoliceAuthority, on_delete=models.CASCADE)
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='low')
    
    region_tag = models.CharField(max_length=100, blank=True, help_text="e.g., 'Downtown', 'Indiranagar'")
    image_url = models.URLField(blank=True, null=True, help_text="URL to image in Firebase Storage")
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = "Safety News"
    
    def __str__(self):
        return self.title
