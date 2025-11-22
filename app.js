// AQi NCR - Frontend Application Logic
// Replace with your deployed Google Apps Script Web App URL
const API_URL = 'https://script.google.com/macros/s/AKfycbzprth63_vZBERCGxip7r3VQASDvHcuHbcxECVJWycsOpp2OJZ6T3EA2Zynd8IVCXbVhQ/exec';

// Application State
const appState = {
    user: null,
    currentView: 'dashboard',
    map: null,
    aqiChart: null,
    breathingInterval: null,
    breathCount: 0,
    exerciseStartTime: null,
    cameraStream: null,
    speechRecognition: null
};

// DOM Elements
const elements = {
    // Auth
    authOverlay: document.getElementById('authOverlay'),
    appContainer: document.getElementById('appContainer'),
    loginForm: document.getElementById('loginForm'),
    registerForm: document.getElementById('registerForm'),
    authTabs: document.querySelectorAll('.auth-tab'),
    
    // Navigation
    navLinks: document.querySelectorAll('.nav-link'),
    bottomNavItems: document.querySelectorAll('.nav-item'),
    logoutBtn: document.getElementById('logoutBtn'),
    
    // Views
    views: document.querySelectorAll('.view'),
    
    // User Info
    userInfo: document.getElementById('userInfo'),
    userPoints: document.getElementById('userPoints'),
    
    // Dashboard
    currentAQI: document.getElementById('currentAQI'),
    aqiLevel: document.getElementById('aqiLevel'),
    weatherTemp: document.getElementById('weatherTemp'),
    weatherWind: document.getElementById('weatherWind'),
    weatherHumidity: document.getElementById('weatherHumidity'),
    tipsContainer: document.getElementById('tipsContainer'),
    areaAqiGrid: document.getElementById('areaAqiGrid'),
    voiceCommandBtn: document.getElementById('voiceCommandBtn'),
    
    // Map
    liveMap: document.getElementById('liveMap'),
    reportFireBtn: document.getElementById('reportFireBtn'),
    reportDustBtn: document.getElementById('reportDustBtn'),
    
    // Complaint Bot
    chatMessages: document.getElementById('chatMessages'),
    complaintTypeButtons: document.querySelectorAll('.complaint-type'),
    complaintForm: document.getElementById('complaintForm'),
    complaintDesc: document.getElementById('complaintDesc'),
    complaintLat: document.getElementById('complaintLat'),
    complaintLng: document.getElementById('complaintLng'),
    getLocationBtn: document.getElementById('getLocationBtn'),
    
    // AR Scope
    arVideo: document.getElementById('arVideo'),
    smogOverlay: document.getElementById('smogOverlay'),
    smogSlider: document.getElementById('smogSlider'),
    smogLevel: document.getElementById('smogLevel'),
    startCameraBtn: document.getElementById('startCameraBtn'),
    stopCameraBtn: document.getElementById('stopCameraBtn'),
    
    // Gamification
    breathingCircle: document.getElementById('breathingCircle'),
    breathingText: document.querySelector('.breathing-text'),
    startBreathingBtn: document.getElementById('startBreathingBtn'),
    stopBreathingBtn: document.getElementById('stopBreathingBtn'),
    breathCount: document.getElementById('breathCount'),
    exerciseTime: document.getElementById('exerciseTime'),
    badgesGrid: document.getElementById('badgesGrid')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Initialize AOS animations
    AOS.init({
        duration: 800,
        once: true,
        offset: 100
    });
    
    // Check if user is logged in
    const savedUser = localStorage.getItem('aqiNCR_user');
    if (savedUser) {
        appState.user = JSON.parse(savedUser);
        showApp();
        loadDashboard();
    } else {
        showAuth();
    }
    
    // Initialize event listeners
    initializeEventListeners();
    
    // Initialize voice recognition if available
    initializeVoiceRecognition();
}

