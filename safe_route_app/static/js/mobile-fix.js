// Global variables
let activeMobilePanel = null;
let mapSelectionMode = false;
let selectionType = 'start';
let mobileSearchTimeout = null;

// Mobile Panel Management
function showMobilePanel(panelType) {
    if (activeMobilePanel) {
        closeMobilePanel(activeMobilePanel);
    }

    document.querySelectorAll('.mobile-nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const navItem = document.querySelector(`[onclick*="showMobilePanel('${panelType}')"]`);
    if (navItem) navItem.classList.add('active');

    const panelId = `mobile-${panelType}-panel`;
    const panel = document.getElementById(panelId);
    if (panel) {
        panel.style.display = 'block';
        panel.classList.add('show');
        setTimeout(() => panel.style.opacity = '1', 10);
        activeMobilePanel = panelType;
    }

    if (panelType === 'results') {
        if (typeof syncRouteResults === 'function') {
            syncRouteResults();
        }
    }
}

function closeMobilePanel(panelType) {
    const panelId = `mobile-${panelType}-panel`;
    const panel = document.getElementById(panelId);
    if (panel) {
        panel.classList.remove('show');
        panel.style.opacity = '0';
        setTimeout(() => panel.style.display = 'none', 300);
    }
    activeMobilePanel = null;

    // Reset navigation to route tab
    document.querySelectorAll('.mobile-nav-item').forEach(item => {
        item.classList.remove('active');
    });
    const routeTab = document.querySelector(`[onclick*="showMobilePanel('route')"]`);
    if (routeTab) routeTab.classList.add('active');
}

// Location Functions
function handleMobileLocationSearch(input, type) {
    clearTimeout(mobileSearchTimeout);
    const query = input.value.trim();
    
    if (query.length < 2) {
        hideMobileSuggestions();
        return;
    }

    mobileSearchTimeout = setTimeout(() => {
        searchLocations(query, type);
    }, 300);
}

function showLocationSuggestions(input, type) {
    if (input.value.trim().length === 0) {
        showQuickLocations(type);
    }
}

function showQuickLocations(type) {
    const suggestionsDiv = document.getElementById('mobile-suggestions');
    const quickLocations = [
        { icon: '🏠', name: 'Home' },
        { icon: '💼', name: 'Work' },
        { icon: '🏥', name: 'Hospital' }
    ];

    let html = '<div class="quick-locations">';
    quickLocations.forEach(loc => {
        html += `<button class="quick-location-btn" onclick="selectQuickLocation('${loc.name}', '${type}')">
            ${loc.icon} ${loc.name}
        </button>`;
    });
    html += '</div>';

    suggestionsDiv.innerHTML = html;
    suggestionsDiv.style.display = 'block';
}

function searchLocations(query, type) {
    // Use a CORS proxy for Nominatim API
    const proxyUrl = 'https://api.allorigins.win/raw?url=';
    const targetUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`;
    const url = proxyUrl + encodeURIComponent(targetUrl);
    
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            showSearchResults(data, type);
        })
        .catch(error => {
            console.error('Search error:', error);
            // Fallback to demo locations
            showDemoLocations(query, type);
        });
}

function showSearchResults(results, type) {
    const suggestionsDiv = document.getElementById('mobile-suggestions');
    
    if (results.length === 0) {
        suggestionsDiv.innerHTML = '<div class="suggestion-item"><span class="suggestion-text">No results found</span></div>';
        suggestionsDiv.style.display = 'block';
        return;
    }

    let html = '';
    results.forEach(result => {
        const mainText = result.display_name.split(',')[0];
        const subText = result.display_name.split(',').slice(1, 3).join(',');
        
        html += `
            <div class="suggestion-item" onclick="selectLocation('${result.lat}', '${result.lon}', '${mainText.replace(/'/g, "\\'")}', '${type}')">
                <span class="suggestion-icon">📍</span>
                <div class="suggestion-text">
                    <div class="suggestion-main">${mainText}</div>
                    <div class="suggestion-sub">${subText}</div>
                </div>
            </div>
        `;
    });

    suggestionsDiv.innerHTML = html;
    suggestionsDiv.style.display = 'block';
}

function selectLocation(lat, lon, name, type) {
    const input = document.getElementById(`mobile-${type}-location`);
    const desktopInput = document.getElementById(`${type}-location`);
    const checkBtn = document.getElementById(`${type}-check`);
    
    input.value = name;
    if (desktopInput) desktopInput.value = name;

    if (checkBtn) {
        checkBtn.style.display = 'flex';
    }

    const latLng = [parseFloat(lat), parseFloat(lon)];
    
    // Update global state for main.js compatibility
    if (type === 'start') {
        window.startPoint = latLng;
        // Update main.js state if available
        if (typeof state !== 'undefined') {
            state.startCoords = latLng;
        }
        // Use main.js function if available
        if (typeof setStartPoint === 'function') {
            setStartPoint(lat, lon, name);
        } else {
            // Fallback: create marker manually
            if (typeof map !== 'undefined' && map) {
                if (window.startMarker) map.removeLayer(window.startMarker);
                window.startMarker = L.marker(latLng, {
                    icon: L.divIcon({
                        className: 'custom-marker start-marker',
                        html: '🚩',
                        iconSize: [30, 30]
                    })
                }).addTo(map);
            }
        }
    } else {
        window.endPoint = latLng;
        // Update main.js state if available
        if (typeof state !== 'undefined') {
            state.endCoords = latLng;
        }
        // Use main.js function if available
        if (typeof setEndPoint === 'function') {
            setEndPoint(lat, lon, name);
        } else {
            // Fallback: create marker manually
            if (typeof map !== 'undefined' && map) {
                if (window.destinationMarker) map.removeLayer(window.destinationMarker);
                window.destinationMarker = L.marker(latLng, {
                    icon: L.divIcon({
                        className: 'custom-marker end-marker',
                        html: '🎯',
                        iconSize: [30, 30]
                    })
                }).addTo(map);
            }
        }
    }

    if (typeof map !== 'undefined' && map) {
        map.setView(latLng, 15);
        // Force map to refresh on mobile
        setTimeout(() => {
            map.invalidateSize();
        }, 100);
    }
    
    hideMobileSuggestions();
    updateMobileCalculateButton();
    
    // Enable desktop calculate button
    const desktopCalcBtn = document.getElementById('calculate-route');
    if (desktopCalcBtn && window.startPoint && window.endPoint) {
        desktopCalcBtn.disabled = false;
    }
    
    showToast(`${type === 'start' ? 'Start' : 'Destination'} set: ${name.split(',')[0]}`, 'success');
}

function hideMobileSuggestions() {
    const suggestionsDiv = document.getElementById('mobile-suggestions');
    suggestionsDiv.style.display = 'none';
}

// Map Selector Functions
function openMapSelector() {
    const popup = document.getElementById('mobile-map-popup');
    const bottomSheet = document.querySelector('.mobile-bottom-sheet');
    const mobileNav = document.querySelector('.mobile-nav');
    
    if (popup) {
        popup.style.display = 'flex';
    }
    if (bottomSheet) {
        bottomSheet.style.display = 'none';
    }
    if (mobileNav) {
        mobileNav.style.display = 'none';
    }
    
    mapSelectionMode = true;
    
    // Initialize popup map
    setTimeout(() => {
        initializePopupMap();
    }, 100);
}

function closeMapSelector() {
    const popup = document.getElementById('mobile-map-popup');
    const bottomSheet = document.querySelector('.mobile-bottom-sheet');
    const mobileNav = document.querySelector('.mobile-nav');
    
    if (popup) {
        popup.style.display = 'none';
    }
    if (bottomSheet) {
        bottomSheet.style.display = 'block';
    }
    if (mobileNav) {
        mobileNav.style.display = 'block';
    }
    
    mapSelectionMode = false;
    
    // Ensure map is properly sized when returning
    setTimeout(() => {
        if (typeof map !== 'undefined' && map) {
            map.invalidateSize();
        }
    }, 100);
}

// Utility Functions
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container') || createToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
        toast.style.position = 'fixed';
        toast.style.top = '120px';
        toast.style.left = '20px';
        toast.style.right = '20px';
        toast.style.width = 'auto';
        toast.style.minWidth = 'auto';
        toast.style.zIndex = '9999';
        toast.style.background = 'var(--bg-secondary)';
        toast.style.color = 'var(--text-primary)';
        toast.style.padding = '12px 16px';
        toast.style.borderRadius = '8px';
        toast.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
        toast.style.borderLeft = `4px solid ${getToastColor(type)}`;
        toast.style.fontSize = '0.9rem';
        toast.style.fontWeight = '500';
    }

    toast.innerHTML = `<div class="toast-message">${message}</div>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        setTimeout(() => {
            if (container.contains(toast)) {
                container.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.style.position = 'fixed';
    container.style.top = '20px';
    container.style.right = '20px';
    container.style.zIndex = '9999';
    document.body.appendChild(container);
    return container;
}

function getToastColor(type) {
    switch(type) {
        case 'success': return '#10b981';
        case 'warning': return '#f59e0b';
        case 'error': return '#ef4444';
        default: return '#3b82f6';
    }
}

function updateMobileCalculateButton() {
    const startInput = document.getElementById('mobile-start-location');
    const endInput = document.getElementById('mobile-end-location');
    const calcBtn = document.getElementById('mobile-calculate-btn');
    
    if (calcBtn && startInput && endInput) {
        const hasStart = startInput.value.trim() !== '';
        const hasEnd = endInput.value.trim() !== '';
        calcBtn.disabled = !(hasStart && hasEnd);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    const panels = ['mobile-route-panel', 'mobile-options-panel', 'mobile-profile-panel', 'mobile-tracking-panel'];
    panels.forEach(panelId => {
        const panel = document.getElementById(panelId);
        if (panel) {
            panel.style.display = 'none';
            panel.style.opacity = '0';
        }
    });

    // Fix mobile navigation clicks
    document.querySelectorAll('.mobile-nav-item').forEach((item) => {
        // Remove existing onclick handlers
        item.removeAttribute('onclick');
        
        item.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Determine panel type from the item content
            const span = this.querySelector('span');
            if (span) {
                const text = span.textContent.toLowerCase();
                let panelType = 'route';
                
                if (text.includes('option')) panelType = 'options';
                else if (text.includes('result')) panelType = 'results';
                else if (text.includes('tracking')) panelType = 'tracking';
                else if (text.includes('profile')) panelType = 'profile';
                
                showMobilePanel(panelType);
            }
        });
        
        // Add touch support
        item.addEventListener('touchstart', function(e) {
            e.preventDefault();
            this.click();
        });
    });
    
    // Wait for map to be ready, then add mobile click handler
    const checkMapReady = () => {
        if (typeof map !== 'undefined' && map) {
            map.on('click', handleMobileMapClick);
            // Force map resize on mobile
            setTimeout(() => {
                map.invalidateSize();
            }, 500);
        } else {
            setTimeout(checkMapReady, 500);
        }
    };
    checkMapReady();
    
    // Add mobile-specific event listeners
    const mobileCalcBtn = document.getElementById('mobile-calculate-btn');
    if (mobileCalcBtn) {
        mobileCalcBtn.addEventListener('click', triggerRouteCalculation);
    }
    
    // Add input listeners for mobile inputs
    const mobileStartInput = document.getElementById('mobile-start-location');
    const mobileEndInput = document.getElementById('mobile-end-location');
    
    if (mobileStartInput) {
        mobileStartInput.addEventListener('input', () => updateMobileCalculateButton());
    }
    if (mobileEndInput) {
        mobileEndInput.addEventListener('input', () => updateMobileCalculateButton());
    }
    
    // Initialize mobile calculate button state
    updateMobileCalculateButton();
    
    // Initialize tracking status
    updateTrackingStatus('No active route', 'inactive');
});

// Mobile map click handler
function handleMobileMapClick(e) {
    if (!mapSelectionMode) return;
    
    const lat = e.latlng.lat;
    const lon = e.latlng.lng;
    
    // Determine which location to set
    const startInput = document.getElementById('mobile-start-location');
    const endInput = document.getElementById('mobile-end-location');
    
    let targetType = 'start';
    if (startInput && startInput.value.trim() && (!endInput || !endInput.value.trim())) {
        targetType = 'end';
    }
    
    // Reverse geocode to get address
    reverseGeocodeWithFallback(lat, lon, (address) => {
        selectLocation(lat, lon, address, targetType);
        
        // Close map selector if both locations are set
        const startInput = document.getElementById('mobile-start-location');
        const endInput = document.getElementById('mobile-end-location');
        if (startInput && endInput && startInput.value.trim() && endInput.value.trim()) {
            closeMapSelector();
        }
    });
}

// Missing Functions - Add these to fix JavaScript errors
function syncRouteResults() {
    const desktopResults = document.getElementById('routes-container');
    const mobileResults = document.getElementById('mobile-routes-container');
    const routesStatus = document.getElementById('routes-status');
    
    if (desktopResults && mobileResults) {
        const desktopCards = desktopResults.querySelectorAll('.route-card');
        let mobileHTML = '';
        
        if (desktopCards.length === 0) {
            mobileHTML = '<div style="text-align: center; color: var(--text-muted); padding: 20px;">No routes found. Try different locations.</div>';
            if (routesStatus) {
                routesStatus.className = 'routes-status';
                routesStatus.querySelector('.status-message').textContent = 'No routes calculated yet';
            }
        } else {
            if (routesStatus) {
                routesStatus.className = 'routes-status has-routes';
                routesStatus.querySelector('.status-message').textContent = `${desktopCards.length} route${desktopCards.length > 1 ? 's' : ''} found - Select one to start navigation`;
            }
            
            desktopCards.forEach((card, index) => {
                const title = card.querySelector('.route-title')?.textContent || `Route ${index + 1}`;
                const score = card.querySelector('.route-score')?.textContent || 'N/A';
                const badge = card.querySelector('.route-badge')?.textContent || '';
                const details = card.querySelectorAll('.detail-item');
                const isRecommended = card.classList.contains('recommended');
                
                let detailsHTML = '';
                details.forEach(detail => {
                    const text = detail.textContent.trim();
                    if (text) {
                        const parts = text.split(':');
                        if (parts.length >= 2) {
                            const label = parts[0].trim();
                            const value = parts.slice(1).join(':').trim();
                            detailsHTML += `
                                <div class="mobile-detail-item">
                                    ${label}: <span class="mobile-detail-value">${value}</span>
                                </div>
                            `;
                        }
                    }
                });
                
                mobileHTML += `
                    <div class="mobile-route-card ${isRecommended ? 'recommended' : ''}" data-route-index="${index}">
                        <div class="mobile-route-header">
                            <span class="mobile-route-title">${title}${badge ? ` • ${badge}` : ''}</span>
                            <span class="mobile-route-score">${score}</span>
                        </div>
                        <div class="mobile-route-details">
                            ${detailsHTML}
                        </div>
                        ${isRecommended ? '<div style="text-align: center; margin-top: 8px; color: var(--saffron); font-size: 0.8rem; font-weight: 600;">⭐ RECOMMENDED</div>' : ''}
                        <div class="route-actions" style="margin-top: 12px; display: flex; gap: 8px;">
                            <button class="select-route-btn" onclick="startNavigation(${index})" style="flex: 1; background: var(--saffron-gradient); color: white; border: none; padding: 10px 16px; border-radius: 8px; font-size: 0.9rem; font-weight: 600;">🧭 Start Navigation</button>
                        </div>
                    </div>
                `;
            });
        }
        
        mobileResults.innerHTML = mobileHTML;
    }
}

// Start navigation with live tracking
function startNavigation(routeIndex) {
    const desktopCards = document.querySelectorAll('#routes-container .route-card');
    if (!desktopCards[routeIndex]) return;
    
    // Get route data from desktop card
    const routeCard = desktopCards[routeIndex];
    const routeData = {
        index: routeIndex,
        title: routeCard.querySelector('.route-title')?.textContent || `Route ${routeIndex + 1}`,
        score: routeCard.querySelector('.route-score')?.textContent || '0',
        grade: routeCard.querySelector('.route-badge')?.textContent?.replace('Grade ', '') || 'C',
        distance: parseFloat(routeCard.querySelector('.detail-value')?.textContent) || 0,
        coordinates: window.state?.currentRoutes?.[routeIndex]?.coordinates || []
    };
    
    // Store selected route globally
    window.selectedRoute = routeData;
    window.navigationActive = true;
    
    // Show route on map
    showRouteOnMap(routeIndex);
    
    // Start live tracking
    initializeNavigation(routeData);
    
    // Switch to tracking panel with proper content visibility
    if (typeof showMobilePanel === 'function') {
        showMobilePanel('tracking');
    }
    
    showToast(`🧭 Navigation started for ${routeData.title}`, 'success');
}

function showRouteOnMap(routeIndex) {
    if (!window.state?.routingControl) return;
    
    // Highlight selected route
    const routes = window.state.routingControl.getRoutes();
    if (routes && routes[routeIndex]) {
        // Clear existing route highlights
        if (window.selectedRouteLayer) {
            window.map.removeLayer(window.selectedRouteLayer);
        }
        
        // Add highlighted route
        const route = routes[routeIndex];
        window.selectedRouteLayer = L.polyline(route.coordinates.map(c => [c.lat, c.lng]), {
            color: '#10b981',
            weight: 8,
            opacity: 0.9,
            dashArray: '10, 5'
        }).addTo(window.map);
        
        // Fit map to route
        window.map.fitBounds(window.selectedRouteLayer.getBounds(), { padding: [20, 20] });
    }
}

function initializeNavigation(routeData) {
    // Update tracking status
    updateTrackingStatus(`Navigating ${routeData.title}`, 'active');
    
    // Show tracking info and route name
    const trackingInfo = document.getElementById('tracking-info');
    const routeNameElement = document.getElementById('selected-route-name');
    
    if (trackingInfo) {
        trackingInfo.style.display = 'block';
        document.getElementById('current-safety').textContent = routeData.score;
    }
    
    if (routeNameElement) {
        routeNameElement.textContent = routeData.title;
    }
    
    // Start position tracking
    if (navigator.geolocation) {
        trackingActive = true;
        trackingInterval = setInterval(updateNavigationPosition, 3000);
        updateNavigationPosition(); // Initial update
        
        // Show/hide buttons
        document.getElementById('start-tracking-btn').style.display = 'none';
        document.getElementById('stop-tracking-btn').style.display = 'flex';
    }
}

function updateNavigationPosition() {
    if (!trackingActive || !window.selectedRoute) return;
    
    navigator.geolocation.getCurrentPosition(
        function(position) {
            currentPosition = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy,
                timestamp: new Date()
            };
            
            // Update tracking map if visible
            updateTrackingMapPosition();
            
            // Update tracking display
            updateNavigationDisplay();
        },
        function(error) {
            console.error('Navigation position error:', error);
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 5000
        }
    );
}

