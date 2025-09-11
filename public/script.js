// Global variables
let currentPage = 'registration';
let html5QrcodeScanner = null;
let adminToken = null;

// API Base URL
const API_BASE = "https://eventra-j4r0.onrender.com/api";


// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
});

function initializeApp() {
    // Check if admin is already logged in
    const savedToken = localStorage.getItem('adminToken');
    if (savedToken) {
        adminToken = savedToken;
        showAdminDashboard();
    }
}

function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const page = this.dataset.page;
            showPage(page);
        });
    });

    // Registration form
    document.getElementById('registration-form').addEventListener('submit', handleRegistration);

    // Admin login form
    document.getElementById('login-form').addEventListener('submit', handleAdminLogin);
}

// Navigation functions
function showPage(page) {
    // Update navigation buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-page="${page}"]`).classList.add('active');

    // Show/hide pages
    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
    });
    document.getElementById(`${page}-page`).classList.add('active');

    currentPage = page;

    // Initialize page-specific functionality
    if (page === 'scanner') {
        initializeScanner();
    } else if (page === 'admin' && adminToken) {
        showAdminDashboard();
    } else if (page === 'admin' && !adminToken) {
        showAdminLogin();
    }
}

// Registration functionality
async function handleRegistration(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        name: formData.get('name'),
        email: formData.get('email'),
        registrationId: formData.get('registrationId') || undefined
    };

    showLoading(true);

    try {
        const response = await fetch(`${API_BASE}/registration/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            displayQRCode(result.participant);
            showToast('Registration successful!', 'success');
        } else {
            showToast(result.message || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showToast('Network error. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
}

function displayQRCode(participant) {
    document.getElementById('qr-image').src = participant.qrCode;
    document.getElementById('participant-name').textContent = participant.name;
    document.getElementById('participant-email').textContent = participant.email;
    document.getElementById('participant-reg-id').textContent = participant.registrationId;
    
    document.getElementById('qr-result').classList.remove('hidden');
    
    // Scroll to QR code
    document.getElementById('qr-result').scrollIntoView({ behavior: 'smooth' });
}

function printQR() {
    const printWindow = window.open('', '_blank');
    const qrImage = document.getElementById('qr-image').src;
    const participantName = document.getElementById('participant-name').textContent;
    const participantEmail = document.getElementById('participant-email').textContent;
    const participantRegId = document.getElementById('participant-reg-id').textContent;

    printWindow.document.write(`
        <html>
            <head>
                <title>Event Registration - ${participantName}</title>
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
                    .qr-code { margin: 20px 0; }
                    .info { margin: 20px 0; }
                    .info p { margin: 5px 0; }
                </style>
            </head>
            <body>
                <h1>Event Registration</h1>
                <div class="qr-code">
                    <img src="${qrImage}" alt="QR Code" style="max-width: 300px;">
                </div>
                <div class="info">
                    <p><strong>Name:</strong> ${participantName}</p>
                    <p><strong>Email:</strong> ${participantEmail}</p>
                    <p><strong>Registration ID:</strong> ${participantRegId}</p>
                </div>
            </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

// QR Scanner functionality
function initializeScanner() {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.clear();
    }

    html5QrcodeScanner = new Html5Qrcode("qr-reader");
    
    const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
    };

    html5QrcodeScanner.start(
        { facingMode: "environment" },
        config,
        onScanSuccess,
        onScanFailure
    ).catch(err => {
        console.error('Scanner initialization error:', err);
        showToast('Failed to initialize camera. Please check permissions.', 'error');
    });
}

function onScanSuccess(decodedText, decodedResult) {
    console.log('QR Code scanned:', decodedText);
    
    // Stop the scanner
    html5QrcodeScanner.stop().then(() => {
        html5QrcodeScanner.clear();
    }).catch(err => {
        console.error('Scanner stop error:', err);
    });

    // Process the scanned data
    processScannedQR(decodedText);
}

function onScanFailure(error) {
    // This is expected for failed scans, so we don't show errors
    // console.log('Scan failed:', error);
}

