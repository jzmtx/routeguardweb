from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
import os
from .firebase_config import verify_firebase_token
from .models import UserProfile, PoliceAuthority

def get_firebase_config():
    """Get Firebase config from environment variables"""
    return {
        'apiKey': os.getenv('FIREBASE_WEB_API_KEY', ''),
        'authDomain': os.getenv('FIREBASE_AUTH_DOMAIN', ''),
        'projectId': os.getenv('FIREBASE_PROJECT_ID', ''),
        'storageBucket': os.getenv('FIREBASE_STORAGE_BUCKET', ''),
        'appId': os.getenv('FIREBASE_APP_ID', '')
    }

def login_page(request):
    """Render login page with Firebase config"""
    return render(request, 'auth/login.html', {
        'firebase_config': get_firebase_config()
    })

def register_page(request):
    """Render register page with Firebase config"""
    return render(request, 'auth/register.html', {
        'firebase_config': get_firebase_config()
    })

@csrf_exempt
@require_http_methods(["POST"])
def firebase_login(request):
    """Verify Firebase token and create Django session"""
    try:
        data = json.loads(request.body)
        id_token = data.get('idToken')
        
        # Verify Firebase token
        decoded_token = verify_firebase_token(id_token)
        if not decoded_token:
            return JsonResponse({'error': 'Invalid token'}, status=401)
        
        firebase_uid = decoded_token['uid']
        email = decoded_token.get('email')
        
        # Get or create user profile
        # Note: In a strict flow, we might want to fail if profile doesn't exist
        # But for flexibility, we can auto-create basic profile if missing
        user_profile, created = UserProfile.objects.get_or_create(
            firebase_uid=firebase_uid,
            defaults={
                'email': email,
                'full_name': email.split('@')[0] if email else 'User'
            }
        )
        
        # Store in session
        request.session['firebase_uid'] = firebase_uid
        request.session['user_email'] = email
        request.session['is_police'] = PoliceAuthority.objects.filter(firebase_uid=firebase_uid).exists()
        
        # Force save session
        request.session.save()
        print(f"DEBUG: Session created for {email}, UID: {firebase_uid}, SessionKey: {request.session.session_key}")
        
        return JsonResponse({
            'success': True,
            'user': {
                'uid': firebase_uid,
                'email': email,
                'is_police': request.session['is_police']
            }
        })
        
    except Exception as e:
        print(f"Login error: {e}")
        import traceback
        traceback.print_exc()
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def firebase_register(request):
    """Create user profile after Firebase registration"""
    try:
        data = json.loads(request.body)
        id_token = data.get('idToken')
        full_name = data.get('full_name')
        phone = data.get('phone')
        emergency_contacts = data.get('emergency_contacts', {})
        
        # Verify Firebase token
        decoded_token = verify_firebase_token(id_token)
        if not decoded_token:
            return JsonResponse({'error': 'Invalid token'}, status=401)
        
        firebase_uid = decoded_token['uid']
        email = decoded_token.get('email')
        
        # Create or update profile
        user_profile, created = UserProfile.objects.update_or_create(
            firebase_uid=firebase_uid,
            defaults={
                'email': email,
                'full_name': full_name,
                'phone': phone,
                'emergency_contact_1_name': emergency_contacts.get('ec1_name', ''),
                'emergency_contact_1_phone': emergency_contacts.get('ec1_phone', ''),
                'emergency_contact_2_name': emergency_contacts.get('ec2_name', ''),
                'emergency_contact_2_phone': emergency_contacts.get('ec2_phone', '')
            }
        )
        
        # Store in session
        request.session['firebase_uid'] = firebase_uid
        request.session['user_email'] = email
        request.session['is_police'] = False
        
        return JsonResponse({'success': True})
        
    except Exception as e:
        print(f"Registration error: {e}")
        return JsonResponse({'error': str(e)}, status=500)

def logout(request):
    """Logout user"""
    request.session.flush()
    return JsonResponse({'success': True})

def get_current_user(request):
    """Get current logged-in user info"""
    firebase_uid = request.session.get('firebase_uid')
    if not firebase_uid:
        return JsonResponse({'authenticated': False})
    
    try:
        user_profile = UserProfile.objects.get(firebase_uid=firebase_uid)
        return JsonResponse({
            'authenticated': True,
            'uid': user_profile.firebase_uid,
            'email': user_profile.email,
            'name': user_profile.full_name,
            'phone': user_profile.phone,
            'is_police': request.session.get('is_police', False)
        })
    except UserProfile.DoesNotExist:
        return JsonResponse({'authenticated': False})
