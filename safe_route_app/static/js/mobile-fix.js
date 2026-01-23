// Global variables
let activeMobilePanel = null;
let mapSelectionMode = false;
let selectionType = 'start';
let searchTimeout = null;

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
    clearTimeout(searchTimeout);
    const query = input.value.trim();
    
    if (query.length < 2) {
        hideMobileSuggestions();
        return;
    }

    searchTimeout = setTimeout(() => {
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
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            showSearchResults(data, type);
        })
        .catch(error => {
            console.error('Search error:', error);
            showToast('Search failed. Try again.', 'error');
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
    const checkBtn = document.getElementById(`${type}-check`);
    
    input.value = name;

    if (checkBtn) {
        checkBtn.style.display = 'flex';
    }

    const latLng = [parseFloat(lat), parseFloat(lon)];
    
    if (type === 'start') {
        // Use main.js functions
        if (typeof setStartPoint === 'function') {
            setStartPoint(lat, lon, name);
        } else {
            // Fallback
            window.startPoint = latLng;
            if (typeof map !== 'undefined' && map) {
                if (window.startMarker) map.removeLayer(window.startMarker);
                window.startMarker = L.marker(latLng).addTo(map);
            }
        }
    } else {
        // Use main.js functions
        if (typeof setEndPoint === 'function') {
            setEndPoint(lat, lon, name);
        } else {
            // Fallback
            window.endPoint = latLng;
            if (typeof map !== 'undefined' && map) {
                if (window.destinationMarker) map.removeLayer(window.destinationMarker);
                window.destinationMarker = L.marker(latLng).addTo(map);
            }
        }
    }

    if (typeof map !== 'undefined' && map) {
        map.setView(latLng, 15);
    }
    hideMobileSuggestions();
    updateMobileCalculateButton();
    
    showToast(`${type === 'start' ? 'Start' : 'Destination'} set`, 'success');
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
    
    // Ensure map is visible and properly sized
    setTimeout(() => {
        if (typeof map !== 'undefined' && map) {
            map.invalidateSize();
        }
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
    console.log(`Toast: ${message} (${type})`);
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
    const panels = ['mobile-route-panel', 'mobile-options-panel', 'mobile-profile-panel'];
    panels.forEach(panelId => {
        const panel = document.getElementById(panelId);
        if (panel) {
            panel.style.display = 'none';
            panel.style.opacity = '0';
        }
    });

    document.querySelectorAll('.mobile-nav-item').forEach((item) => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const onclickAttr = this.getAttribute('onclick');
            if (onclickAttr) {
                const match = onclickAttr.match(/showMobilePanel\('([^']+)'\)/);
                if (match) {
                    showMobilePanel(match[1]);
                }
            }
        });
    });
    
    // Wait for map to be ready, then add mobile click handler
    const checkMapReady = () => {
        if (typeof map !== 'undefined' && map) {
            map.on('click', handleMobileMapClick);
        } else {
            setTimeout(checkMapReady, 500);
        }
    };
    checkMapReady();
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
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`)
        .then(response => response.json())
        .then(data => {
            const address = data.display_name ? 
                data.display_name.split(',').slice(0, 3).join(',') : 
                `Location (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
            
            selectLocation(lat, lon, address, targetType);
            
            // Close map selector if both locations are set
            if (startInput.value.trim() && endInput.value.trim()) {
                closeMapSelector();
            }
        })
        .catch(() => {
            const address = `Location (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
            selectLocation(lat, lon, address, targetType);
            
            // Close map selector if both locations are set
            if (startInput.value.trim() && endInput.value.trim()) {
                closeMapSelector();
            }
        });
}

// Missing Functions - Add these to fix JavaScript errors
function syncRouteResults() {
    // Sync route results between desktop and mobile views
    const desktopResults = document.getElementById('routes-container');
    const mobileResults = document.getElementById('mobile-routes-container');
    
    if (desktopResults && mobileResults) {
        // Copy the content from desktop to mobile
        mobileResults.innerHTML = desktopResults.innerHTML;
        
        // Update mobile-specific styling and click handlers
        const mobileCards = mobileResults.querySelectorAll('.route-card');
        mobileCards.forEach((card, index) => {
            card.classList.add('mobile-route-card');
            card.onclick = () => selectMobileRoute(index);
        });
    }
}

function selectMobileRoute(index) {
    // Find the corresponding desktop route card and click it
    const desktopCards = document.querySelectorAll('#routes-container .route-card');
    if (desktopCards[index]) {
        const chooseBtn = desktopCards[index].querySelector('button');
        if (chooseBtn) {
            chooseBtn.click();
            showToast('Route selected', 'success');
            closeMobilePanel('results');
        }
    }
}

function showAppInfo() {
    alert('RouteGuard v1.0\nSafety-First Route Planning\nBuilt with ❤️ for safer communities');
}

function searchInPopup(input) {
    const query = input.value ? input.value.trim() : input.target.value.trim();
    if (query.length < 2) return;
    
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            showPopupSearchResults(data);
        })
        .catch(error => {
            console.error('Search error:', error);
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

function triggerRouteCalculation() {
    // Check if coordinates are set in main.js state
    const hasStart = (typeof state !== 'undefined' && state.startCoords) || window.startPoint;
    const hasEnd = (typeof state !== 'undefined' && state.endCoords) || window.endPoint;
    
    if (!hasStart || !hasEnd) {
        showToast('Please set both start and destination points', 'error');
        return;
    }
    
    // Call the main route calculation function if it exists
    if (typeof calculateRoute === 'function') {
        calculateRoute();
        showToast('Calculating safest routes...', 'info');
        
        // Show results panel after a delay
        setTimeout(() => {
            showMobilePanel('results');
        }, 2000);
    } else {
        showToast('Route calculation function not available', 'error');
    }
}