function initializeEventListeners() {
    // Auth tabs
    elements.authTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            switchAuthTab(tabName);
        });
    });
    
    // Login form
    elements.loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        handleLogin();
    });
    
    // Register form
    elements.registerForm.addEventListener('submit', function(e) {
        e.preventDefault();
        handleRegister();
    });
    
    // Navigation
    elements.navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const view = this.getAttribute('data-view');
            switchView(view);
        });
    });
    
    elements.bottomNavItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const view = this.getAttribute('data-view');
            switchView(view);
            
            // Update active states
            elements.bottomNavItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Logout
    elements.logoutBtn.addEventListener('click', function(e) {
        e.preventDefault();
        handleLogout();
    });
    
    // Voice command
    elements.voiceCommandBtn.addEventListener('click', handleVoiceCommand);
    
    // Map reporting
    elements.reportFireBtn.addEventListener('click', () => reportMapIssue('fire'));
    elements.reportDustBtn.addEventListener('click', () => reportMapIssue('dust'));
    
    // Complaint bot
    elements.complaintTypeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const type = this.getAttribute('data-type');
            startComplaint(type);
        });
    });
    
    elements.getLocationBtn.addEventListener('click', getCurrentLocation);
    elements.complaintForm.addEventListener('submit', handleComplaintSubmit);
    
    // AR Scope
    elements.smogSlider.addEventListener('input', updateSmogOverlay);
    elements.startCameraBtn.addEventListener('click', startCamera);
    elements.stopCameraBtn.addEventListener('click', stopCamera);
    
    // Breathing exercise
    elements.startBreathingBtn.addEventListener('click', startBreathingExercise);
    elements.stopBreathingBtn.addEventListener('click', stopBreathingExercise);
}

// API Functions
async function fetchAPI(action, data = {}) {
    try {
        const params = new URLSearchParams();
        params.append('action', action);
        
        // Add data parameters
        Object.keys(data).forEach(key => {
            params.append(key, data[key]);
        });
        
        const response = await fetch(API_URL, {
            method: 'POST',
            body: params
        });
        
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('API Error:', error);
        return { success: false, message: 'Network error' };
    }
}

// Auth Functions
async function handleLogin() {
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    const result = await fetchAPI('login', { username, password });
    
    if (result.success) {
        appState.user = result.user;
        localStorage.setItem('aqiNCR_user', JSON.stringify(result.user));
        showApp();
        loadDashboard();
        showNotification('Login successful!', 'success');
    } else {
        showNotification(result.message, 'error');
    }
}

async function handleRegister() {
    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;
    const fullName = document.getElementById('regFullName').value;
    const email = document.getElementById('regEmail').value;
    
    const result = await fetchAPI('register', {
        username,
        password,
        fullName,
        email
    });
    
    if (result.success) {
        showNotification('Registration successful! Please login.', 'success');
        switchAuthTab('login');
        // Clear register form
        elements.registerForm.reset();
    } else {
        showNotification(result.message, 'error');
    }
}

function handleLogout() {
    appState.user = null;
    localStorage.removeItem('aqiNCR_user');
    showAuth();
    showNotification('Logged out successfully', 'success');
}

function switchAuthTab(tabName) {
    // Update active tab
    elements.authTabs.forEach(tab => {
        tab.classList.toggle('active', tab.getAttribute('data-tab') === tabName);
    });
    
    // Show corresponding form
    elements.loginForm.classList.toggle('active', tabName === 'login');
    elements.registerForm.classList.toggle('active', tabName === 'register');
}

// View Management
function showAuth() {
    elements.authOverlay.classList.add('active');
    elements.appContainer.classList.remove('active');
}

function showApp() {
    elements.authOverlay.classList.remove('active');
    elements.appContainer.classList.add('active');
    updateUserInfo();
}

function switchView(viewName) {
    // Hide all views
    elements.views.forEach(view => view.classList.remove('active'));
    
    // Show selected view
    document.getElementById(viewName + 'View').classList.add('active');
    
    // Update navigation active states
    elements.navLinks.forEach(link => {
        link.classList.toggle('active', link.getAttribute('data-view') === viewName);
    });
    
    // Initialize view-specific components
    switch (viewName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'map':
            initializeMap();
            break;
        case 'complaint':
            initializeComplaintBot();
            break;
        case 'ar':
            // AR view initialized on button click
            break;
        case 'gamification':
            initializeGamification();
            break;
    }
    
    appState.currentView = viewName;
}

function updateUserInfo() {
    if (appState.user) {
        elements.userInfo.innerHTML = `Welcome, ${appState.user.fullName}`;
        elements.userPoints.textContent = appState.user.points;
    }
}