// Initialize tracking map when panel opens
function initializeTrackingMap() {
    const trackingMapContainer = document.getElementById('tracking-map');
    if (!trackingMapContainer || window.trackingMap) return;
    
    // Create independent tracking map
    window.trackingMap = L.map('tracking-map').setView([20.5937, 78.9629], 13);
    
    // Add tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap contributors, © CartoDB',
        maxZoom: 19
    }).addTo(window.trackingMap);
    
    // Copy route from main map if available
    if (window.selectedRoute && window.selectedRoute.coordinates) {
        const routeCoords = window.selectedRoute.coordinates;
        if (routeCoords.length > 0) {
            window.trackingRouteLayer = L.polyline(routeCoords, {
                color: '#10b981',
                weight: 6,
                opacity: 0.8,
                dashArray: '10, 5'
            }).addTo(window.trackingMap);
            
            // Add start and end markers
            const startCoord = routeCoords[0];
            const endCoord = routeCoords[routeCoords.length - 1];
            
            L.marker(startCoord, {
                icon: L.divIcon({
                    className: 'route-marker',
                    html: '🚩',
                    iconSize: [30, 30]
                })
            }).addTo(window.trackingMap).bindPopup('Start');
            
            L.marker(endCoord, {
                icon: L.divIcon({
                    className: 'route-marker', 
                    html: '🎯',
                    iconSize: [30, 30]
                })
            }).addTo(window.trackingMap).bindPopup('Destination');
            
            window.trackingMap.fitBounds(window.trackingRouteLayer.getBounds(), { padding: [20, 20] });
        }
    }
    
    // Start real-time tracking immediately
    startRealTimeTracking();
}

