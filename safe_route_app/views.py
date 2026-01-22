"""
Views for RouteGuard application.
Handles all API endpoints and page rendering.
"""
from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from django.conf import settings
import json
from datetime import datetime
import random

from .utils.scorer import calculate_safety_score
from .utils.data_generator import generate_sample_data_for_location
from .utils.csv_importer import import_crime_csv
from .utils.gemini_service import explain_route, get_gemini_advisor
from .models import CrimePoint, SafetyZone


from .views_auth import get_firebase_config

def home(request):
    """Render the landing page"""
    return render(request, 'home.html')

from .decorators import firebase_login_required

@firebase_login_required
def index(request):
    """
    Render the main map interface.
    Requires login.
    """
    context = {
        'crime_count': CrimePoint.objects.count(),
        'safety_zone_count': SafetyZone.objects.count(),
        'has_gemini': bool(get_gemini_advisor().enabled),
        'firebase_config': get_firebase_config(),
        'google_maps_key': settings.GEMINI_API_KEY, # We might need this or not
    }
    return render(request, 'index.html', context)


@csrf_exempt
@require_http_methods(["POST"])
def calculate_safe_route(request):
    """
    Calculate safety scores for multiple route options.
    
    Expected POST data:
    {
        "routes": [
            {"coordinates": [[lat, lon], [lat, lon], ...], "distance": 2.5, "duration": 15},
            ...
        ],
        "current_time": "2024-01-08T22:30:00" (optional)
    }
    
    Returns:
    {
        "routes": [
            {"score": 85, "grade": "A", "risk_level": "low", ...},
            ...
        ],
        "recommended_index": 0,
        "ai_explanation": "..."
    }
    """
    try:
        data = json.loads(request.body)
        routes = data.get('routes', [])
        
        if not routes:
            return JsonResponse({'error': 'No routes provided'}, status=400)
        
        # Parse current time if provided
        current_time = None
        if data.get('current_time'):
            try:
                current_time = datetime.fromisoformat(data['current_time'])
            except:
                current_time = datetime.now()
        else:
            current_time = datetime.now()
        
        # Calculate safety scores for all routes
        scored_routes = []
        for route in routes:
            coordinates = route.get('coordinates', [])
            
            if not coordinates:
                continue
            
            # Calculate safety score
            safety_data = calculate_safety_score(coordinates, current_time)
            
            # Add route metadata
            safety_data['distance_km'] = route.get('distance', 0)
            safety_data['duration_minutes'] = route.get('duration', 0)
            
            scored_routes.append(safety_data)
        
        if not scored_routes:
            return JsonResponse({'error': 'No valid routes to score'}, status=400)
        
        # Find the safest route (highest score)
        recommended_index = max(range(len(scored_routes)), key=lambda i: scored_routes[i]['score'])
        
        # Generate AI explanation
        ai_explanation = ""
        try:
            recommended_route = scored_routes[recommended_index]
            alternative_routes = [r for i, r in enumerate(scored_routes) if i != recommended_index]
            ai_explanation = explain_route(recommended_route, alternative_routes)
        except Exception as e:
            print(f"AI explanation error: {e}")
            ai_explanation = "Route analysis complete. Check the safety scores for details."
        
        return JsonResponse({
            'success': True,
            'routes': scored_routes,
            'recommended_index': recommended_index,
            'ai_explanation': ai_explanation,
            'timestamp': current_time.isoformat()
        })
        
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON data'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@require_http_methods(["GET"])
def get_crime_data(request):
    """
    Get crime data for a specific area.
    
    Query parameters:
    - lat: Center latitude
    - lon: Center longitude
    - radius: Radius in meters (default: 5000)
    
    Returns:
    {
        "crimes": [
            {"lat": 12.34, "lon": 56.78, "type": "theft", "severity": 2, ...},
            ...
        ],
        "count": 42
    }
    """
    try:
        lat = float(request.GET.get('lat', 0))
        lon = float(request.GET.get('lon', 0))
        radius = int(request.GET.get('radius', 5000))
        
        if not lat or not lon:
            return JsonResponse({'error': 'Latitude and longitude required'}, status=400)
        
        # Calculate bounding box (simple approximation)
        # 1 degree ≈ 111 km
        radius_deg = (radius / 1000) / 111.0
        
        # Query crimes within bounding box
        crimes = CrimePoint.objects.filter(
            latitude__gte=lat - radius_deg,
            latitude__lte=lat + radius_deg,
            longitude__gte=lon - radius_deg,
            longitude__lte=lon + radius_deg
        )[:200]  # Limit to 200 points for performance
        
        # Serialize crime data
        crime_data = []
        for crime in crimes:
            crime_data.append({
                'lat': crime.latitude,
                'lon': crime.longitude,
                'type': crime.crime_type,
                'severity': crime.severity,
                'occurred_at': crime.occurred_at.isoformat(),
                'is_sample': crime.is_sample_data
            })
        
        return JsonResponse({
            'success': True,
            'crimes': crime_data,
            'count': len(crime_data)
        })
        
    except ValueError:
        return JsonResponse({'error': 'Invalid coordinates'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def generate_sample_data(request):
    """
    Generate sample crime data for a location.
    
    Expected POST data:
    {
        "lat": 12.34,
        "lon": 56.78,
        "num_points": 100,
        "radius_km": 5
    }
    
    Returns:
    {
        "success": true,
        "crimes_created": 100,
        "message": "..."
    }
    """
    try:
        data = json.loads(request.body)
        
        lat = float(data.get('lat', 0))
        lon = float(data.get('lon', 0))
        num_points = int(data.get('num_points', 100))
        radius_km = float(data.get('radius_km', 5))
        
        if not lat or not lon:
            return JsonResponse({'error': 'Latitude and longitude required'}, status=400)
        
        # Generate sample data
        result = generate_sample_data_for_location(lat, lon, num_points, radius_km)
        
        return JsonResponse(result)
        
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON data'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def upload_crime_csv(request):
    """
    Upload crime data from CSV file.
    
    Expected: multipart/form-data with 'csv_file' field
    Optional: 'clear_existing' boolean
    
    Returns:
    {
        "success": true,
        "imported": 150,
        "skipped": 5,
        "errors": [...]
    }
    """
    try:
        if 'csv_file' not in request.FILES:
            return JsonResponse({'error': 'No CSV file provided'}, status=400)
        
        csv_file = request.FILES['csv_file']
        clear_existing = request.POST.get('clear_existing', 'false').lower() == 'true'
        
        # Import CSV
        result = import_crime_csv(csv_file, clear_existing)
        
        return JsonResponse(result)
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def get_ai_explanation(request):
    """
    Get AI-generated safety explanation for a route.
    
    Expected POST data:
    {
        "route_data": {
            "score": 85,
            "crime_count": 3,
            "safety_zone_count": 2,
            ...
        }
    }
    
    Returns:
    {
        "explanation": "...",
        "safety_tips": "..."
    }
    """
    try:
        data = json.loads(request.body)
        route_data = data.get('route_data', {})
        
        if not route_data:
            return JsonResponse({'error': 'No route data provided'}, status=400)
        
        advisor = get_gemini_advisor()
        
        if not advisor.enabled:
            return JsonResponse({
                'error': 'Gemini AI is not configured',
                'explanation': 'AI explanations require a valid Gemini API key'
            }, status=503)
        
        # Generate explanation and tips
        explanation = advisor.explain_route_choice(route_data)
        safety_tips = advisor.generate_safety_tips(route_data)
        
        return JsonResponse({
            'success': True,
            'explanation': explanation,
            'safety_tips': safety_tips
        })
        
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON data'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
