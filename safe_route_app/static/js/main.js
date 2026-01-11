/**
 * RouteGuard - Main JavaScript
 * Handles map initialization, routing, and safety calculations
 */

// ========== Global State ==========
const state = {
    map: null,
    startMarker: null,
    endMarker: null,
    startCoords: null,
    endCoords: null,
    routingControl: null,
    currentRoutes: [],
    crimeLayer: null,
    safetyZoneLayer: null
};

// ========== Initialization ==========
document.addEventListener('DOMContentLoaded', () => {
    initializeMap();
    attachEventListeners();
    
    // Initialize toast container
    if (!document.getElementById('toast-container')) {
        const container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
});

function initializeMap() {
    // Initialize map with performance optimizations
    state.map = L.map('map', {
        preferCanvas: true,
        tap: true,
        tapTolerance: 15,
        zoomControl: true,
        attributionControl: true
    }).setView([20.5937, 78.9629], 5);
    
    // Make map globally accessible
    window.map = state.map;
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
        updateWhenIdle: true,
        updateWhenZooming: false,
        keepBuffer: 2
    }).addTo(state.map);
    
    // Initialize layers
    state.crimeLayer = L.layerGroup().addTo(state.map);
    state.safetyZoneLayer = L.layerGroup().addTo(state.map);
    
    // Try to get user's location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                state.map.setView([latitude, longitude], 13);
                showToast('Location detected', 'success');
            },
            (error) => {
                console.log('Geolocation error:', error);
                showToast('Using default location', 'info');
            }
        );
    }
    
    // Add click handler for setting markers
    state.map.on('click', handleMapClick);
    
    // Invalidate size on window resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            state.map.invalidateSize();
        }, 250);
    });
}

// ========== Event Listeners ==========
function attachEventListeners() {
    document.getElementById('use-current-location').addEventListener('click', useCurrentLocation);
    document.getElementById('calculate-route').addEventListener('click', calculateRoute);
    document.getElementById('clear-route').addEventListener('click', clearRoute);
    document.getElementById('generate-sample-data').addEventListener('click', generateSampleData);
    document.getElementById('csv-upload').addEventListener('change', handleCSVUpload);
    
    // Location search
    document.getElementById('search-button').addEventListener('click', searchLocation);
    document.getElementById('location-search').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchLocation();
    });

    document.getElementById('search-dest-btn').addEventListener('click', searchDestination);
}

// ========== Authentication ==========
async function checkAuthStatus() {
    try {
        const response = await fetch('/api/auth/user/');
        const data = await response.json();
        
        if (data.authenticated) {
            document.getElementById('user-email').textContent = data.email;
            document.getElementById('logout-btn').style.display = 'inline-block';
            
            document.getElementById('logout-btn').addEventListener('click', async () => {
                await fetch('/auth/logout/', { method: 'POST' });
                window.location.href = '/auth/login/';
            });
        }
    } catch (error) {
        console.error('Auth check error:', error);
    }
}

// ========== Map Interaction ==========
function handleMapClick(e) {
    const { lat, lng } = e.latlng;
    
    if (!state.startCoords) {
        setStartPoint(lat, lng);
    } else if (!state.endCoords) {
        setEndPoint(lat, lng);
    } else {
        clearRoute();
        setStartPoint(lat, lng);
    }
}

function setStartPoint(lat, lng) {
    state.startCoords = [lat, lng];
    
    if (state.startMarker) {
        state.map.removeLayer(state.startMarker);
    }
    
    state.startMarker = L.marker([lat, lng], {
        icon: createCustomIcon('🚶', '#667eea')
    }).addTo(state.map);
    
    state.startMarker.bindPopup('<b>Start Location</b>').openPopup();
    document.getElementById('start-location').value = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    updateCalculateButton();
}

function setEndPoint(lat, lng) {
    state.endCoords = [lat, lng];
    
    if (state.endMarker) {
        state.map.removeLayer(state.endMarker);
    }
    
    state.endMarker = L.marker([lat, lng], {
        icon: createCustomIcon('🎯', '#10b981')
    }).addTo(state.map);
    
    state.endMarker.bindPopup('<b>Destination</b>').openPopup();
    document.getElementById('end-location').value = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    updateCalculateButton();
}