function startRealTimeTracking() {
    if (!navigator.geolocation) {
        showToast('Geolocation not supported', 'error');
        return;
    }
    
    // Watch position with high accuracy
    window.trackingWatchId = navigator.geolocation.watchPosition(
        updateRealTimePosition,
        handleTrackingError,
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 1000
        }
    );
}

function updateRealTimePosition(position) {
    currentPosition = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: new Date(),
        speed: position.coords.speed,
        heading: position.coords.heading
    };
    
    updateTrackingMapPosition();
    updateNavigationDisplay();
}

function handleTrackingError(error) {
    console.error('Real-time tracking error:', error);
    let message = 'Location tracking failed';
    
    switch(error.code) {
        case error.PERMISSION_DENIED:
            message = 'Location permission denied';
            break;
        case error.POSITION_UNAVAILABLE:
            message = 'Location unavailable';
            break;
        case error.TIMEOUT:
            message = 'Location timeout';
            break;
    }
    
    showToast(message, 'error');
}

function updateTrackingMapPosition() {
    if (!window.trackingMap || !currentPosition) return;
    
    const latLng = [currentPosition.lat, currentPosition.lng];
    
    // Remove existing markers
    if (window.trackingLocationMarker) {
        window.trackingMap.removeLayer(window.trackingLocationMarker);
    }
    if (window.trackingAccuracyCircle) {
        window.trackingMap.removeLayer(window.trackingAccuracyCircle);
    }
    
    // Add current location marker with animation
    window.trackingLocationMarker = L.marker(latLng, {
        icon: L.divIcon({
            className: 'live-tracking-marker',
            html: `
                <div class="tracking-pulse">
                    <div class="tracking-dot"></div>
                    <div class="tracking-ring"></div>
                </div>
            `,
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        })
    }).addTo(window.trackingMap);
    
    // Add accuracy circle
    window.trackingAccuracyCircle = L.circle(latLng, {
        radius: Math.min(currentPosition.accuracy || 50, 100),
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.1,
        weight: 2,
        opacity: 0.6
    }).addTo(window.trackingMap);
    
    // Add location trail
    addLocationTrail(latLng);
    
    // Center map on current position with smooth animation
    window.trackingMap.setView(latLng, Math.max(window.trackingMap.getZoom(), 16), {
        animate: true,
        duration: 1
    });
}

