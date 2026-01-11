/**
 * SOS Emergency Handler
 * Handles SOS button, countdown, GPS tracking, audio/video recording
 */

class SOSHandler {
    constructor() {
        this.isActive = false;
        this.alertId = null;
        this.countdownTimer = null;
        this.locationInterval = null;
        this.recordingStartTime = null;
        this.recordingTimer = null;
        this.audioRecorder = null;
        this.videoRecorder = null;
        this.audioChunks = [];
        this.videoChunks = [];
        
        this.init();
    }
    
    init() {
        // Bind event listeners
        document.getElementById('sos-trigger').addEventListener('click', () => this.startCountdown());
        document.getElementById('cancel-sos').addEventListener('click', () => this.cancelCountdown());
        document.getElementById('end-sos').addEventListener('click', () => this.endSOS());
    }
    
    startCountdown() {
        if (this.isActive) return;
        
        const modal = document.getElementById('sos-countdown');
        const numberEl = document.getElementById('countdown-number');
        modal.classList.add('active');
        
        let count = 3;
        numberEl.textContent = count;
        
        this.countdownTimer = setInterval(() => {
            count--;
            if (count > 0) {
                numberEl.textContent = count;
            } else {
                clearInterval(this.countdownTimer);
                this.activateSOS();
            }
        }, 1000);
    }
    
    cancelCountdown() {
        clearInterval(this.countdownTimer);
        document.getElementById('sos-countdown').classList.remove('active');
    }
    
    async activateSOS() {
        console.log('🚨 SOS ACTIVATED');
        this.isActive = true;
        
        // Hide countdown, show recording indicator
        document.getElementById('sos-countdown').classList.remove('active');
        document.getElementById('recording-indicator').classList.add('active');
        document.getElementById('sos-trigger').classList.add('active');
        
        // Start recording timer
        this.recordingStartTime = Date.now();
        this.startRecordingTimer();
        
        try {
            // 1. Create alert in backend
            await this.createAlert();
            
            // 2. Start GPS tracking (every 5 seconds)
            this.startGPSTracking();
            
            // 3. Request media permissions and start recording
            await this.startMediaRecording();
            
            // 4. Show police notified screen or backup screen
            setTimeout(() => {
                document.getElementById('recording-indicator').classList.remove('active');
                const notifiedScreen = document.getElementById('police-notified');
                notifiedScreen.classList.add('active');
                
                // Update UI based on response
                if (this.lastResponse && this.lastResponse.backup_mode) {
                    document.querySelector('.notified-title').textContent = 'No Nearby Police Found';
                    document.querySelector('.notified-message').innerHTML = `
                        ${this.lastResponse.message}<br><br>
                        <strong>Call Emergency Services Immediately:</strong>
                    `;
                    
                    const detailsContainer = document.querySelector('.notified-details');
                    let contactsHtml = '<div style="display: flex; flex-direction: column; gap: 10px; margin-top: 10px;">';
                    
                    if (this.lastResponse.nearest_station) {
                         contactsHtml += `
                            <div style="background: #334155; padding: 10px; border-radius: 8px; margin-bottom: 5px; color: white;">
                                🏢 <strong>Nearest Station:</strong> ${this.lastResponse.nearest_station.name}<br>
                                <span style="font-size: 0.9em; color: #94a3b8;">Distance: ${this.lastResponse.nearest_station.distance}</span>
                            </div>
                         `;
                    }

                    this.lastResponse.emergency_contacts.forEach(contact => {
                        contactsHtml += `
                            <a href="tel:${contact.number}" style="background: #ef4444; color: white; padding: 12px; border-radius: 8px; text-decoration: none; text-align: center; font-weight: bold;">
                                📞 Call ${contact.name} (${contact.number})
                            </a>
                        `;
                    });
                    contactsHtml += '</div>';
                    
                    detailsContainer.innerHTML = contactsHtml;
                    document.querySelector('.notified-icon').textContent = '⚠️';
                } else {
                    // Standard success case
                    const officerName = this.lastResponse?.officer?.name || 'Dispatch';
                    document.getElementById('officer-name-display').textContent = officerName;
                    document.getElementById('officer-eta').textContent = 'Calculating...';
                    document.getElementById('alert-status').textContent = 'Active';
                }
            }, 3000);
            
        } catch (error) {
            console.error('SOS activation error:', error);
            alert('Failed to activate SOS. Please try again or call emergency services directly.');
            this.endSOS();
        }
    }
    