function createCustomIcon(emoji, color) {
    return L.divIcon({
        html: `<div style="background: ${color}; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">${emoji}</div>`,
        className: 'custom-marker',
        iconSize: [40, 40],
        iconAnchor: [20, 20]
    });
}

function useCurrentLocation() {
    if (!navigator.geolocation) {
        showToast('Geolocation not supported', 'error');
        return;
    }
    
    showLoading(true);
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            setStartPoint(latitude, longitude);
            state.map.setView([latitude, longitude], 15);
            showLoading(false);
            showToast('Current location set', 'success');
        },
        (error) => {
            showLoading(false);
            showToast('Failed to get location', 'error');
        }
    );
}

function updateCalculateButton() {
    const button = document.getElementById('calculate-route');
    button.disabled = !(state.startCoords && state.endCoords);
}

// ========== Route Calculation ==========
async function calculateRoute() {
    if (!state.startCoords || !state.endCoords) {
        showToast('Please set both start and end points', 'warning');
        return;
    }
    
    showLoading(true);
    
    try {
        if (state.routingControl) {
            state.map.removeControl(state.routingControl);
        }
        
        state.routingControl = L.Routing.control({
            waypoints: [
                L.latLng(state.startCoords[0], state.startCoords[1]),
                L.latLng(state.endCoords[0], state.endCoords[1])
            ],
            router: L.Routing.osrmv1({
                serviceUrl: 'https://router.project-osrm.org/route/v1'
            }),
            routeWhileDragging: false,
            showAlternatives: true,
            altLineOptions: {
                styles: [{ color: '#94a3b8', opacity: 0.6, weight: 6 }]
            },
            lineOptions: {
                styles: [{ color: '#10b981', opacity: 0.8, weight: 6 }]
            },
            createMarker: () => null,
            addWaypoints: false
        }).addTo(state.map);
        
        state.routingControl.on('routesfound', async (e) => {
            await processRoutes(e.routes);
            showLoading(false);
        });
        
        state.routingControl.on('routingerror', (e) => {
            console.error('Routing error:', e);
            showLoading(false);
            showToast('Failed to calculate routes', 'error');
        });
        
    } catch (error) {
        console.error('Route calculation error:', error);
        showLoading(false);
        showToast('Error calculating routes', 'error');
    }
}

async function processRoutes(routes) {
    try {
        const routeData = routes.map(route => ({
            coordinates: route.coordinates.map(coord => [coord.lat, coord.lng]),
            distance: route.summary.totalDistance / 1000,
            duration: route.summary.totalTime / 60
        }));
        
        const response = await fetch('/api/calculate-route/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                routes: routeData,
                current_time: new Date().toISOString()
            })
        });
        
        if (!response.ok) throw new Error('Failed to calculate safety scores');
        
        const result = await response.json();
        state.currentRoutes = result.routes;
        
        displayRouteResults(result.routes, result.recommended_index);
        
        if (result.ai_explanation) {
            displayAIExplanation(result.ai_explanation);
        }
        
        showToast('Routes calculated successfully!', 'success');
        
    } catch (error) {
        console.error('Route processing error:', error);
        showToast('Error processing routes', 'error');
        showLoading(false);
    }
}

function displayRouteResults(routes, recommendedIndex) {
    const container = document.getElementById('routes-container');
    container.innerHTML = '';
    
    routes.forEach((route, index) => {
        const isRecommended = index === recommendedIndex;
        const card = document.createElement('div');
        card.className = `route-card ${isRecommended ? 'recommended' : ''}`;
        
        const badgeClass = route.grade === 'A' || route.grade === 'B' ? 'badge-success' :
                          route.grade === 'C' ? 'badge-warning' : 'badge-danger';
        
        card.innerHTML = `
            <div class="route-header">
                <span class="route-title">Route ${index + 1} ${isRecommended ? '⭐ Recommended' : ''}</span>
                <span class="route-badge ${badgeClass}">Grade ${route.grade}</span>
            </div>
            <div class="route-score score-${route.grade.toLowerCase()}">
                ${route.score}/100
            </div>
            <div class="route-details">
                <div class="detail-item">
                    <div>Distance</div>
                    <div class="detail-value">${route.distance_km.toFixed(2)} km</div>
                </div>
                <div class="detail-item">
                    <div>Duration</div>
                    <div class="detail-value">${Math.round(route.duration_minutes)} min</div>
                </div>
                <div class="detail-item">
                    <div>Crime Incidents</div>
                    <div class="detail-value">${route.crime_count}</div>
                </div>
                <div class="detail-item">
                    <div>Safety Zones</div>
                    <div class="detail-value">${route.safety_zone_count}</div>
                </div>
            </div>
            <div style="margin-top: 12px; font-size: 0.75rem; color: #94a3b8;">
                ${route.details}
            </div>
        `;
        
        // Add Choose Route button
        const chooseBtn = document.createElement('button');
        chooseBtn.className = 'btn-primary';
        chooseBtn.textContent = 'Choose This Route';
        chooseBtn.style.marginTop = '12px';
        chooseBtn.style.width = '100%';
        chooseBtn.onclick = () => chooseRoute(index, route);
        card.appendChild(chooseBtn);
        
        container.appendChild(card);
    });
    
    document.getElementById('route-results').style.display = 'block';
}

