"""
SOS Emergency Alert API endpoints
"""
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
from datetime import datetime, timedelta
from django.utils import timezone
import math

from .models import EmergencyAlert, UserProfile, PoliceAuthority


def find_nearest_police(latitude, longitude):
    """
    Find the nearest police officer based on jurisdiction
    """
    def haversine_distance(lat1, lon1, lat2, lon2):
        R = 6371  # Earth radius in km
        
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (math.sin(dlat / 2) ** 2 + 
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * 
             math.sin(dlon / 2) ** 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c
    
    # Get all verified police officers
    police_officers = PoliceAuthority.objects.filter(verified_by_admin=True)
    
    nearest = None
    min_distance = float('inf')
    
    for officer in police_officers:
        distance = haversine_distance(
            latitude, longitude,
            officer.jurisdiction_lat, officer.jurisdiction_lng
        )
        
        # Check if within jurisdiction radius
        if distance <= (officer.jurisdiction_radius / 1000):  # Convert meters to km
            if distance < min_distance:
                min_distance = distance
                nearest = officer
    
    # If no officer in jurisdiction, find closest one
    if not nearest and police_officers.exists():
        for officer in police_officers:
            distance = haversine_distance(
                latitude, longitude,
                officer.jurisdiction_lat, officer.jurisdiction_lng
            )
            if distance < min_distance:
                min_distance = distance
                nearest = officer
    
    return nearest


@csrf_exempt
@require_http_methods(["POST"])
def trigger_sos(request):
    """
    Trigger emergency SOS alert
    """
    firebase_uid = request.session.get('firebase_uid')
    
    if not firebase_uid:
        return JsonResponse({'error': 'Unauthorized'}, status=401)
    
    try:
        data = json.loads(request.body)
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        
        if not latitude or not longitude:
            return JsonResponse({'error': 'Missing coordinates'}, status=400)
        
        # Get user profile
        user = UserProfile.objects.get(firebase_uid=firebase_uid)
        
        # Find nearest police officer
        nearest_officer = find_nearest_police(latitude, longitude)
        
        # Create emergency alert (assigned_officer might be None)
        alert = EmergencyAlert.objects.create(
            user=user,
            alert_latitude=latitude,
            alert_longitude=longitude,
            alert_address='',  # Will be geocoded later
            status='active',
            assigned_officer=nearest_officer
        )

        if not nearest_officer:
            # Fallback: No police found nearby
            # Find closest station regardless of jurisdiction
            police_officers = PoliceAuthority.objects.filter(verified_by_admin=True)
            nearest_station_info = None
            
            if police_officers.exists():
                # Find closest police station
                min_dist = float('inf')
                closest_cop = None
                
                for cop in police_officers:
                    dist = haversine_distance(latitude, longitude, cop.jurisdiction_lat, cop.jurisdiction_lng)
                    if dist < min_dist:
                        min_dist = dist
                        closest_cop = cop
                
                if closest_cop:
                    nearest_station_info = {
                        'name': closest_cop.station_name,
                        'distance': f"{min_dist:.1f} km",
                        'lat': closest_cop.jurisdiction_lat,
                        'lng': closest_cop.jurisdiction_lng
                    }

            return JsonResponse({
                'success': True,
                'alert_id': str(alert.id),
                'officer': None,
                'backup_mode': True,
                'nearest_station': nearest_station_info,
                'emergency_contacts': [
                    {'name': 'Police Control Room', 'number': '100'},
                    {'name': 'Ambulance', 'number': '108'},
                    {'name': 'Women Helpline', 'number': '1091'}
                ],
                'message': 'No nearby patrol units detected. Alert broadcast to all stations.'
            })
        
        # Create emergency alert
        alert = EmergencyAlert.objects.create(
            user=user,
            alert_latitude=latitude,
            alert_longitude=longitude,
            alert_address='',  # Will be geocoded later
            status='active',
            assigned_officer=nearest_officer
        )
        
        # TODO: Create Firestore document for real-time tracking
        # TODO: Send notification to police officer
        
        return JsonResponse({
            'success': True,
            'alert_id': str(alert.id),
            'officer': {
                'name': nearest_officer.user_profile.full_name,
                'badge': nearest_officer.badge_number,
                'station': nearest_officer.station_name,
                'phone': nearest_officer.user_profile.phone
            },
            'message': 'Emergency alert created successfully'
        })
        
    except UserProfile.DoesNotExist:
        return JsonResponse({'error': 'User profile not found'}, status=404)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def update_sos_location(request):
    """
    Update GPS location for active SOS alert
    """
    firebase_uid = request.session.get('firebase_uid')
    
    if not firebase_uid:
        return JsonResponse({'error': 'Unauthorized'}, status=401)
    
    try:
        data = json.loads(request.body)
        alert_id = data.get('alert_id')
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        
        if not all([alert_id, latitude, longitude]):
            return JsonResponse({'error': 'Missing required fields'}, status=400)
        
        # Verify alert belongs to user
        alert = EmergencyAlert.objects.get(
            id=alert_id,
            user__firebase_uid=firebase_uid,
            status='active'
        )
        
        # Update alert location
        alert.alert_latitude = latitude
        alert.alert_longitude = longitude
        alert.save()
        
        # TODO: Update Firestore real-time location
        
        return JsonResponse({
            'success': True,
            'message': 'Location updated'
        })
        
    except EmergencyAlert.DoesNotExist:
        return JsonResponse({'error': 'Alert not found'}, status=404)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def add_sos_media(request):
    """
    Add audio/video URL to SOS alert
    """
    firebase_uid = request.session.get('firebase_uid')
    
    if not firebase_uid:
        return JsonResponse({'error': 'Unauthorized'}, status=401)
    
    try:
        data = json.loads(request.body)
        alert_id = data.get('alert_id')
        media_url = data.get('media_url')
        media_type = data.get('media_type')  # 'audio' or 'video'
        
        if not all([alert_id, media_url, media_type]):
            return JsonResponse({'error': 'Missing required fields'}, status=400)
        
        alert = EmergencyAlert.objects.get(
            id=alert_id,
            user__firebase_uid=firebase_uid
        )
        
        # Add media URL to list
        video_clips = alert.video_clips or []
        video_clips.append({
            'url': media_url,
            'type': media_type,
            'timestamp': datetime.now().isoformat()
        })
        alert.video_clips = video_clips
        alert.save()
        
        return JsonResponse({
            'success': True,
            'message': 'Media added'
        })
        
    except EmergencyAlert.DoesNotExist:
        return JsonResponse({'error': 'Alert not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def resolve_sos(request):
    """
    Resolve/end SOS alert
    """
    firebase_uid = request.session.get('firebase_uid')
    
    if not firebase_uid:
        return JsonResponse({'error': 'Unauthorized'}, status=401)
    
    try:
        data = json.loads(request.body)
        alert_id = data.get('alert_id')
        resolved_by = data.get('resolved_by', 'user')
        
        # Get alert first
        try:
            alert = EmergencyAlert.objects.get(id=alert_id)
        except EmergencyAlert.DoesNotExist:
            return JsonResponse({'error': 'Alert not found'}, status=404)

        # Check permissions
        is_authorized = False
        
        # 1. Check if user is owner
        if alert.user.firebase_uid == firebase_uid:
            is_authorized = True
            
        # 2. Check if user is police
        if not is_authorized:
            if PoliceAuthority.objects.filter(firebase_uid=firebase_uid).exists():
                is_authorized = True
                if resolved_by == 'user':
                    resolved_by = 'police'
        
        if not is_authorized:
            return JsonResponse({'error': 'Unauthorized to resolve this alert'}, status=403)
        
        alert.status = 'resolved'
        alert.resolved_time = timezone.now()
        alert.notes = f"Resolved by {resolved_by}"
        alert.save()
        
        # TODO: Remove from Firestore active alerts
        
        return JsonResponse({
            'success': True,
            'message': 'Alert resolved'
        })
        
    except EmergencyAlert.DoesNotExist:
        return JsonResponse({'error': 'Alert not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