    async createAlert() {
        // Get current location
        const position = await this.getCurrentPosition();
        
        const response = await fetch('/api/sos/trigger/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.getCookie('csrftoken')
            },
            body: JSON.stringify({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                timestamp: new Date().toISOString()
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to create alert');
        }
        
        const data = await response.json();
        this.alertId = data.alert_id;
        this.lastResponse = data;
        
        console.log('Alert created:', this.alertId);
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
            
            await fetch('/api/sos/update-location/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCookie('csrftoken')
                },
                body: JSON.stringify({
                    alert_id: this.alertId,
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    speed: position.coords.speed,
                    heading: position.coords.heading,
                    timestamp: new Date().toISOString()
                })
            });
            
            console.log('Location updated');
        } catch (error) {
            console.error('Location update error:', error);
        }
    }
    
    async startMediaRecording() {
        try {
            // Request microphone permission
            const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.audioRecorder = new MediaRecorder(audioStream);
            
            this.audioRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                    this.uploadAudioChunk(event.data);
                }
            };
            
            this.audioRecorder.start(30000); // Record in 30-second chunks
            console.log('🎤 Audio recording started');
            
            // Try to start video (optional)
            try {
                const videoStream = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: 'environment' } 
                });
                this.videoRecorder = new MediaRecorder(videoStream);
                
                this.videoRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        this.videoChunks.push(event.data);
                        this.uploadVideoChunk(event.data);
                    }
                };
                
                this.videoRecorder.start(30000); // Record in 30-second chunks
                console.log('📹 Video recording started');
            } catch (videoError) {
                console.log('Video not available:', videoError);
            }
            
        } catch (error) {
            console.error('Media recording error:', error);
            alert('Could not access microphone/camera. SOS will continue with GPS tracking only.');
        }
    }
    
    async uploadAudioChunk(blob) {
        // TODO: Upload to Firebase Storage
        console.log('Audio chunk ready:', blob.size, 'bytes');
        
        // For now, just log. Will implement Firebase upload next
        // const url = await this.uploadToFirebase(blob, 'audio');
        // await this.notifyBackend(url, 'audio');
    }
    
    async uploadVideoChunk(blob) {
        // TODO: Upload to Firebase Storage
        console.log('Video chunk ready:', blob.size, 'bytes');
    }
    
    startRecordingTimer() {
        this.recordingTimer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.recordingStartTime) / 1000);
            const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
            const seconds = (elapsed % 60).toString().padStart(2, '0');
            document.getElementById('recording-time').textContent = `${minutes}:${seconds}`;
        }, 1000);
    }
    
    async endSOS() {
        if (!confirm('Are you sure you want to end the emergency alert?')) {
            return;
        }
        
        console.log('🛑 Ending SOS');
        
        // Stop all intervals
        clearInterval(this.locationInterval);
        clearInterval(this.recordingTimer);
        
        // Stop recordings
        if (this.audioRecorder && this.audioRecorder.state !== 'inactive') {
            this.audioRecorder.stop();
        }
        if (this.videoRecorder && this.videoRecorder.state !== 'inactive') {
            this.videoRecorder.stop();
        }
        
        // Notify backend
        if (this.alertId) {
            await fetch('/api/sos/resolve/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCookie('csrftoken')
                },
                body: JSON.stringify({
                    alert_id: this.alertId,
                    resolved_by: 'user'
                })
            });
        }
        
        // Reset UI
        document.getElementById('police-notified').classList.remove('active');
        document.getElementById('recording-indicator').classList.remove('active');
        document.getElementById('sos-trigger').classList.remove('active');
        
        this.isActive = false;
        this.alertId = null;
        
        alert('Emergency alert ended. Stay safe!');
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

// Initialize SOS handler when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.sosHandler = new SOSHandler();
    console.log('✅ SOS Handler initialized');
});