// ========== Route Selection & Live Tracking ==========
function chooseRoute(index, route) {
    console.log('Route chosen:', route);
    
    // Hide route options
    document.getElementById('route-results').style.display = 'none';
    
    // Start live tracking
    if (window.liveTracker) {
        window.liveTracker.startTracking({
            ...route,
            start: {
                lat: state.startMarker.getLatLng().lat,
                lng: state.startMarker.getLatLng().lng
            },
            end: {
                lat: state.endMarker.getLatLng().lat,
                lng: state.endMarker.getLatLng().lng
            },
            safetyScore: route.score,
            safetyGrade: route.grade
        });
    } else {
        showToast('Live tracker not initialized', 'error');
    }
}

function displayAIExplanation(explanation) {
    const aiSection = document.getElementById('ai-section');
    const aiContent = document.getElementById('ai-explanation');
    
    if (aiContent && aiSection) {
        aiContent.innerHTML = `<p>${explanation}</p>`;
        aiSection.style.display = 'block';
    } else {
        // Element doesn't exist, just log it
        console.log('AI Explanation:', explanation);
    }
}

function clearRoute() {
    if (state.startMarker) {
        state.map.removeLayer(state.startMarker);
        state.startMarker = null;
    }
    if (state.endMarker) {
        state.map.removeLayer(state.endMarker);
        state.endMarker = null;
    }
    if (state.routingControl) {
        state.map.removeControl(state.routingControl);
        state.routingControl = null;
    }
    
    state.startCoords = null;
    state.endCoords = null;
    state.currentRoutes = [];
    
    document.getElementById('start-location').value = '';
    document.getElementById('end-location').value = '';
    document.getElementById('route-results').style.display = 'none';
    
    const aiSection = document.getElementById('ai-section');
    if (aiSection) aiSection.style.display = 'none';
    
    updateCalculateButton();
    showToast('Route cleared', 'info');
}

// ========== Data Management ==========
async function generateSampleData() {
    const center = state.map.getCenter();
    showLoading(true);
    
    try {
        const response = await fetch('/api/generate-sample-data/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                lat: center.lat,
                lon: center.lng,
                num_points: 100,
                radius_km: 5
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast(`Generated ${result.crimes_created} sample crime points`, 'success');
            setTimeout(() => location.reload(), 1500);
        } else {
            showToast('Failed to generate sample data', 'error');
        }
    } catch (error) {
        console.error('Sample data error:', error);
        showToast('Error generating sample data', 'error');
    } finally {
        showLoading(false);
    }
}