// Dashboard Functions
async function loadDashboard() {
    const result = await fetchAPI('getDashboard');
    
    if (result.success) {
        updateDashboardData(result);
        initializeAQIChart(result.aqiData);
    } else {
        showNotification('Failed to load dashboard data', 'error');
    }
}

function updateDashboardData(data) {
    // Update AQI display
    elements.currentAQI.textContent = data.currentAQI;
    elements.aqiLevel.textContent = getAQILevel(data.currentAQI);
    elements.currentAQI.style.background = getAQIGradient(data.currentAQI);
    
    // Update weather
    elements.weatherTemp.textContent = `${data.weather.temp}°C`;
    elements.weatherWind.textContent = `${data.weather.wind} km/h`;
    elements.weatherHumidity.textContent = `${data.weather.humidity}%`;
    
    // Update tips
    elements.tipsContainer.innerHTML = '';
    data.tips.forEach(tip => {
        const tipElement = document.createElement('div');
        tipElement.className = 'tip-item';
        tipElement.textContent = tip;
        elements.tipsContainer.appendChild(tipElement);
    });
    
    // Update area AQI grid
    elements.areaAqiGrid.innerHTML = '';
    data.aqiData.forEach(area => {
        const card = document.createElement('div');
        card.className = 'area-aqi-card';
        card.innerHTML = `
            <div class="area-name">${area.area}</div>
            <div class="area-aqi-value" style="color: ${getAQIColor(area.aqi)}">${area.aqi}</div>
            <div class="area-aqi-level">${area.level}</div>
        `;
        elements.areaAqiGrid.appendChild(card);
    });
}

function initializeAQIChart(aqiData) {
    const ctx = document.getElementById('aqiChart').getContext('2d');
    
    if (appState.aqiChart) {
        appState.aqiChart.destroy();
    }
    
    appState.aqiChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: aqiData.map(area => area.area),
            datasets: [{
                label: 'AQI',
                data: aqiData.map(area => area.aqi),
                borderColor: '#00b4d8',
                backgroundColor: 'rgba(0, 180, 216, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#cbd5e1'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#cbd5e1'
                    }
                }
            }
        }
    });
}

// Map Functions
function initializeMap() {
    if (appState.map) {
        appState.map.remove();
    }
    
    // Initialize Leaflet map centered on Delhi
    appState.map = L.map('liveMap').setView([28.6139, 77.2090], 11);
    
    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(appState.map);
    
    // Load map data
    loadMapData();
}

async function loadMapData() {
    const result = await fetchAPI('getMapData');
    
    if (result.success) {
        // Add community spots
        result.communitySpots.forEach(spot => {
            const color = spot.type === 'fire' ? 'red' : 'orange';
            const marker = L.circleMarker([spot.lat, spot.lng], {
                color: color,
                fillColor: color,
                fillOpacity: 0.7,
                radius: 8
            }).addTo(appState.map);
            
            marker.bindPopup(`
                <strong>${spot.type.toUpperCase()}</strong><br>
                Reported: ${new Date(spot.timestamp).toLocaleDateString()}
            `);
        });
        
        // Add shelters
        result.shelters.forEach(shelter => {
            const color = shelter.status === 'Open' ? 'green' : 'red';
            const icon = L.divIcon({
                className: 'shelter-marker',
                html: `<i class="fas fa-hospital" style="color: ${color}; font-size: 20px;"></i>`,
                iconSize: [20, 20]
            });
            
            const marker = L.marker([shelter.lat, shelter.lng], { icon }).addTo(appState.map);
            marker.bindPopup(`
                <strong>${shelter.name}</strong><br>
                Type: ${shelter.type}<br>
                Status: ${shelter.status}<br>
                Phone: ${shelter.phone}
            `);
        });
    }
}

function reportMapIssue(type) {
    if (!appState.map) return;
    
    const center = appState.map.getCenter();
    const lat = center.lat;
    const lng = center.lng;
    
    // Show confirmation
    if (confirm(`Report ${type} at this location?`)) {
        fetchAPI('reportSpot', {
            type: type,
            lat: lat,
            lng: lng,
            reportedBy: appState.user.userID
        }).then(result => {
            if (result.success) {
                showNotification(`${type} reported successfully!`, 'success');
                loadMapData(); // Refresh map data
            } else {
                showNotification('Failed to report issue', 'error');
            }
        });
    }
}

