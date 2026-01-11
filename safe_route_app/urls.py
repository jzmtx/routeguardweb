"""
URL routing for safe_route_app.
"""
from django.urls import path
from . import views
from . import views_auth
from . import views_police
from . import views_sos
from . import views_tracking

app_name = 'safe_route_app'

urlpatterns = [
    # Main map interface
    path('', views.index, name='index'),
    
    # API endpoints
    path('api/calculate-route/', views.calculate_safe_route, name='calculate_route'),
    path('api/get-crime-data/', views.get_crime_data, name='get_crime_data'),
    path('api/generate-sample-data/', views.generate_sample_data, name='generate_sample_data'),
    path('api/upload-csv/', views.upload_crime_csv, name='upload_csv'),
    path('api/get-ai-explanation/', views.get_ai_explanation, name='get_ai_explanation'),
    
    # Auth Routes
    path('auth/login/', views_auth.login_page, name='login_page'),
    path('auth/register/', views_auth.register_page, name='register_page'),
    path('auth/firebase-login/', views_auth.firebase_login, name='firebase_login'),
    path('auth/firebase-register/', views_auth.firebase_register, name='firebase_register'),
    path('auth/logout/', views_auth.logout, name='logout'),
    path('api/auth/user/', views_auth.get_current_user, name='get_current_user'),
    
    # Police Routes
    path('police/dashboard/', views_police.police_dashboard, name='police_dashboard'),
    path('api/police/me/', views_police.get_police_info, name='get_police_info'),
    path('api/police/update-location/', views_police.update_police_location, name='update_police_location'),
    path('api/police/active-alerts/', views_police.get_active_alerts, name='get_active_alerts'),
    path('api/police/history/', views_police.get_alert_history, name='get_alert_history'),
    path('api/police/report-crime/', views_police.add_crime_report, name='add_crime_report'),
    path('api/police/post-news/', views_police.post_news_update, name='post_news_update'),
    path('api/news/latest/', views_police.get_safety_news, name='get_safety_news'),
    path('api/police/nearby/', views_police.get_nearby_police, name='get_nearby_police'),
    
    # SOS Emergency Routes
    path('api/sos/trigger/', views_sos.trigger_sos, name='trigger_sos'),
    path('api/sos/update-location/', views_sos.update_sos_location, name='update_sos_location'),
    path('api/sos/add-media/', views_sos.add_sos_media, name='add_sos_media'),
    path('api/sos/resolve/', views_sos.resolve_sos, name='resolve_sos'),
    
    # Live Tracking Routes
    path('api/tracking/start/', views_tracking.start_tracking, name='start_tracking'),
    path('api/tracking/update/', views_tracking.update_tracking, name='update_tracking'),
    path('api/tracking/end/', views_tracking.end_tracking, name='end_tracking'),
    path('api/tracking/active/', views_tracking.get_active_travels, name='get_active_travels'),
]
