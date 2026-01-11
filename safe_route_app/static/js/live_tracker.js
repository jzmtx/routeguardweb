/**
 * Live Route Tracking System
 * Tracks user movement along selected route in real-time
 */

class LiveTracker {
    constructor() {
        this.isTracking = false;
        this.selectedRoute = null;
        this.travelId = null;
        this.locationInterval = null;
        this.userMarker = null;
        this.routeLine = null;
        this.locationHistory = [];
        this.startTime = null;
    }
    
    async startTracking(route) {
        console.log('🚀 Starting live tracking for route:', route);
        
        this.selectedRoute = route;
        this.isTracking = true;
        this.startTime = new Date();
        this.locationHistory = [];
        
        // Create travel record in backend
        try {
            const response = await fetch('/api/tracking/start/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCookie('csrftoken')
                },
                body: JSON.stringify({
                    start_lat: route.start.lat,
                    start_lng: route.start.lng,
                    end_lat: route.end.lat,
                    end_lng: route.end.lng,
                    route_data: route,
                    safety_score: route.safetyScore
                })
            });
            
            const data = await response.json();
            this.travelId = data.travel_id;
            
            console.log('✅ Travel record created:', this.travelId);
            
            // Show tracking UI
            this.showTrackingUI();
            
            // Start GPS tracking (every 5 seconds)
            this.startGPSTracking();
            
            // Draw route on map
            this.drawRoute(route);
            
