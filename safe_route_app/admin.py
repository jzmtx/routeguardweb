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


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['email', 'full_name', 'phone', 'is_active', 'created_at']
    search_fields = ['email', 'full_name', 'phone']
    list_filter = ['is_active', 'created_at']


@admin.register(PoliceAuthority)
class PoliceAuthorityAdmin(admin.ModelAdmin):
    list_display = ['badge_number', 'station_name', 'rank', 'verified_by_admin', 'created_at']
    list_filter = ['verified_by_admin', 'rank']
    search_fields = ['badge_number', 'station_name']


@admin.register(EmergencyAlert)
class EmergencyAlertAdmin(admin.ModelAdmin):
    list_display = ['status', 'user', 'alert_time', 'assigned_officer']
    list_filter = ['status', 'alert_time']


@admin.register(TravelHistory)
class TravelHistoryAdmin(admin.ModelAdmin):
    list_display = ['user', 'start_time', 'distance_km', 'safety_score']
    date_hierarchy = 'start_time'


from .models import SafetyNews
@admin.register(SafetyNews)
class SafetyNewsAdmin(admin.ModelAdmin):
    list_display = ['title', 'priority', 'author', 'created_at']
    list_filter = ['priority', 'created_at']