// Location trail to show movement history
let locationTrail = [];
function addLocationTrail(latLng) {
    locationTrail.push(latLng);
    
    // Keep only last 20 positions
    if (locationTrail.length > 20) {
        locationTrail.shift();
    }
    
    // Remove existing trail
    if (window.trackingTrail) {
        window.trackingMap.removeLayer(window.trackingTrail);
    }
    
    // Add new trail if we have enough points
    if (locationTrail.length > 1) {
        window.trackingTrail = L.polyline(locationTrail, {
            color: '#3b82f6',
            weight: 3,
            opacity: 0.7,
            dashArray: '5, 5'
        }).addTo(window.trackingMap);
    }
}

function stopRealTimeTracking() {
    if (window.trackingWatchId) {
        navigator.geolocation.clearWatch(window.trackingWatchId);
        window.trackingWatchId = null;
    }
    
    // Clear trail
    locationTrail = [];
    if (window.trackingTrail) {
        window.trackingMap.removeLayer(window.trackingTrail);
    }
}

function updateNavigationDisplay() {
    if (!currentPosition || !window.selectedRoute) return;
    
    // Update current location display
    reverseGeocodeWithFallback(currentPosition.lat, currentPosition.lng, (address) => {
        const locationElement = document.getElementById('current-location');
        if (locationElement) {
            locationElement.textContent = address.split(',')[0] || 'Unknown location';
        }
    });
    
    // Calculate distance to destination
    if (window.endPoint) {
        const distance = calculateDistance(
            currentPosition.lat, 
            currentPosition.lng,
            window.endPoint[0],
            window.endPoint[1]
        );
        
        const distanceElement = document.getElementById('distance-remaining');
        if (distanceElement) {
            distanceElement.textContent = `${distance.toFixed(2)} km`;
        }
        
        // Calculate ETA (assuming 5 km/h walking speed)
        const eta = Math.round((distance / 5) * 60); // minutes
        const etaElement = document.getElementById('eta-time');
        if (etaElement) {
            etaElement.textContent = eta > 60 ? 
                `${Math.floor(eta/60)}h ${eta%60}m` : 
                `${eta}m`;
        }
        
        // Check if arrived (within 50 meters)
        if (distance < 0.05) {
            showToast('🎉 You have arrived at your destination!', 'success');
            stopLiveTracking();
        }
    }
}

