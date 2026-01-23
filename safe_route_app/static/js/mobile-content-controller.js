// Content Visibility Controller for Mobile Panels
// Controls what content is visible on each page/panel

// Control content visibility based on active panel
function updateContentVisibility(panelType) {
    const mapContainer = document.querySelector('.map-container');
    const bottomSheet = document.querySelector('.mobile-bottom-sheet');
    const topBar = document.querySelector('.mobile-top-bar');
    
    // Hide all by default
    if (mapContainer) mapContainer.style.display = 'none';
    if (bottomSheet) bottomSheet.style.display = 'none';
    if (topBar) topBar.style.display = 'none';
    
    switch(panelType) {
        case 'route':
            // Only route page shows map and location inputs
            if (mapContainer) mapContainer.style.display = 'block';
            if (bottomSheet) bottomSheet.style.display = 'block';
            if (topBar) topBar.style.display = 'block';
            break;
            
        case 'results':
        case 'tracking':
        case 'options':
        case 'profile':
            // All other pages are independent - no map or inputs
            break;
    }
    
    // Force map resize when shown
    if (mapContainer && mapContainer.style.display === 'block') {
        setTimeout(() => {
            if (typeof map !== 'undefined' && map) {
                map.invalidateSize();
            }
        }, 100);
    }
}

// Enhanced showMobilePanel with content control
function showMobilePanelWithContent(panelType) {
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

    // Show/hide content based on panel type
    updateContentVisibility(panelType);

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
        // Initialize tracking map
        setTimeout(() => {
            initializeTrackingMap();
        }, 100);
        
        if (trackingActive && currentPosition) {
            updateTrackingDisplay();
        }
    } else if (panelType === 'profile') {
        if (typeof updateMobileUserInfo === 'function' && typeof getCurrentUser === 'function') {
            updateMobileUserInfo(getCurrentUser());
        }
    }
}

// Override the original showMobilePanel function
if (typeof showMobilePanel !== 'undefined') {
    window.originalShowMobilePanel = showMobilePanel;
}
window.showMobilePanel = showMobilePanelWithContent;

// Enhanced closeMobilePanel with content reset
function closeMobilePanelWithContent(panelType) {
    const panelId = `mobile-${panelType}-panel`;
    const panel = document.getElementById(panelId);
    if (panel) {
        panel.classList.remove('show');
        panel.style.opacity = '0';
        setTimeout(() => panel.style.display = 'none', 300);
    }
    activeMobilePanel = null;

    // Reset navigation to route tab and show route content
    document.querySelectorAll('.mobile-nav-item').forEach(item => {
        item.classList.remove('active');
    });
    const routeTab = document.querySelector(`[onclick*="showMobilePanel('route')"]`);
    if (routeTab) routeTab.classList.add('active');
    
    // Show route content by default
    updateContentVisibility('route');
}

// Override the original closeMobilePanel function
if (typeof closeMobilePanel !== 'undefined') {
    window.originalCloseMobilePanel = closeMobilePanel;
}
window.closeMobilePanel = closeMobilePanelWithContent;

// Initialize with route panel visible
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        updateContentVisibility('route');
    }, 500);
});

// Export functions
window.updateContentVisibility = updateContentVisibility;
window.showMobilePanelWithContent = showMobilePanelWithContent;
window.closeMobilePanelWithContent = closeMobilePanelWithContent;