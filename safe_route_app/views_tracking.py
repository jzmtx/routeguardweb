"""
Live Tracking API endpoints
"""
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
from datetime import datetime
from django.utils import timezone

from .models import TravelHistory, UserProfile


@csrf_exempt
@require_http_methods(["POST"])
def start_tracking(request):
    """
    Start a new travel/tracking session
    """
    firebase_uid = request.session.get('firebase_uid')
    
    if not firebase_uid:
        return JsonResponse({'error': 'Unauthorized'}, status=401)
    
    try:
        data = json.loads(request.body)
        
        user = UserProfile.objects.get(firebase_uid=firebase_uid)
        
        # Create travel history record
        travel = TravelHistory.objects.create(
            user=user,
            start_latitude=data.get('start_lat'),
            start_longitude=data.get('start_lng'),
            end_latitude=data.get('end_lat'),
            end_longitude=data.get('end_lng'),
            start_address=data.get('start_address', ''),
            end_address=data.get('end_address', ''),
            safety_score=data.get('safety_score', 0),
            route_data=data.get('route_data', {}),
            video_enabled=True  # Enable by default
        )
        
        return JsonResponse({
            'success': True,
            'travel_id': str(travel.id),
            'message': 'Tracking started'
        })
        
    except UserProfile.DoesNotExist:
        return JsonResponse({'error': 'User not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def update_tracking(request):
    """
    Update current location during travel
    """
    firebase_uid = request.session.get('firebase_uid')
    
    if not firebase_uid:
        return JsonResponse({'error': 'Unauthorized'}, status=401)
    
    try:
        data = json.loads(request.body)
        travel_id = data.get('travel_id')
        
        travel = TravelHistory.objects.get(
            id=travel_id,
            user__firebase_uid=firebase_uid
        )
        
        # Update route data with new location
        route_data = travel.route_data or {}
        if 'location_history' not in route_data:
            route_data['location_history'] = []
        
        route_data['location_history'].append({
            'lat': data.get('lat'),
            'lng': data.get('lng'),
            'accuracy': data.get('accuracy'),
            'speed': data.get('speed'),
            'heading': data.get('heading'),
            'timestamp': data.get('timestamp')
        })
        
        # Keep only last 100 points
        if len(route_data['location_history']) > 100:
            route_data['location_history'] = route_data['location_history'][-100:]
        
        travel.route_data = route_data
        travel.save()
        
        # TODO: Update Firestore for real-time sync with police dashboard
        
        return JsonResponse({
            'success': True,
            'message': 'Location updated'
        })
        
    except TravelHistory.DoesNotExist:
        return JsonResponse({'error': 'Travel not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def end_tracking(request):
    """
    End travel session
    """
    firebase_uid = request.session.get('firebase_uid')
    
    if not firebase_uid:
        return JsonResponse({'error': 'Unauthorized'}, status=401)
    
    try:
        data = json.loads(request.body)
        travel_id = data.get('travel_id')
        
        travel = TravelHistory.objects.get(
            id=travel_id,
            user__firebase_uid=firebase_uid
        )
        
        travel.end_time = timezone.now()
        travel.distance_km = data.get('distance_km', 0)
        
        # Calculate duration
        if travel.start_time:
            duration = (travel.end_time - travel.start_time).total_seconds() / 60
            travel.duration_minutes = int(duration)
        
        travel.save()
        
        return JsonResponse({
            'success': True,
            'message': 'Travel ended',
            'duration_minutes': travel.duration_minutes,
            'distance_km': travel.distance_km
        })
        
    except TravelHistory.DoesNotExist:
        return JsonResponse({'error': 'Travel not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@require_http_methods(["GET"])
def get_active_travels(request):
    """
    Get all active travels (for police dashboard)
    """
    firebase_uid = request.session.get('firebase_uid')
    is_police = request.session.get('is_police', False)
    
    if not firebase_uid or not is_police:
        return JsonResponse({'error': 'Unauthorized'}, status=401)
    
    try:
        # Get active travels (no end_time)
        travels = TravelHistory.objects.filter(
            end_time__isnull=True
        ).select_related('user').order_by('-start_time')[:50]
        
        travels_data = []
        for travel in travels:
            # Get latest location from route_data
            route_data = travel.route_data or {}
            location_history = route_data.get('location_history', [])
            latest_location = location_history[-1] if location_history else None
            
            travels_data.append({
                'id': str(travel.id),
                'user_name': travel.user.full_name,
                'user_phone': travel.user.phone,
                'start_time': travel.start_time.isoformat(),
                'start_location': {
                    'lat': travel.start_latitude,
                    'lng': travel.start_longitude
                },
                'end_location': {
                    'lat': travel.end_latitude,
                    'lng': travel.end_longitude
                },
                'current_location': latest_location,
                'safety_score': travel.safety_score
            })
        
        return JsonResponse({
            'success': True,
            'travels': travels_data,
            'count': len(travels_data)
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