async function processScannedQR(qrData) {
    showLoading(true);
    hideScanResults();

    try {
        const response = await fetch(`${API_BASE}/attendance/mark`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ qrData })
        });

        const result = await response.json();

        if (response.ok) {
            displayScanSuccess(result.participant);
            showToast('Attendance marked successfully!', 'success');
        } else {
            displayScanError(result.message);
            showToast(result.message, 'error');
        }
    } catch (error) {
        console.error('Scan processing error:', error);
        displayScanError('Network error. Please try again.');
        showToast('Network error. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
}

function displayScanSuccess(participant) {
    document.getElementById('scan-name').textContent = participant.name;
    document.getElementById('scan-email').textContent = participant.email;
    document.getElementById('scan-reg-id').textContent = participant.registrationId;
    document.getElementById('scan-time').textContent = new Date(participant.attendanceTimestamp).toLocaleString();
    
    document.getElementById('scan-result').classList.remove('hidden');
}

function displayScanError(message) {
    document.getElementById('error-title').textContent = 'Scan Failed';
    document.getElementById('error-message').textContent = message;
    document.getElementById('scan-error').classList.remove('hidden');
}

function hideScanResults() {
    document.getElementById('scan-result').classList.add('hidden');
    document.getElementById('scan-error').classList.add('hidden');
}

// Admin functionality
async function handleAdminLogin(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        email: formData.get('email'),
        password: formData.get('password')
    };

    showLoading(true);

    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            adminToken = result.token;
            localStorage.setItem('adminToken', adminToken);
            showAdminDashboard();
            showToast('Login successful!', 'success');
        } else {
            showToast(result.message || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showToast('Network error. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
}

function showAdminLogin() {
    document.getElementById('admin-login').classList.remove('hidden');
    document.getElementById('admin-dashboard').classList.add('hidden');
}

function showAdminDashboard() {
    document.getElementById('admin-login').classList.add('hidden');
    document.getElementById('admin-dashboard').classList.remove('hidden');
    loadDashboardData();
}

async function loadDashboardData() {
    if (!adminToken) return;

    showLoading(true);

    try {
        const response = await fetch(`${API_BASE}/admin/dashboard`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });

        const result = await response.json();

        if (response.ok) {
            updateDashboardStats(result.stats);
            updateRecentAttendees(result.recentAttendees);
        } else if (response.status === 401) {
            logout();
            showToast('Session expired. Please login again.', 'error');
        } else {
            showToast(result.message || 'Failed to load dashboard', 'error');
        }
    } catch (error) {
        console.error('Dashboard load error:', error);
        showToast('Network error. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
}

function updateDashboardStats(stats) {
    document.getElementById('total-registered').textContent = stats.totalRegistered;
    document.getElementById('total-attended').textContent = stats.totalAttended;
    document.getElementById('total-remaining').textContent = stats.totalNotAttended;
    document.getElementById('attendance-rate').textContent = `${stats.attendanceRate}%`;
}

function updateRecentAttendees(attendees) {
    const container = document.getElementById('recent-list');
    container.innerHTML = '';

    if (attendees.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #718096;">No attendees yet</p>';
        return;
    }

    attendees.forEach(attendee => {
        const item = document.createElement('div');
        item.className = 'attendee-item';
        item.innerHTML = `
            <h4>${attendee.name}</h4>
            <p><strong>Email:</strong> ${attendee.email}</p>
            <p><strong>ID:</strong> ${attendee.registrationId}</p>
            <p><strong>Time:</strong> ${new Date(attendee.attendanceTimestamp).toLocaleString()}</p>
        `;
        container.appendChild(item);
    });
}

async function exportToExcel() {
    if (!adminToken) return;

    showLoading(true);

    try {
        const response = await fetch(`${API_BASE}/admin/export`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'event_attendance.xlsx';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            showToast('Excel file downloaded successfully!', 'success');
        } else if (response.status === 401) {
            logout();
            showToast('Session expired. Please login again.', 'error');
        } else {
            showToast('Failed to export data', 'error');
        }
    } catch (error) {
        console.error('Export error:', error);
        showToast('Network error. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
}

function refreshDashboard() {
    loadDashboardData();
}

function logout() {
    adminToken = null;
    localStorage.removeItem('adminToken');
    showAdminLogin();
    showToast('Logged out successfully', 'success');
}

// Utility functions
function showLoading(show) {
    const loading = document.getElementById('loading');
    if (show) {
        loading.classList.remove('hidden');
    } else {
        loading.classList.add('hidden');
    }
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 5000);
}

// Setup default admin (for initial setup)
async function setupDefaultAdmin() {
    try {
        const response = await fetch(`${API_BASE}/auth/setup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'admin@event.com',
                password: 'admin123'
            })
        });

        if (response.ok) {
            console.log('Default admin created successfully');
        }
    } catch (error) {
        console.error('Admin setup error:', error);
    }
}

// Initialize default admin on first load
setupDefaultAdmin();
