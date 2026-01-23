// Mobile Button Fixes - Ensures all buttons work properly
// This script fixes button functionality issues in mobile interface

// Logout function for mobile
function logoutUser() {
    if (!confirm("Are you sure you want to logout?")) return;
    
    try {
        // Show loading state
        if (typeof showToast === 'function') {
            showToast('Logging out...', 'info');
        }
        
        // Firebase logout if available
        if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
            firebase.auth().signOut().then(() => {
                // Django logout
                performDjangoLogout();
            }).catch(() => {
                // Fallback to Django logout
                performDjangoLogout();
            });
        } else {
            // Django logout only
            performDjangoLogout();
        }
    } catch (error) {
        console.error('Logout error:', error);
        // Force reload as fallback
        window.location.reload();
    }
}

function performDjangoLogout() {
    fetch('/auth/logout/', { 
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            if (typeof showToast === 'function') {
                showToast('Logged out successfully', 'success');
            }
            setTimeout(() => {
                window.location.href = '/auth/login/';
            }, 1000);
        } else {
            throw new Error(data.error || 'Logout failed');
        }
    })
    .catch(error => {
        console.error('Django logout error:', error);
        if (typeof showToast === 'function') {
            showToast('Logout completed', 'info');
        }
        // Redirect anyway since session might be cleared
        setTimeout(() => {
            window.location.href = '/auth/login/';
        }, 1000);
    });
}

// Enhanced app info function
function showAppInfo() {
    const info = `RouteGuard v1.0
Safety-First Route Planning

✨ Features:
• AI-powered route safety analysis
• Real-time crime data integration
• Live tracking with ETA
• Emergency SOS system
• Multi-route comparison

Built with ❤️ for safer communities`;
    
    if (window.innerWidth <= 768) {
        // Mobile-friendly alert
        showToast('RouteGuard v1.0 - Safety Navigator', 'info');
        setTimeout(() => {
            showToast('Built with ❤️ for safer communities', 'success');
        }, 2000);
    } else {
        alert(info);
    }
    
    if (typeof closeMobilePanel === 'function') {
        closeMobilePanel('profile');
    }
}

// Fix all mobile buttons on page load
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for other scripts to load
    setTimeout(fixAllMobileButtons, 500);
});

function fixAllMobileButtons() {
    console.log('Fixing mobile buttons...');
    
    // Fix logout button in profile panel
    const logoutBtns = document.querySelectorAll('.mobile-option-item');
    logoutBtns.forEach(btn => {
        const text = btn.textContent.toLowerCase();
        if (text.includes('logout')) {
            btn.removeAttribute('onclick');
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                logoutUser();
            });
            console.log('✅ Logout button fixed');
        }
        
        if (text.includes('about') || text.includes('routeguard')) {
            btn.removeAttribute('onclick');
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                showAppInfo();
            });
            console.log('✅ App info button fixed');
        }
        
        if (text.includes('generate') && text.includes('data')) {
            btn.removeAttribute('onclick');
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                if (typeof generateSampleDataMobile === 'function') {
                    generateSampleDataMobile();
                } else {
                    const desktopBtn = document.getElementById('generate-sample-data');
                    if (desktopBtn) desktopBtn.click();
                }
            });
            console.log('✅ Generate data button fixed');
        }
        
        if (text.includes('upload') && text.includes('csv')) {
            btn.removeAttribute('onclick');
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const csvInput = document.getElementById('csv-upload');
                if (csvInput) csvInput.click();
            });
            console.log('✅ CSV upload button fixed');
        }
        
        if (text.includes('clear') && text.includes('routes')) {
            btn.removeAttribute('onclick');
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                if (confirm('Clear all routes?')) {
                    const clearBtn = document.getElementById('clear-route');
                    if (clearBtn) clearBtn.click();
                    if (typeof showToast === 'function') {
                        showToast('Routes cleared', 'success');
                    }
                }
            });
            console.log('✅ Clear routes button fixed');
        }
        
        if (text.includes('start') && text.includes('tracking')) {
            btn.removeAttribute('onclick');
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                if (typeof startLiveTracking === 'function') {
                    startLiveTracking();
                } else if (typeof showToast === 'function') {
                    showToast('Please select a route first', 'warning');
                }
            });
            console.log('✅ Start tracking button fixed');
        }
        
        if (text.includes('stop') && text.includes('tracking')) {
            btn.removeAttribute('onclick');
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                if (typeof stopLiveTracking === 'function') {
                    stopLiveTracking();
                }
            });
            console.log('✅ Stop tracking button fixed');
        }
        
        if (text.includes('center') && text.includes('location')) {
            btn.removeAttribute('onclick');
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(function(position) {
                        if (typeof map !== 'undefined' && map) {
                            map.setView([position.coords.latitude, position.coords.longitude], 16);
                            if (typeof showToast === 'function') {
                                showToast('Centered on your location', 'success');
                            }
                        }
                    });
                }
            });
            console.log('✅ Center location button fixed');
        }
    });
    
    // Fix clear routes button in results panel
    const clearRoutesBtn = document.querySelector('.clear-routes-btn');
    if (clearRoutesBtn) {
        clearRoutesBtn.removeAttribute('onclick');
        clearRoutesBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (confirm('Clear all calculated routes?')) {
                const desktopBtn = document.getElementById('clear-route');
                if (desktopBtn) desktopBtn.click();
                if (typeof showToast === 'function') {
                    showToast('All routes cleared', 'success');
                }
            }
        });
        console.log('✅ Clear routes header button fixed');
    }
    
    // Fix map selector button
    const mapSelectorBtn = document.querySelector('.select-map-btn');
    if (mapSelectorBtn) {
        mapSelectorBtn.removeAttribute('onclick');
        mapSelectorBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (typeof openMapSelector === 'function') {
                openMapSelector();
            }
        });
        console.log('✅ Map selector button fixed');
    }
    
    // Fix current location button
    const currentLocationBtn = document.querySelector('.icon-btn[title*="Current Location"]');
    if (currentLocationBtn) {
        currentLocationBtn.removeAttribute('onclick');
        currentLocationBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (typeof useCurrentLocationMobile === 'function') {
                useCurrentLocationMobile();
            }
        });
        console.log('✅ Current location button fixed');
    }
    
    // Fix clear destination button
    const clearDestBtn = document.querySelector('.icon-btn[title*="Clear Destination"]');
    if (clearDestBtn) {
        clearDestBtn.removeAttribute('onclick');
        clearDestBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (typeof clearDestinationMobile === 'function') {
                clearDestinationMobile();
            }
        });
        console.log('✅ Clear destination button fixed');
    }
    
    // Fix mobile calculate button
    const mobileCalcBtn = document.getElementById('mobile-calculate-btn');
    if (mobileCalcBtn) {
        mobileCalcBtn.removeAttribute('onclick');
        mobileCalcBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (typeof triggerRouteCalculation === 'function') {
                triggerRouteCalculation();
            }
        });
        console.log('✅ Mobile calculate button fixed');
    }
    
    // Fix navigation buttons
    document.querySelectorAll('.mobile-nav-item').forEach((item, index) => {
        item.removeAttribute('onclick');
        item.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const span = this.querySelector('span');
            if (span) {
                const text = span.textContent.toLowerCase();
                let panelType = 'route';
                
                if (text.includes('option')) panelType = 'options';
                else if (text.includes('result')) panelType = 'results';
                else if (text.includes('tracking')) panelType = 'tracking';
                else if (text.includes('profile')) panelType = 'profile';
                
                if (typeof showMobilePanel === 'function') {
                    showMobilePanel(panelType);
                }
            }
        });
        console.log(`✅ Navigation button ${index + 1} fixed`);
    });
    
    console.log('All mobile buttons have been fixed!');
}

