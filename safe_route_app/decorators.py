from functools import wraps
from django.shortcuts import redirect

def firebase_login_required(function):
    """
    Decorator to ensure user is logged in via Firebase session.
    Checks if 'firebase_uid' is present in request.session.
    """
    @wraps(function)
    def wrap(request, *args, **kwargs):
        if not request.session.get('firebase_uid'):
            return redirect('safe_route_app:login_page')
        return function(request, *args, **kwargs)
    return wrap