            // Show toast
            this.showToast('🚀 Live tracking started!', 'success');
            
        } catch (error) {
            console.error('Failed to start tracking:', error);
            this.showToast('Failed to start tracking', 'error');
        }
    }
    
    startGPSTracking() {
        // Update location immediately
        this.updateLocation();
        
        // Then update every 5 seconds
        this.locationInterval = setInterval(() => {
            this.updateLocation();
        }, 5000);
    }
    
    async updateLocation() {
        try {
            const position = await this.getCurrentPosition();
            
            const locationData = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy,
                speed: position.coords.speed,
                heading: position.coords.heading,
                timestamp: new Date().toISOString()
            };
            
            // Add to history
            this.locationHistory.push(locationData);
            
            // Update marker on map
            this.updateMarker(locationData);
            
            // Send to backend
            await fetch('/api/tracking/update/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCookie('csrftoken')
                },
                body: JSON.stringify({
                    travel_id: this.travelId,
                    ...locationData
                })
            });
            
            // Update UI
            this.updateTrackingUI(locationData);
            
            console.log('📍 Location updated:', locationData);
            
        } catch (error) {
            console.error('Location update error:', error);
        }
    }
    
    updateMarker(location) {
        if (this.userMarker) {
            // Animate marker to new position
            this.userMarker.setLatLng([location.lat, location.lng]);
        } else {
            // Create animated user marker
            const icon = L.divIcon({
                className: 'user-tracking-marker',
                html: `
                    <div style="
                        width: 40px;
                        height: 40px;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        border-radius: 50%;
                        border: 4px solid white;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        animation: pulse 2s infinite;
                    ">
                        <div style="color: white; font-size: 20px;">📍</div>
                    </div>
                `,
                iconSize: [40, 40],
                iconAnchor: [20, 20]
            });
            
            this.userMarker = L.marker([location.lat, location.lng], { icon })
                .addTo(window.map)
                .bindPopup('You are here');
        }
        
        // Center map on user
        window.map.setView([location.lat, location.lng], 15);
    }
    
    drawRoute(route) {
        // Draw route line
        if (route.coordinates && route.coordinates.length > 0) {
            this.routeLine = L.polyline(route.coordinates, {
                color: this.getRouteColor(route.safetyGrade),
                weight: 6,
                opacity: 0.7
            }).addTo(window.map);
        }
    }
    
    getRouteColor(grade) {
        const colors = {
            'A': '#10b981',
            'B': '#3b82f6',
            'C': '#f59e0b',
            'D': '#ef4444',
            'F': '#dc2626'
        };
        return colors[grade] || '#64748b';
    }
    
    showTrackingUI() {
        const trackingUI = document.createElement('div');
        trackingUI.id = 'tracking-ui';
        trackingUI.innerHTML = `
            <div style="
                position: fixed;
                top: 80px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(30, 41, 59, 0.95);
                padding: 16px 24px;
                border-radius: 12px;
                box-shadow: 0 8px 24px rgba(0,0,0,0.3);
                z-index: 1500;
                display: flex;
                align-items: center;
                gap: 16px;
                backdrop-filter: blur(10px);
            ">
                <div style="
                    width: 12px;
                    height: 12px;
                    background: #10b981;
                    border-radius: 50%;
                    animation: pulse 2s infinite;
                "></div>
                <div>
                    <div style="color: #f1f5f9; font-weight: 600; font-size: 0.875rem;">
                        Live Tracking Active
                    </div>
                    <div style="color: #94a3b8; font-size: 0.75rem;" id="tracking-stats">
                        Speed: -- km/h | Distance: -- km
                    </div>
                </div>
                <button onclick="window.liveTracker.stopTracking()" style="
                    background: #ef4444;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 6px;
                    font-weight: 600;
                    cursor: pointer;
                    font-size: 0.8125rem;
                ">
                    End Trip
                </button>
            </div>
        `;
        document.body.appendChild(trackingUI);
    }
    
    updateTrackingUI(location) {
        const statsEl = document.getElementById('tracking-stats');
        if (statsEl) {
            const speed = location.speed ? (location.speed * 3.6).toFixed(1) : '0.0';
            const distance = this.calculateTotalDistance().toFixed(2);
            statsEl.textContent = `Speed: ${speed} km/h | Distance: ${distance} km`;
        }
    }
    
    calculateTotalDistance() {
        let total = 0;
        for (let i = 1; i < this.locationHistory.length; i++) {
            const prev = this.locationHistory[i - 1];
            const curr = this.locationHistory[i];
            total += this.haversineDistance(prev.lat, prev.lng, curr.lat, curr.lng);
        }
        return total;
    }
    
    haversineDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
    
    async stopTracking() {
        if (!confirm('Are you sure you want to end this trip?')) {
            return;
        }
        
        console.log('🛑 Stopping tracking');
        
        clearInterval(this.locationInterval);
        this.isTracking = false;
        
        // End travel in backend
        if (this.travelId) {
            await fetch('/api/tracking/end/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCookie('csrftoken')
                },
                body: JSON.stringify({
                    travel_id: this.travelId,
                    end_time: new Date().toISOString(),
                    distance_km: this.calculateTotalDistance()
                })
            });
        }
        
        // Remove UI
        const trackingUI = document.getElementById('tracking-ui');
        if (trackingUI) trackingUI.remove();
        
        // Remove marker and route
        if (this.userMarker) {
            window.map.removeLayer(this.userMarker);
            this.userMarker = null;
        }
        if (this.routeLine) {
            window.map.removeLayer(this.routeLine);
            this.routeLine = null;
        }
        
        this.showToast('Trip ended successfully', 'success');
    }
    
    getCurrentPosition() {
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            });
        });
    }
    
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        toast.style.background = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#1e293b';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
    
    getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
}

// Initialize live tracker safely
document.addEventListener('DOMContentLoaded', () => {
    function initTracker() {
        if (!window.liveTracker) { // Prevent double init
            window.liveTracker = new LiveTracker();
            console.log('✅ Live Tracker initialized');
        }
    }

    if (window.map) {
        initTracker();
    } else {
        window.addEventListener('MapReady', initTracker);
        // Fallback check
        setTimeout(() => {
             if(window.map && !window.liveTracker) initTracker();
        }, 1000);
    }
});

// Add CSS for pulse animation
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0%, 100% {
            opacity: 1;
            transform: scale(1);
        }
        50% {
            opacity: 0.7;
            transform: scale(1.1);
        }
    }
`;
document.head.appendChild(style);