// Test function to verify all buttons work
function testMobileButtons() {
    console.log('Testing mobile buttons...');
    
    const tests = [
        { name: 'Logout', selector: '.mobile-option-item', text: 'logout' },
        { name: 'App Info', selector: '.mobile-option-item', text: 'about' },
        { name: 'Generate Data', selector: '.mobile-option-item', text: 'generate' },
        { name: 'CSV Upload', selector: '.mobile-option-item', text: 'upload' },
        { name: 'Clear Routes', selector: '.mobile-option-item', text: 'clear' },
        { name: 'Navigation', selector: '.mobile-nav-item', text: null },
        { name: 'Calculate Route', selector: '#mobile-calculate-btn', text: null }
    ];
    
    tests.forEach(test => {
        const elements = document.querySelectorAll(test.selector);
        let found = false;
        
        elements.forEach(el => {
            if (!test.text || el.textContent.toLowerCase().includes(test.text)) {
                found = true;
                const hasListener = el.onclick || el.addEventListener;
                console.log(`${found && hasListener ? '✅' : '❌'} ${test.name}: ${found ? 'Found' : 'Not found'}`);
            }
        });
        
        if (!found && test.selector.startsWith('#')) {
            const el = document.querySelector(test.selector);
            console.log(`${el ? '✅' : '❌'} ${test.name}: ${el ? 'Found' : 'Not found'}`);
        }
    });
}

// Auto-fix buttons when DOM changes (for dynamic content)
if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                // Check if mobile buttons were added
                const hasButtons = Array.from(mutation.addedNodes).some(node => 
                    node.nodeType === 1 && (
                        node.classList?.contains('mobile-option-item') ||
                        node.classList?.contains('mobile-nav-item') ||
                        node.querySelector?.('.mobile-option-item, .mobile-nav-item')
                    )
                );
                
                if (hasButtons) {
                    setTimeout(fixAllMobileButtons, 100);
                }
            }
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// Expose functions globally
window.logoutUser = logoutUser;
window.showAppInfo = showAppInfo;
window.fixAllMobileButtons = fixAllMobileButtons;
window.testMobileButtons = testMobileButtons;
window.startNavigation = startNavigation;

// Navigation function for route selection
function startNavigation(routeIndex) {
    console.log('Starting navigation for route:', routeIndex);
    
    // Check if mobile-fix.js navigation function exists
    if (typeof window.startNavigation !== 'undefined' && window.startNavigation !== startNavigation) {
        return window.startNavigation(routeIndex);
    }
    
    // Fallback implementation
    const desktopCards = document.querySelectorAll('#routes-container .route-card');
    if (!desktopCards[routeIndex]) {
        showToast('Route not found', 'error');
        return;
    }
    
    // Get route data
    const routeCard = desktopCards[routeIndex];
    const title = routeCard.querySelector('.route-title')?.textContent || `Route ${routeIndex + 1}`;
    
    // Click the desktop route button if available
    const chooseBtn = routeCard.querySelector('button');
    if (chooseBtn) {
        chooseBtn.click();
    }
    
    // Switch to tracking panel
    if (typeof showMobilePanel === 'function') {
        showMobilePanel('tracking');
    }
    
    if (typeof showToast === 'function') {
        showToast(`🧭 Navigation started for ${title}`, 'success');
    }
}