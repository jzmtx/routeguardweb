"""
Police-specific views and APIs
"""
from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
from datetime import datetime

from .models import PoliceAuthority, UserProfile, EmergencyAlert


def police_dashboard(request):
    """
    Police dashboard view - requires police authentication
    """
    # Check if user is police
    firebase_uid = request.session.get('firebase_uid')
    is_police = request.session.get('is_police', False)
    
    if not firebase_uid or not is_police:
        return redirect('/auth/login/')
    
    return render(request, 'police/dashboard.html')


@require_http_methods(["GET"])
def get_police_info(request):
    """
    Get current police officer's information
    """
    firebase_uid = request.session.get('firebase_uid')
    is_police = request.session.get('is_police', False)
    
    if not firebase_uid:
        return JsonResponse({'authenticated': False}, status=401)
    
    if not is_police:
        return JsonResponse({'authenticated': True, 'is_police': False}, status=403)
    
    try:
        police = PoliceAuthority.objects.select_related('user_profile').get(firebase_uid=firebase_uid)
        
        return JsonResponse({
            'authenticated': True,
            'is_police': True,
            'name': police.user_profile.full_name,
            'badge_number': police.badge_number,
            'station_name': police.station_name,
            'rank': police.rank,
            'jurisdiction': {
                'lat': police.jurisdiction_lat,
                'lng': police.jurisdiction_lng,
                'radius': police.jurisdiction_radius
            }
        })
    except PoliceAuthority.DoesNotExist:
        return JsonResponse({'authenticated': True, 'is_police': False}, status=403)


    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def update_police_location(request):
    """
    Update police officer's current live location and duty status
    """
    firebase_uid = request.session.get('firebase_uid')
    is_police = request.session.get('is_police', False)
    
    if not firebase_uid or not is_police:
        return JsonResponse({'error': 'Unauthorized'}, status=401)
    
    try:
        data = json.loads(request.body)
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        is_on_duty = data.get('is_on_duty', True)
        
        police = PoliceAuthority.objects.get(firebase_uid=firebase_uid)
        
        # Update live location
        if latitude and longitude:
            police.current_lat = latitude
            police.current_lng = longitude
            
        police.is_on_duty = is_on_duty
        police.save()
        
        return JsonResponse({
            'success': True,
            'message': 'Location/Status updated successfully',
            'is_on_duty': police.is_on_duty
        })
        
    except PoliceAuthority.DoesNotExist:
        return JsonResponse({'error': 'Police profile not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@require_http_methods(["GET"])
def get_nearby_police(request):
    """
    Get all active police officers for user map
    """
    # Optional: Filter by lat/lng bounds if provided
    try:
        active_police = PoliceAuthority.objects.filter(is_on_duty=True)
        
        police_data = []
        for p in active_police:
            if p.current_lat and p.current_lng:
                police_data.append({
                    'id': p.badge_number,
                    'station': p.station_name,
                    'lat': p.current_lat,
                    'lng': p.current_lng,
                    'type': 'police_car' # placeholder for icon type
                })
        
        return JsonResponse({'success': True, 'police': police_data})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@require_http_methods(["GET"])
def get_active_alerts(request):
    """
    Get all active emergency alerts for this police officer
    """
    firebase_uid = request.session.get('firebase_uid')
    is_police = request.session.get('is_police', False)
    
    if not firebase_uid or not is_police:
        return JsonResponse({'error': 'Unauthorized'}, status=401)
    
    try:
        police = PoliceAuthority.objects.get(firebase_uid=firebase_uid)
        
        # Get alerts assigned to this officer or in their jurisdiction
        alerts = EmergencyAlert.objects.filter(
            status='active',
            assigned_officer=police
        ).select_related('user').order_by('-alert_time')
        
        alerts_data = []
        for alert in alerts:
            alerts_data.append({
                'id': str(alert.id),
                'user_name': alert.user.full_name,
                'user_phone': alert.user.phone,
                'location': {
                    'lat': alert.alert_latitude,
                    'lng': alert.alert_longitude,
                    'address': alert.alert_address
                },
                'alert_time': alert.alert_time.isoformat(),
                'status': alert.status,
                'video_clips': alert.video_clips
            })
        
        return JsonResponse({
            'success': True,
            'alerts': alerts_data,
            'count': len(alerts_data)
        })
        
    except PoliceAuthority.DoesNotExist:
        return JsonResponse({'error': 'Police profile not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@require_http_methods(["GET"])
def get_alert_history(request):
    """
    Get resolved/historical alerts for investigation
    """
    firebase_uid = request.session.get('firebase_uid')
    is_police = request.session.get('is_police', False)
    
    if not firebase_uid or not is_police:
        return JsonResponse({'error': 'Unauthorized'}, status=401)
    
    try:
        police = PoliceAuthority.objects.get(firebase_uid=firebase_uid)
        
        # Get resolved alerts
        alerts = EmergencyAlert.objects.filter(
            status='resolved',
            # assigned_officer=police # Optional: if we only want ones they handled
        ).select_related('user').order_by('-created_at')[:50] # Limit to last 50
        
        history_data = []
        for alert in alerts:
            history_data.append({
                'id': str(alert.id),
                'user_name': alert.user.full_name,
                'location_address': alert.alert_address or f"{alert.alert_latitude:.4f}, {alert.alert_longitude:.4f}",
                'time': alert.alert_time.strftime('%Y-%m-%d %H:%M'),
                'resolved_at': alert.updated_at.strftime('%Y-%m-%d %H:%M') if alert.updated_at else 'N/A',
                'video_clips': alert.video_clips,
                'audio_clips': alert.audio_clips if hasattr(alert, 'audio_clips') else []
            })
        
        return JsonResponse({'success': True, 'history': history_data})
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def add_crime_report(request):
    """
    Allow police to add a crime record manually
    """
    firebase_uid = request.session.get('firebase_uid')
    is_police = request.session.get('is_police', False)
    
    if not firebase_uid or not is_police:
        return JsonResponse({'error': 'Unauthorized'}, status=401)
    
    try:
        data = json.loads(request.body)
        from .models import CrimePoint
        
        crime = CrimePoint.objects.create(
            crime_type=data.get('type'),
            severity=data.get('severity', 2),
            description=data.get('description'),
            latitude=data.get('latitude'),
            longitude=data.get('longitude'),
            occurred_at=datetime.now(), # Or provided time
            source='police_report',
            is_sample_data=False
        )
        
        return JsonResponse({'success': True, 'id': crime.id})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def post_news_update(request):
    """
    Allow police to post a news/safety update
    """
    firebase_uid = request.session.get('firebase_uid')
    is_police = request.session.get('is_police', False)
    
    if not firebase_uid or not is_police:
        return JsonResponse({'error': 'Unauthorized'}, status=401)
    
    try:
        police = PoliceAuthority.objects.get(firebase_uid=firebase_uid)
        data = json.loads(request.body)
        from .models import SafetyNews
        
        news = SafetyNews.objects.create(
            author=police,
            title=data.get('title'),
            content=data.get('content'),
            priority=data.get('priority', 'low'),
            region_tag=data.get('region', ''),
            image_url=data.get('image_url', '')
        )
        
        return JsonResponse({'success': True, 'id': news.id})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@require_http_methods(["GET"])
def get_safety_news(request):
    """
    Get latest safety news for users
    """
    try:
        from .models import SafetyNews
        news_items = SafetyNews.objects.filter(is_active=True).order_by('-created_at')[:10]
        
        return JsonResponse({
            'success': True,
            'news': [{
                'id': n.id,
                'title': n.title,
                'content': n.content,
                'priority': n.priority,
                'date': n.created_at.strftime('%Y-%m-%d %H:%M'),
                'author': n.author.station_name,
                'image_url': n.image_url
            } for n in news_items]
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