// Complaint Bot Functions
function initializeComplaintBot() {
    // Reset chat
    elements.chatMessages.innerHTML = `
        <div class="message bot-message">
            Hi! I'm here to help you report air quality issues. What would you like to report?
        </div>
    `;
    
    // Hide complaint form
    elements.complaintForm.classList.add('hidden');
}

function startComplaint(type) {
    const typeNames = {
        fire: 'Fire/Smoke',
        dust: 'Construction Dust',
        industrial: 'Industrial Pollution'
    };
    
    // Add user message
    addChatMessage(`I want to report ${typeNames[type]}`, 'user');
    
    // Show complaint form
    elements.complaintForm.classList.remove('hidden');
    elements.complaintForm.setAttribute('data-type', type);
    
    // Add bot response
    setTimeout(() => {
        addChatMessage(`Please provide details about the ${typeNames[type]} issue. You can also get your current location automatically.`, 'bot');
    }, 500);
}

function addChatMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    messageDiv.textContent = text;
    
    elements.chatMessages.appendChild(messageDiv);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

function getCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                elements.complaintLat.value = position.coords.latitude.toFixed(6);
                elements.complaintLng.value = position.coords.longitude.toFixed(6);
                showNotification('Location obtained successfully!', 'success');
            },
            error => {
                showNotification('Failed to get location: ' + error.message, 'error');
            }
        );
    } else {
        showNotification('Geolocation is not supported by this browser', 'error');
    }
}

async function handleComplaintSubmit(e) {
    e.preventDefault();
    
    const type = elements.complaintForm.getAttribute('data-type');
    const description = elements.complaintDesc.value;
    const lat = elements.complaintLat.value;
    const lng = elements.complaintLng.value;
    
    if (!description || !lat || !lng) {
        showNotification('Please fill all fields', 'error');
        return;
    }
    
    const result = await fetchAPI('submitComplaint', {
        userID: appState.user.userID,
        type: type,
        description: description,
        lat: lat,
        lng: lng
    });
    
    if (result.success) {
        addChatMessage('Complaint submitted successfully! Our team will review it shortly.', 'bot');
        elements.complaintForm.classList.add('hidden');
        elements.complaintForm.reset();
        
        // Award points for submission
        awardPoints(10, 'Complaint submitted');
    } else {
        showNotification('Failed to submit complaint', 'error');
    }
}

// AR Scope Functions
function updateSmogOverlay() {
    const value = elements.smogSlider.value;
    elements.smogLevel.textContent = `${value}%`;
    elements.smogOverlay.style.opacity = value / 100;
}

async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
        });
        appState.cameraStream = stream;
        elements.arVideo.srcObject = stream;
        showNotification('Camera started successfully', 'success');
    } catch (error) {
        showNotification('Failed to access camera: ' + error.message, 'error');
    }
}

function stopCamera() {
    if (appState.cameraStream) {
        appState.cameraStream.getTracks().forEach(track => track.stop());
        elements.arVideo.srcObject = null;
        showNotification('Camera stopped', 'success');
    }
}

// Gamification Functions
function initializeGamification() {
    // Reset breathing exercise
    stopBreathingExercise();
}

function startBreathingExercise() {
    if (appState.breathingInterval) return;
    
    let isInhaling = true;
    let scale = 1;
    appState.breathCount = 0;
    appState.exerciseStartTime = Date.now();
    
    elements.breathingText.textContent = 'Breathe In';
    elements.startBreathingBtn.disabled = true;
    elements.stopBreathingBtn.disabled = false;
    
    appState.breathingInterval = setInterval(() => {
        if (isInhaling) {
            scale += 0.02;
            if (scale >= 1.2) {
                isInhaling = false;
                elements.breathingText.textContent = 'Breathe Out';
            }
        } else {
            scale -= 0.02;
            if (scale <= 1) {
                isInhaling = true;
                elements.breathingText.textContent = 'Breathe In';
                appState.breathCount++;
                elements.breathCount.textContent = appState.breathCount;
                
                // Award points for each breath cycle
                awardPoints(1, 'Breathing exercise');
            }
        }
        
        elements.breathingCircle.style.transform = `scale(${scale})`;
        
        // Update exercise time
        const elapsed = Math.floor((Date.now() - appState.exerciseStartTime) / 1000);
        elements.exerciseTime.textContent = elapsed;
        
    }, 100);
}

