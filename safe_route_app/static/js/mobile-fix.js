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
        if (window.startMarker && typeof map !== 'undefined' && map) {
            map.removeLayer(window.startMarker);
        }
        if (typeof map !== 'undefined' && map) {
            window.startMarker = L.marker(latLng).addTo(map);
        }
        window.startPoint = latLng;
    } else {
        if (window.destinationMarker && typeof map !== 'undefined' && map) {
            map.removeLayer(window.destinationMarker);
        }
        if (typeof map !== 'undefined' && map) {
            window.destinationMarker = L.marker(latLng).addTo(map);
        }
        window.endPoint = latLng;
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
    
    popup.style.display = 'flex';
    bottomSheet.style.display = 'none';
    mobileNav.style.display = 'none';
    
    mapSelectionMode = true;
}

function closeMapSelector() {
    const popup = document.getElementById('mobile-map-popup');
    const bottomSheet = document.querySelector('.mobile-bottom-sheet');
    const mobileNav = document.querySelector('.mobile-nav');
    
    popup.style.display = 'none';
    bottomSheet.style.display = 'block';
    mobileNav.style.display = 'block';
    
    mapSelectionMode = false;
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
});

// Missing Functions - Add these to fix JavaScript errors
function syncRouteResults() {
    // Sync route results between desktop and mobile views
    const desktopResults = document.getElementById('route-results');
    const mobileResults = document.getElementById('mobile-results-content');
    
    if (desktopResults && mobileResults) {
        mobileResults.innerHTML = desktopResults.innerHTML;
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
    if (!window.startPoint || !window.endPoint) {
        showToast('Please set both start and destination points', 'error');
        return;
    }
    
    // Call the main route calculation function if it exists
    if (typeof calculateRoute === 'function') {
        calculateRoute();
    } else if (typeof findSafestRoute === 'function') {
        findSafestRoute();
    } else {
        showToast('Route calculation function not available', 'error');
    }
}