function showAppInfo() {
    alert('RouteGuard v1.0\nSafety-First Route Planning\nBuilt with ❤️ for safer communities');
}

function searchInPopup(event) {
    const query = event && event.target ? event.target.value.trim() : 
                  (typeof event === 'string' ? event.trim() : 
                  document.getElementById('popup-search')?.value?.trim() || '');
    
    if (query.length < 2) return;
    
    // Use CORS proxy
    const proxyUrl = 'https://api.allorigins.win/raw?url=';
    const targetUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`;
    const url = proxyUrl + encodeURIComponent(targetUrl);
    
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            showPopupSearchResults(data);
        })
        .catch(error => {
            console.error('Search error:', error);
            showDemoLocations(query, 'popup');
        });
}

function showPopupSearchResults(results) {
    const resultsDiv = document.getElementById('popup-search-results');
    if (!resultsDiv) return;
    
    if (results.length === 0) {
        resultsDiv.innerHTML = '<div class="no-results">No results found</div>';
        return;
    }
    
    let html = '';
    results.forEach(result => {
        const name = result.display_name.split(',')[0];
        html += `<div class="search-result-item" onclick="selectPopupLocation('${result.lat}', '${result.lon}', '${name.replace(/'/g, "\\'")}')">
            📍 ${result.display_name}
        </div>`;
    });
    
    resultsDiv.innerHTML = html;
}

function selectPopupLocation(lat, lon, name) {
    const latLng = [parseFloat(lat), parseFloat(lon)];
    
    if (selectionType === 'start') {
        if (window.startMarker && typeof map !== 'undefined' && map) {
            map.removeLayer(window.startMarker);
        }
        if (typeof map !== 'undefined' && map) {
            window.startMarker = L.marker(latLng).addTo(map);
        }
        window.startPoint = latLng;
        const startInput = document.getElementById('start-location');
        if (startInput) startInput.value = name;
    } else {
        if (window.destinationMarker && typeof map !== 'undefined' && map) {
            map.removeLayer(window.destinationMarker);
        }
        if (typeof map !== 'undefined' && map) {
            window.destinationMarker = L.marker(latLng).addTo(map);
        }
        window.endPoint = latLng;
        const endInput = document.getElementById('end-location');
        if (endInput) endInput.value = name;
    }
    
    if (typeof map !== 'undefined' && map) {
        map.setView(latLng, 15);
    }
    
    closeMapSelector();
    showToast(`${selectionType === 'start' ? 'Start' : 'Destination'} set`, 'success');
}

function selectQuickLocation(locationName, type) {
    // For demo purposes, use current location or a default location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            selectLocation(lat, lon, locationName, type);
        }, function() {
            // Fallback to a default location (e.g., city center)
            selectLocation('12.9716', '77.5946', locationName, type);
        });
    } else {
        selectLocation('12.9716', '77.5946', locationName, type);
    }
}

// Mobile route calculation with proper integration
function triggerRouteCalculation() {
    const startInput = document.getElementById('mobile-start-location');
    const endInput = document.getElementById('mobile-end-location');
    
    if (!startInput.value.trim() || !endInput.value.trim()) {
        showToast('Please set both start and destination points', 'warning');
        return;
    }
    
    // Check if coordinates are available
    const hasStart = window.startPoint || (typeof state !== 'undefined' && state.startCoords);
    const hasEnd = window.endPoint || (typeof state !== 'undefined' && state.endCoords);
    
    if (!hasStart || !hasEnd) {
        showToast('Please select locations on map first', 'warning');
        return;
    }
    
    // Sync mobile inputs to desktop inputs
    const desktopStart = document.getElementById('start-location');
    const desktopEnd = document.getElementById('end-location');
    if (desktopStart) desktopStart.value = startInput.value;
    if (desktopEnd) desktopEnd.value = endInput.value;
    
    // Enable and trigger desktop calculate button
    const desktopCalcBtn = document.getElementById('calculate-route');
    if (desktopCalcBtn) {
        desktopCalcBtn.disabled = false;
        desktopCalcBtn.click();
        
        showToast('Calculating safest routes...', 'info');
        
        // Show results panel after calculation completes
        setTimeout(() => {
            showMobilePanel('results');
            syncRouteResults();
        }, 3000);
    } else {
        showToast('Route calculation unavailable', 'error');
    }
}

// Additional Mobile Functions
function useCurrentLocationMobile() {
    if (navigator.geolocation) {
        showToast('Getting your location...', 'info');
        navigator.geolocation.getCurrentPosition(
            function(position) {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                
                // Use fallback reverse geocoding
                reverseGeocodeWithFallback(lat, lon, (address) => {
                    selectLocation(lat, lon, address, 'start');
                });
            },
            function(error) {
                showToast('Location access denied', 'error');
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    } else {
        showToast('Geolocation not supported', 'error');
    }
}

function clearDestinationMobile() {
    const mobileEnd = document.getElementById('mobile-end-location');
    const desktopEnd = document.getElementById('end-location');
    const endCheck = document.getElementById('end-check');
    
    if (mobileEnd) mobileEnd.value = '';
    if (desktopEnd) desktopEnd.value = '';
    if (endCheck) endCheck.style.display = 'none';
    
    // Clear destination marker if exists
    if (window.destinationMarker && typeof map !== 'undefined' && map) {
        map.removeLayer(window.destinationMarker);
        window.destinationMarker = null;
    }
    
    window.endPoint = null;
    if (typeof state !== 'undefined') {
        state.endCoords = null;
    }
    
    updateMobileCalculateButton();
    showToast('Destination cleared', 'info');
}

function generateSampleDataMobile() {
    const desktopBtn = document.getElementById('generate-sample-data');
    if (desktopBtn) {
        desktopBtn.click();
        showToast('Generating sample crime data...', 'info');
        closeMobilePanel('options');
    }
}

function triggerCSVUploadMobile() {
    const csvInput = document.getElementById('csv-upload');
    if (csvInput) {
        csvInput.click();
        closeMobilePanel('options');
    }
}

function clearAllDataMobile() {
    if (confirm('Clear all routes and data?')) {
        const clearBtn = document.getElementById('clear-route');
        if (clearBtn) {
            clearBtn.click();
            showToast('Routes cleared', 'success');
        }
    }
    closeMobilePanel('options');
}

function confirmMapSelection() {
    const startInput = document.getElementById('mobile-start-location');
    const endInput = document.getElementById('mobile-end-location');
    
    if (startInput.value.trim() && endInput.value.trim()) {
        closeMapSelector();
        updateMobileCalculateButton();
        showToast('Locations confirmed', 'success');
    } else {
        showToast('Please select both start and destination', 'warning');
    }
}

function updatePopupStatus() {
    const startStatus = document.getElementById('popup-start-status');
    const endStatus = document.getElementById('popup-end-status');
    const confirmBtn = document.getElementById('confirm-selection');
    
    const startInput = document.getElementById('mobile-start-location');
    const endInput = document.getElementById('mobile-end-location');
    
    if (startStatus) startStatus.textContent = startInput?.value || 'Not selected';
    if (endStatus) endStatus.textContent = endInput?.value || 'Not selected';
    
    if (confirmBtn) {
        confirmBtn.disabled = !(startInput?.value && endInput?.value);
    }
}
// Demo locations fallback
function showDemoLocations(query, type) {
    const demoLocations = [
        { lat: 12.9716, lon: 77.5946, name: 'Bangalore City Center', display_name: 'Bangalore, Karnataka, India' },
        { lat: 19.0760, lon: 72.8777, name: 'Mumbai Central', display_name: 'Mumbai, Maharashtra, India' },
        { lat: 28.6139, lon: 77.2090, name: 'New Delhi', display_name: 'New Delhi, Delhi, India' },
        { lat: 13.0827, lon: 80.2707, name: 'Chennai Marina', display_name: 'Chennai, Tamil Nadu, India' },
        { lat: 22.5726, lon: 88.3639, name: 'Kolkata Center', display_name: 'Kolkata, West Bengal, India' }
    ];
    
    // Filter demo locations based on query
    const filtered = demoLocations.filter(loc => 
        loc.name.toLowerCase().includes(query.toLowerCase()) ||
        loc.display_name.toLowerCase().includes(query.toLowerCase())
    );
    
    if (type === 'popup') {
        showPopupSearchResults(filtered);
    } else {
        showSearchResults(filtered, type);
    }
    
    if (filtered.length === 0) {
        showToast('No locations found. Try a different search term.', 'warning');
    }
}

// Fix reverse geocoding with fallback
function reverseGeocodeWithFallback(lat, lon, callback) {
    const proxyUrl = 'https://api.allorigins.win/raw?url=';
    const targetUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
    const url = proxyUrl + encodeURIComponent(targetUrl);
    
    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error('Network error');
            return response.json();
        })
        .then(data => {
            if (data && data.display_name) {
                const shortName = data.display_name.split(',').slice(0, 3).join(',');
                callback(shortName);
            } else {
                callback(`Location (${lat.toFixed(4)}, ${lon.toFixed(4)})`);
            }
        })
        .catch(() => {
            callback(`Location (${lat.toFixed(4)}, ${lon.toFixed(4)})`);
        });
}
// Live Tracking Functions
let trackingInterval = null;
let currentPosition = null;
let trackingActive = false;

function extractRouteData(routeCard) {
    const title = routeCard.querySelector('.route-title')?.textContent || 'Selected Route';
    const score = routeCard.querySelector('.route-score')?.textContent || '0';
    const distance = routeCard.querySelector('.detail-item')?.textContent?.match(/[\d.]+/)?.[0] || '0';
    
    return {
        title: title,
        score: score,
        distance: parseFloat(distance),
        startTime: new Date(),
        coordinates: window.endPoint || [0, 0]
    };
}

function initializeRouteTracking(routeData) {
    window.selectedRoute = routeData;
    updateTrackingStatus('Route selected - Ready to track', 'inactive');
    
    const trackingInfo = document.getElementById('tracking-info');
    if (trackingInfo) {
        trackingInfo.style.display = 'block';
        document.getElementById('current-safety').textContent = routeData.score;
    }
}

function startLiveTracking() {
    if (!window.selectedRoute) {
        showToast('Please select a route first', 'warning');
        return;
    }
    
    trackingActive = true;
    updateTrackingStatus('Live tracking active', 'active');
    
    // Show/hide buttons
    document.getElementById('start-tracking-btn').style.display = 'none';
    document.getElementById('stop-tracking-btn').style.display = 'flex';
    
    // Start real-time tracking if not already started
    if (!window.trackingWatchId) {
        startRealTimeTracking();
    }
    
    showToast('Live tracking started', 'success');
}

function stopLiveTracking() {
    trackingActive = false;
    
    // Stop real-time tracking
    stopRealTimeTracking();
    
    updateTrackingStatus('Tracking stopped', 'inactive');
    
    // Show/hide buttons
    document.getElementById('start-tracking-btn').style.display = 'flex';
    document.getElementById('stop-tracking-btn').style.display = 'none';
    
    showToast('Live tracking stopped', 'info');
}

function updateCurrentPosition() {
    if (!trackingActive) return;
    
    navigator.geolocation.getCurrentPosition(
        function(position) {
            currentPosition = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy,
                timestamp: new Date()
            };
            
            updateTrackingDisplay();
            updateMapPosition();
        },
        function(error) {
            console.error('Geolocation error:', error);
            showToast('Location update failed', 'error');
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 30000
        }
    );
}

function updateTrackingDisplay() {
    if (!currentPosition || !window.selectedRoute) return;
    
    // Update current location display
    reverseGeocodeWithFallback(currentPosition.lat, currentPosition.lng, (address) => {
        const locationElement = document.getElementById('current-location');
        if (locationElement) {
            locationElement.textContent = address.split(',')[0] || 'Unknown location';
        }
    });
    
    // Calculate distance to destination
    if (window.selectedRoute.coordinates) {
        const distance = calculateDistance(
            currentPosition.lat, 
            currentPosition.lng,
            window.selectedRoute.coordinates[0],
            window.selectedRoute.coordinates[1]
        );
        
        const distanceElement = document.getElementById('distance-remaining');
        if (distanceElement) {
            distanceElement.textContent = `${distance.toFixed(2)} km`;
        }
        
        // Calculate ETA (assuming 5 km/h walking speed)
        const eta = Math.round((distance / 5) * 60); // minutes
        const etaElement = document.getElementById('eta-time');
        if (etaElement) {
            etaElement.textContent = eta > 60 ? 
                `${Math.floor(eta/60)}h ${eta%60}m` : 
                `${eta}m`;
        }
    }
}

function updateMapPosition() {
    if (!currentPosition || typeof map === 'undefined' || !map) return;
    
    const latLng = [currentPosition.lat, currentPosition.lng];
    
    // Remove existing current location marker
    if (window.currentLocationMarker) {
        map.removeLayer(window.currentLocationMarker);
    }
    
    // Add new current location marker
    window.currentLocationMarker = L.marker(latLng, {
        icon: L.divIcon({
            className: 'current-location-marker',
            html: '📍',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        })
    }).addTo(map);
    
    // Add accuracy circle
    if (window.accuracyCircle) {
        map.removeLayer(window.accuracyCircle);
    }
    
    window.accuracyCircle = L.circle(latLng, {
        radius: currentPosition.accuracy,
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.1,
        weight: 2
    }).addTo(map);
}

function centerOnLocation() {
    if (!currentPosition) {
        showToast('No current location available', 'warning');
        return;
    }
    
    if (window.trackingMap) {
        window.trackingMap.setView([currentPosition.lat, currentPosition.lng], 18, {
            animate: true,
            duration: 1
        });
        showToast('Centered on your location', 'success');
    }
}

function updateTrackingStatus(text, status) {
    const statusText = document.getElementById('tracking-text');
    const statusIndicator = document.getElementById('tracking-indicator');
    
    if (statusText) statusText.textContent = text;
    if (statusIndicator) {
        statusIndicator.className = `status-indicator ${status}`;
    }
}

function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Update mobile navigation to handle tracking
function showMobilePanel(panelType) {
    if (activeMobilePanel) {
        closeMobilePanel(activeMobilePanel);
    }

    document.querySelectorAll('.mobile-nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const navItem = document.querySelector(`[onclick*="showMobilePanel('${panelType}')"]`);
    if (navItem) navItem.classList.add('active');

    const panelId = `mobile-${panelType}-panel`;
    const panel = document.getElementById(panelId);
    if (panel) {
        panel.style.display = 'block';
        panel.classList.add('show');
        setTimeout(() => panel.style.opacity = '1', 10);
        activeMobilePanel = panelType;
    }

    if (panelType === 'results') {
        if (typeof syncRouteResults === 'function') {
            syncRouteResults();
        }
    } else if (panelType === 'tracking') {
        // Update tracking display when panel opens
        if (trackingActive && currentPosition) {
            updateTrackingDisplay();
        }
    }
}
// Clear routes functionality
function clearAllRoutes() {
    if (confirm('Clear all calculated routes?')) {
        // Clear desktop routes
        const desktopBtn = document.getElementById('clear-route');
        if (desktopBtn) {
            desktopBtn.click();
        }
        
        // Clear mobile routes display
        const mobileResults = document.getElementById('mobile-routes-container');
        const routesStatus = document.getElementById('routes-status');
        
        if (mobileResults) {
            mobileResults.innerHTML = '';
        }
        
        if (routesStatus) {
            routesStatus.className = 'routes-status';
            routesStatus.querySelector('.status-message').textContent = 'Routes cleared';
        }
        
        // Stop any active tracking
        if (trackingActive) {
            stopLiveTracking();
        }
        
        // Clear selected route data
        window.selectedRoute = null;
        
        showToast('All routes cleared', 'success');
        
        // Auto-close panel after clearing
        setTimeout(() => {
            closeMobilePanel('results');
        }, 1500);
    }
}
// Popup map functionality
let popupMap = null;
let popupStartMarker = null;
let popupEndMarker = null;

function initializePopupMap() {
    const mapContainer = document.getElementById('popup-map');
    if (!mapContainer || popupMap) return;
    
    // Initialize popup map
    popupMap = L.map('popup-map').setView([20.5937, 78.9629], 6);
    
    // Add tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap contributors, © CartoDB',
        maxZoom: 19
    }).addTo(popupMap);
    
    // Add click handler
    popupMap.on('click', handlePopupMapClick);
    
    // Copy existing markers if any
    if (window.startPoint) {
        popupStartMarker = L.marker(window.startPoint, {
            icon: L.divIcon({
                className: 'custom-marker start-marker',
                html: '🚩',
                iconSize: [30, 30]
            })
        }).addTo(popupMap);
    }
    
    if (window.endPoint) {
        popupEndMarker = L.marker(window.endPoint, {
            icon: L.divIcon({
                className: 'custom-marker end-marker', 
                html: '🎯',
                iconSize: [30, 30]
            })
        }).addTo(popupMap);
    }
    
    // Fit bounds if markers exist
    if (popupStartMarker || popupEndMarker) {
        const group = new L.featureGroup([popupStartMarker, popupEndMarker].filter(m => m));
        popupMap.fitBounds(group.getBounds().pad(0.1));
    }
}

function handlePopupMapClick(e) {
    const lat = e.latlng.lat;
    const lon = e.latlng.lng;
    
    const startInput = document.getElementById('mobile-start-location');
    const endInput = document.getElementById('mobile-end-location');
    
    let targetType = 'start';
    if (startInput && startInput.value.trim() && (!endInput || !endInput.value.trim())) {
        targetType = 'end';
    }
    
    // Add marker to popup map
    const latLng = [lat, lon];
    
    if (targetType === 'start') {
        if (popupStartMarker) popupMap.removeLayer(popupStartMarker);
        popupStartMarker = L.marker(latLng, {
            icon: L.divIcon({
                className: 'custom-marker start-marker',
                html: '🚩',
                iconSize: [30, 30]
            })
        }).addTo(popupMap);
        window.startPoint = latLng;
    } else {
        if (popupEndMarker) popupMap.removeLayer(popupEndMarker);
        popupEndMarker = L.marker(latLng, {
            icon: L.divIcon({
                className: 'custom-marker end-marker',
                html: '🎯', 
                iconSize: [30, 30]
            })
        }).addTo(popupMap);
        window.endPoint = latLng;
    }
    
    // Update inputs
    reverseGeocodeWithFallback(lat, lon, (address) => {
        selectLocation(lat, lon, address, targetType);
        updatePopupStatus();
    });
}

function closeMapSelector() {
    const popup = document.getElementById('mobile-map-popup');
    const bottomSheet = document.querySelector('.mobile-bottom-sheet');
    const mobileNav = document.querySelector('.mobile-nav');
    
    if (popup) {
        popup.style.display = 'none';
    }
    if (bottomSheet) {
        bottomSheet.style.display = 'block';
    }
    if (mobileNav) {
        mobileNav.style.display = 'block';
    }
    
    // Cleanup popup map
    if (popupMap) {
        popupMap.remove();
        popupMap = null;
        popupStartMarker = null;
        popupEndMarker = null;
    }
    
    mapSelectionMode = false;
}

// Fix navigation panel overlap
function showMobilePanel(panelType) {
    // Don't close if same panel is already open
    if (activeMobilePanel === panelType) {
        return;
    }
    
    // Close any open panel first
    if (activeMobilePanel) {
        closeMobilePanel(activeMobilePanel);
    }

    // Update navigation active state
    document.querySelectorAll('.mobile-nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Find nav item by checking span text content
    document.querySelectorAll('.mobile-nav-item').forEach(item => {
        const span = item.querySelector('span');
        if (span) {
            const text = span.textContent.toLowerCase();
            if ((text.includes('route') && panelType === 'route') ||
                (text.includes('option') && panelType === 'options') ||
                (text.includes('result') && panelType === 'results') ||
                (text.includes('tracking') && panelType === 'tracking') ||
                (text.includes('profile') && panelType === 'profile')) {
                item.classList.add('active');
            }
        }
    });

    // Show the requested panel
    const panelId = `mobile-${panelType}-panel`;
    const panel = document.getElementById(panelId);
    if (panel) {
        panel.style.display = 'block';
        panel.classList.add('show');
        setTimeout(() => panel.style.opacity = '1', 10);
        activeMobilePanel = panelType;
    }

    // Special handling
    if (panelType === 'results') {
        if (typeof syncRouteResults === 'function') {
            syncRouteResults();
        }
    } else if (panelType === 'tracking') {
        if (trackingActive && currentPosition) {
            updateTrackingDisplay();
        }
    }
}