function stopBreathingExercise() {
    if (appState.breathingInterval) {
        clearInterval(appState.breathingInterval);
        appState.breathingInterval = null;
    }
    
    elements.breathingCircle.style.transform = 'scale(1)';
    elements.breathingText.textContent = 'Breathe In';
    elements.startBreathingBtn.disabled = false;
    elements.stopBreathingBtn.disabled = true;
}

// Voice Recognition
function initializeVoiceRecognition() {
    if ('webkitSpeechRecognition' in window) {
        appState.speechRecognition = new webkitSpeechRecognition();
        appState.speechRecognition.continuous = false;
        appState.speechRecognition.interimResults = false;
        
        appState.speechRecognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript.toLowerCase();
            handleVoiceCommandResult(transcript);
        };
        
        appState.speechRecognition.onerror = function(event) {
            console.error('Speech recognition error:', event.error);
        };
    }
}

function handleVoiceCommand() {
    if (!appState.speechRecognition) {
        showNotification('Voice recognition not supported in this browser', 'error');
        return;
    }
    
    try {
        appState.speechRecognition.start();
        showNotification('Listening... Speak now', 'info');
    } catch (error) {
        showNotification('Voice recognition error: ' + error.message, 'error');
    }
}

function handleVoiceCommandResult(transcript) {
    if (transcript.includes('aqi') || transcript.includes('air quality')) {
        const aqi = elements.currentAQI.textContent;
        const level = elements.aqiLevel.textContent;
        
        speak(`The current Air Quality Index is ${aqi}, which is ${level}.`);
        showNotification(`AQI: ${aqi} (${level})`, 'info');
    } else if (transcript.includes('weather')) {
        const temp = elements.weatherTemp.textContent;
        const wind = elements.weatherWind.textContent;
        
        speak(`Current weather is ${temp} with wind speed ${wind}`);
    } else {
        speak("I didn't understand that command. Try asking about AQI or weather.");
    }
}

function speak(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        speechSynthesis.speak(utterance);
    }
}

// Utility Functions
function getAQILevel(aqi) {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Satisfactory';
    if (aqi <= 200) return 'Moderate';
    if (aqi <= 300) return 'Poor';
    if (aqi <= 400) return 'Very Poor';
    return 'Severe';
}

function getAQIColor(aqi) {
    if (aqi <= 50) return '#00e400';
    if (aqi <= 100) return '#ffff00';
    if (aqi <= 200) return '#ff7e00';
    if (aqi <= 300) return '#ff0000';
    if (aqi <= 400) return '#8f3f97';
    return '#7e0023';
}

function getAQIGradient(aqi) {
    const color = getAQIColor(aqi);
    return `linear-gradient(135deg, ${color} 0%, ${color}80 100%)`;
}

function awardPoints(points, reason) {
    if (!appState.user) return;
    
    appState.user.points += points;
    elements.userPoints.textContent = appState.user.points;
    localStorage.setItem('aqiNCR_user', JSON.stringify(appState.user));
    
    showNotification(`+${points} points: ${reason}`, 'success');
    
    // Check for badge unlocks
    checkBadgeUnlocks();
}

function checkBadgeUnlocks() {
    const points = appState.user.points;
    const badges = elements.badgesGrid.querySelectorAll('.badge-item');
    
    badges.forEach((badge, index) => {
        const threshold = (index + 1) * 25;
        if (points >= threshold && badge.classList.contains('locked')) {
            badge.classList.remove('locked');
            badge.classList.add('unlocked');
            showNotification(`New badge unlocked!`, 'success');
        }
    });
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--bg-glass);
        backdrop-filter: var(--blur-intensity);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 1rem 1.5rem;
        color: var(--text-primary);
        z-index: 10000;
        transform: translateX(400px);
        transition: transform 0.3s ease;
        max-width: 300px;
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

function getNotificationIcon(type) {
    switch (type) {
        case 'success': return 'check-circle';
        case 'error': return 'exclamation-circle';
        case 'warning': return 'exclamation-triangle';
        default: return 'info-circle';
    }
}

// Export appState for debugging
window.appState = appState;
