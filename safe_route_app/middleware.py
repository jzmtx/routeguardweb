"""
Authentication middleware to protect routes
"""
from django.shortcuts import redirect
from django.urls import reverse

class LoginRequiredMiddleware:
    """
    Middleware that requires users to be authenticated to access the site.
    Excludes auth pages (login, register, firebase endpoints).
    """
    def __init__(self, get_response):
        self.get_response = get_response
        # URLs that don't require authentication
        self.exempt_urls = [
            '/auth/login/',
            '/auth/register/',
            '/auth/firebase-login/',
            '/auth/firebase-register/',
            '/police/dashboard/',
            '/api/police/',
            '/static/',
            '/admin/',
        ]
    
    def __call__(self, request):
        # Check if user is authenticated via session
        firebase_uid = request.session.get('firebase_uid')
        
        # Check if current path is exempt
        path = request.path
        if path == '/':
            return self.get_response(request)
            
        is_exempt = any(path.startswith(url) for url in self.exempt_urls)
        
        # If not authenticated and not on exempt page, redirect to login
        if not firebase_uid and not is_exempt:
            return redirect('/auth/login/')
        
        response = self.get_response(request)
        return response