async function handleCSVUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.name.endsWith('.csv')) {
        showToast('Please upload a CSV file', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        const formData = new FormData();
        formData.append('csv_file', file);
        formData.append('clear_existing', 'false');
        
        const response = await fetch('/api/upload-csv/', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast(`Imported ${result.imported} crime records`, 'success');
            setTimeout(() => location.reload(), 1500);
        } else {
            showToast(`Import failed: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('CSV upload error:', error);
        showToast('Error uploading CSV file', 'error');
    } finally {
        showLoading(false);
        event.target.value = '';
    }
}

// ========== Location Search ==========
async function searchLocation() {
    const query = document.getElementById('location-search').value.trim();
    
    if (!query) {
        showToast('Please enter a location to search', 'warning');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
        const results = await response.json();
        
        if (results.length === 0) {
            showToast('Location not found', 'warning');
            showLoading(false);
            return;
        }
        
        const location = results[0];
        const lat = parseFloat(location.lat);
        const lon = parseFloat(location.lon);
        
        state.map.setView([lat, lon], 13);
        
        const searchMarker = L.marker([lat, lon], {
            icon: createCustomIcon('📍', '#f59e0b')
        }).addTo(state.map);
        
        searchMarker.bindPopup(`<b>${location.display_name}</b>`).openPopup();
        
        setTimeout(() => {
            state.map.removeLayer(searchMarker);
        }, 5000);
        
        showToast(`Found: ${location.display_name}`, 'success');
    } catch (error) {
        console.error('Search error:', error);
        showToast('Error searching location', 'error');
    } finally {
        showLoading(false);
    }
}

async function searchDestination() {
    const query = prompt('Enter destination to search:');
    if (!query) return;

    showLoading(true);
    
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
        const results = await response.json();
        
        if (results.length === 0) {
            showToast('Destination not found', 'warning');
            return;
        }
        
        const location = results[0];
        const lat = parseFloat(location.lat);
        const lon = parseFloat(location.lon);
        
        state.map.setView([lat, lon], 13);
        setEndPoint(lat, lon);
        showToast(`Destination set: ${location.display_name}`, 'success');
        
    } catch (error) {
        console.error('Search error:', error);
        showToast('Error searching destination', 'error');
    } finally {
        showLoading(false);
    }
}

// ========== UI Utilities ==========
function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.display = show ? 'flex' : 'none';
    }
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}


// ========== Safety News & Updates ==========
let isNewsPanelOpen = false;

window.toggleNewsPanel = function() {
    const panel = document.getElementById('news-panel');
    const badge = document.getElementById('news-badge');
    
    if (isNewsPanelOpen) {
        panel.style.right = '-400px';
    } else {
        panel.style.right = '20px';
        // Clear badge on open
        if(badge) badge.style.display = 'none';
        // Refresh news
        fetchSafetyNews();
    }
    isNewsPanelOpen = !isNewsPanelOpen;
}

async function fetchSafetyNews() {
    try {
        const response = await fetch('/api/news/latest/');
        const data = await response.json();
        
        if (data.success && data.news) {
            updateNewsUI(data.news);
        }
    } catch (error) {
        console.error('Error fetching news:', error);
    }
}

function updateNewsUI(newsItems) {
    const container = document.getElementById('news-feed-content');
    const badge = document.getElementById('news-badge');
    
    if (newsItems.length === 0) {
        container.innerHTML = '<p style="color: #94a3b8; text-align: center;">No active safety updates.</p>';
        return;
    }
    
    // Check for high priority to show badge
    const highPriorityCount = newsItems.filter(n => n.priority === 'high' || n.priority === 'critical').length;
    if (highPriorityCount > 0 && badge && !isNewsPanelOpen) {
        badge.textContent = highPriorityCount;
        badge.style.display = 'flex';
    }
    
    container.innerHTML = newsItems.map(item => `
        <div style="background: rgba(255,255,255,0.05); border-left: 4px solid ${getPriorityColor(item.priority)}; padding: 12px; margin-bottom: 12px; border-radius: 4px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                <span style="color: ${getPriorityColor(item.priority)}; font-size: 0.75rem; font-weight: bold; text-transform: uppercase;">${item.priority}</span>
                <span style="color: #94a3b8; font-size: 0.75rem;">${item.date}</span>
            </div>
            <h4 style="color: white; margin-bottom: 6px; font-size: 1rem;">${item.title}</h4>
            <p style="color: #cbd5e1; font-size: 0.875rem; line-height: 1.4;">${item.content}</p>
            ${item.image_url ? `<img src="${item.image_url}" style="width: 100%; border-radius: 4px; margin-top: 8px; max-height: 200px; object-fit: cover;">` : ''}
            <div style="margin-top: 8px; font-size: 0.75rem; color: #94a3b8;">
                Posted by: ${item.author}
            </div>
        </div>
    `).join('');
}

function getPriorityColor(priority) {
    switch(priority) {
        case 'critical': return '#ef4444'; // Red
        case 'high': return '#f97316';     // Orange
        case 'medium': return '#f59e0b';   // Amber
        default: return '#3b82f6';         // Blue
    }
}

// Initial fetch
setTimeout(fetchSafetyNews, 2000);
