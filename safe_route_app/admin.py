"""
Admin interface configuration for RouteGuard.
"""
from django.contrib import admin
from .models import (
    CrimePoint, 
    SafetyZone, 
    RouteHistory,
    UserProfile,
    PoliceAuthority,
    TravelHistory,
    EmergencyAlert
)


@admin.register(CrimePoint)
class CrimePointAdmin(admin.ModelAdmin):
    """
    Admin interface for crime data management.
    """
    list_display = ['crime_type', 'severity', 'latitude', 'longitude', 'occurred_at', 'is_sample_data', 'source']
    list_filter = ['crime_type', 'severity', 'is_sample_data', 'occurred_at']
    search_fields = ['description', 'crime_type']
    date_hierarchy = 'occurred_at'
    
    fieldsets = (
        ('Location', {
            'fields': ('latitude', 'longitude')
        }),
        ('Crime Details', {
            'fields': ('crime_type', 'severity', 'description')
        }),
        ('Temporal Data', {
            'fields': ('occurred_at',)
        }),
        ('Source Information', {
            'fields': ('is_sample_data', 'source')
        }),
    )


@admin.register(SafetyZone)
class SafetyZoneAdmin(admin.ModelAdmin):
    """
    Admin interface for safety zones.
    """
    list_display = ['name', 'zone_type', 'latitude', 'longitude', 'radius', 'is_active']
    list_filter = ['zone_type', 'is_active']
    search_fields = ['name']


@admin.register(RouteHistory)
class RouteHistoryAdmin(admin.ModelAdmin):
    """
    Admin interface for route history.
    """
    list_display = ['searched_at', 'safety_score', 'distance_km', 'duration_minutes', 'time_of_day']
    list_filter = ['time_of_day', 'searched_at']
    date_hierarchy = 'searched_at'
    readonly_fields = ['searched_at']
