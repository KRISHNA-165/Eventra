// ==========================================
// Eventra SPA Javascript Engine (MVP v1.0)
// ==========================================

const API_BASE = '/api';

// State variables
let currentPage = 'home';
let orgSubTab = 'events';
let allEventsCache = [];
let organizerEventsCache = [];
let selectedRegistrationEvent = null;
let currentOtpEmail = '';

// Authentication state
let orgToken = localStorage.getItem('orgToken') || null;
let adminToken = localStorage.getItem('adminToken') || null;
let activeAdminUserObj = JSON.parse(localStorage.getItem('adminUserObj')) || null;
let activeEventId = sessionStorage.getItem('activeEventId') || null;

// QR Scanner reference
let html5QrcodeScanner = null;

// Table directory pagination
let directoryPage = 1;
let directoryTotalPages = 1;

// Outgoing SMTP sandbox drawer state
let mailboxOpen = false;
let mailboxInterval = null;

document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupEventListeners();
});

function initApp() {
    showLoading(false);
    
    // Resume session if tokens exist
    if (orgToken) {
        showOrganizerDashboard();
    }
    if (adminToken && activeEventId) {
        showAdminDashboard();
    } else if (adminToken) {
        showAdminEventSelect();
    }

    loadFeaturedEvents();
}

function setupEventListeners() {
    // Step 1 registration form
    document.getElementById('form-registration-details').addEventListener('submit', handleRegistrationStep1);

    // Step 2 OTP verification form
    document.getElementById('form-otp-verification').addEventListener('submit', handleRegistrationStep2);

    // Organizer portal auth forms
    document.getElementById('form-organizer-login').addEventListener('submit', handleOrganizerLogin);
    document.getElementById('form-organizer-register').addEventListener('submit', handleOrganizerRegister);

    // Event creation modal form
    document.getElementById('form-create-event').addEventListener('submit', handleCreateEvent);

    // Admin coordinator creation form
    document.getElementById('form-create-admin').addEventListener('submit', handleCreateAdmin);

    // Admin login form
    document.getElementById('form-admin-login').addEventListener('submit', handleAdminLogin);

    // Admin event selector
    document.getElementById('form-admin-event-select').addEventListener('submit', handleAdminEventSelect);

    // Manual check-in form
    document.getElementById('form-manual-checkin').addEventListener('submit', handleManualCheckin);
}

// ==========================================
// SPA ROUTER
// ==========================================
function navigateTo(pageId) {
    if (currentPage === 'admin' && pageId !== 'admin') {
        stopScanner();
    }

    document.querySelectorAll('.page-section').forEach(sec => {
        sec.classList.remove('active');
    });
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });

    const targetSection = document.getElementById(`page-${pageId}`);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    const navBtn = document.getElementById(`btn-nav-${pageId}`);
    if (navBtn) {
        navBtn.classList.add('active');
    }

    currentPage = pageId;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (pageId === 'events') {
        loadEventsList();
    } else if (pageId === 'organizer' && orgToken) {
        loadOrganizerData();
    }
}

// ==========================================
// PUBLIC EVENTS & BROWSE
// ==========================================
async function loadFeaturedEvents() {
    try {
        const response = await fetch(`${API_BASE}/events`);
        const result = await response.json();
        if (response.ok) {
            allEventsCache = result.events || [];
            renderFeaturedEvents();
        }
    } catch (err) {
        console.error('Featured events load error:', err.message);
    }
}

function renderFeaturedEvents() {
    const container = document.getElementById('events-listing-grid');
    if (!container) return;
    container.innerHTML = '';

    if (allEventsCache.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
                <i class="fa-solid fa-calendar-xmark" style="font-size: 44px; margin-bottom: 12px;"></i>
                <p>No upcoming events currently listed.</p>
            </div>
        `;
        return;
    }

    allEventsCache.forEach(event => {
        const slotsLeft = Math.max(0, event.maximumCapacity - (event.verifiedCount || 0));
        const isFull = slotsLeft === 0;
        const eventDate = new Date(event.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

        const card = document.createElement('div');
        card.className = 'event-card';
        card.innerHTML = `
            <div class="event-card-banner ${event.banner || 'theme-purple'}">
                <span class="event-category-badge">${event.category || 'General'}</span>
                <span class="event-seats-left ${isFull ? 'full' : ''}">
                    ${isFull ? 'Sold Out' : slotsLeft + ' Slots Available'}
                </span>
                <h3 class="event-card-title">${event.name}</h3>
            </div>
            <div class="event-card-body">
                <p class="event-card-desc">${event.description}</p>
                <div class="event-meta-list">
                    <div class="event-meta-item"><i class="fa-solid fa-calendar-day"></i> ${eventDate}</div>
                    <div class="event-meta-item"><i class="fa-solid fa-clock"></i> ${event.startTime} - ${event.endTime}</div>
                    <div class="event-meta-item"><i class="fa-solid fa-location-dot"></i> ${event.venue}</div>
                </div>
                <div class="event-card-footer">
                    <div class="organizer-info">Organizer <span>${event.organizer?.name || 'Staff'}</span></div>
                    <button class="btn btn-primary btn-sm" onclick="startRegistrationFlow('${event._id}')" ${isFull ? 'disabled' : ''}>
                        ${isFull ? 'Closed' : 'Register Now'}
                    </button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function loadEventsList() {
    loadFeaturedEvents();
}

// ==========================================
// REGISTRATION WIZARD FLOW
// ==========================================
async function startRegistrationFlow(eventId) {
    showLoading(true);
    try {
        const response = await fetch(`${API_BASE}/events/${eventId}`);
        const result = await response.json();
        
        if (response.ok) {
            selectedRegistrationEvent = result.event;
            
            const eventDate = new Date(selectedRegistrationEvent.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
            document.getElementById('reg-event-summary').innerHTML = `
                <div>
                    <span class="badge badge-success">${selectedRegistrationEvent.category}</span>
                    <h4>${selectedRegistrationEvent.name}</h4>
                    <p><i class="fa-solid fa-location-dot"></i> ${selectedRegistrationEvent.venue} | <i class="fa-solid fa-clock"></i> ${eventDate} at ${selectedRegistrationEvent.startTime}</p>
                </div>
            `;

            document.getElementById('reg-event-id').value = selectedRegistrationEvent._id;
            goBackToStep1();
            navigateTo('registration');
        } else {
            showToast(result.message || 'Error loading event configuration', 'error');
        }
    } catch (err) {
        showToast('Network error initializing registration', 'error');
    } finally {
        showLoading(false);
    }
}

function goBackToStep1() {
    document.getElementById('reg-step-1').classList.add('active');
    document.getElementById('reg-step-2').classList.remove('active');
    document.getElementById('reg-step-3').classList.remove('active');

    document.getElementById('step-indicator-1').className = 'progress-step active';
    document.getElementById('step-indicator-2').className = 'progress-step';
    document.getElementById('step-indicator-3').className = 'progress-step';

    document.getElementById('progress-line-1').classList.remove('done');
    document.getElementById('progress-line-2').classList.remove('done');
}

async function handleRegistrationStep1(e) {
    e.preventDefault();
    
    const eventId = document.getElementById('reg-event-id').value;
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const phone = document.getElementById('reg-phone').value;
    const college = document.getElementById('reg-college').value;
    const department = document.getElementById('reg-dept').value;
    const yearOfStudy = document.getElementById('reg-year').value;

    showLoading(true, 'Dispatched OTP request...');

    try {
        const response = await fetch(`${API_BASE}/registration/request-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eventId, name, email, phone, college, department, yearOfStudy })
        });
        const result = await response.json();

        if (response.ok) {
            triggerMailboxPoll();
            currentOtpEmail = email;
            
            document.getElementById('otp-sent-email').textContent = email;
            document.getElementById('otp-input').value = '';
            
            document.getElementById('reg-step-1').classList.remove('active');
            document.getElementById('reg-step-2').classList.add('active');
            document.getElementById('step-indicator-1').className = 'progress-step done';
            document.getElementById('step-indicator-2').className = 'progress-step active';
            document.getElementById('progress-line-1').classList.add('done');

            showToast('Verification OTP has been sent.', 'success');
            if (!mailboxOpen) toggleMailbox();
        } else {
            showToast(result.message || 'OTP request failed.', 'error');
        }
    } catch (err) {
        showToast('Network error dispatching OTP.', 'error');
    } finally {
        showLoading(false);
    }
}

async function handleRegistrationStep2(e) {
    e.preventDefault();

    const eventId = document.getElementById('reg-event-id').value;
    const otp = document.getElementById('otp-input').value;

    showLoading(true, 'Verifying OTP code...');

    try {
        const response = await fetch(`${API_BASE}/registration/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eventId, email: currentOtpEmail, otp })
        });
        const result = await response.json();

        if (response.ok) {
            const part = result.participant;

            document.getElementById('ticket-event-cat').textContent = selectedRegistrationEvent.category;
            document.getElementById('ticket-event-title').textContent = part.event;
            document.getElementById('ticket-event-date').textContent = part.dateTime;
            document.getElementById('ticket-event-venue').textContent = part.venue;
            document.getElementById('ticket-reg-id').textContent = part.registrationId;
            document.getElementById('ticket-attendee-name').textContent = part.name;
            document.getElementById('ticket-qr-img').src = part.qrCode;

            document.getElementById('reg-step-2').classList.remove('active');
            document.getElementById('reg-step-3').classList.add('active');
            document.getElementById('step-indicator-2').className = 'progress-step done';
            document.getElementById('step-indicator-3').className = 'progress-step done';
            document.getElementById('progress-line-2').classList.add('done');

            showToast('Email verified successfully! Ticket issued.', 'success');
            triggerMailboxPoll();
            
            document.getElementById('form-registration-details').reset();
            document.getElementById('form-otp-verification').reset();
        } else {
            showToast(result.message || 'OTP code verification failed.', 'error');
        }
    } catch (err) {
        showToast('Network error verifying OTP.', 'error');
    } finally {
        showLoading(false);
    }
}

function printTicket() {
    window.print();
}

// ==========================================
// ORGANIZER PORTAL
// ==========================================
function toggleAuthMode(mode) {
    document.getElementById('auth-tab-login').classList.toggle('active', mode === 'login');
    document.getElementById('auth-tab-register').classList.toggle('active', mode === 'register');
    
    document.getElementById('form-organizer-login').classList.toggle('active', mode === 'login');
    document.getElementById('form-organizer-register').classList.toggle('active', mode === 'register');
}

async function handleOrganizerLogin(e) {
    e.preventDefault();
    const email = document.getElementById('org-login-email').value;
    const password = document.getElementById('org-login-password').value;

    showLoading(true, 'Organizer logging in...');
    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const result = await response.json();

        if (response.ok) {
            if (result.user.role !== 'organizer') {
                showToast('Access denied. Organizers only.', 'error');
                return;
            }
            orgToken = result.token;
            localStorage.setItem('orgToken', orgToken);
            showToast('Authenticated organizer.', 'success');
            showOrganizerDashboard();
        } else {
            showToast(result.message || 'Authentication failed.', 'error');
        }
    } catch (err) {
        showToast('Network error during login.', 'error');
    } finally {
        showLoading(false);
    }
}

async function handleOrganizerRegister(e) {
    e.preventDefault();
    const name = document.getElementById('org-reg-name').value;
    const email = document.getElementById('org-reg-email').value;
    const password = document.getElementById('org-reg-password').value;

    showLoading(true, 'Registering account...');
    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        const result = await response.json();

        if (response.ok) {
            orgToken = result.token;
            localStorage.setItem('orgToken', orgToken);
            showToast('Account registered successfully.', 'success');
            showOrganizerDashboard();
        } else {
            showToast(result.message || 'Registration failed.', 'error');
        }
    } catch (err) {
        showToast('Network error during registration.', 'error');
    } finally {
        showLoading(false);
    }
}

function showOrganizerDashboard() {
    document.getElementById('organizer-auth-wrapper').classList.add('hidden');
    document.getElementById('organizer-dashboard').classList.remove('hidden');
    loadOrganizerData();
}

function logoutOrganizer() {
    orgToken = null;
    localStorage.removeItem('orgToken');
    document.getElementById('organizer-auth-wrapper').classList.remove('hidden');
    document.getElementById('organizer-dashboard').classList.add('hidden');
    showToast('Logged out.', 'success');
}

async function loadOrganizerData() {
    if (!orgToken) return;
    showLoading(true);
    try {
        // Load stats metrics (PRD Section 14)
        const statsResponse = await fetch(`${API_BASE}/admin/organizer-stats`, {
            headers: { 'Authorization': `Bearer ${orgToken}` }
        });
        const statsResult = await statsResponse.json();
        if (statsResponse.ok) {
            const stats = statsResult.stats;
            document.getElementById('org-stat-total-events').textContent = stats.totalEvents;
            document.getElementById('org-stat-upcoming-events').textContent = stats.upcomingEvents;
            document.getElementById('org-stat-total-regs').textContent = stats.totalRegistrations;
            document.getElementById('org-stat-total-att').textContent = stats.totalAttendance;
        }

        // Load events
        const response = await fetch(`${API_BASE}/events/organizer`, {
            headers: { 'Authorization': `Bearer ${orgToken}` }
        });
        const result = await response.json();
        if (response.ok) {
            organizerEventsCache = result.events || [];
            renderOrganizerEventsTable();
            buildOrganizerAdminEventChecklist();
        }

        // Load admins (PRD Section 13)
        const adminResponse = await fetch(`${API_BASE}/admin/list-admins`, {
            headers: { 'Authorization': `Bearer ${orgToken}` }
        });
        const adminResult = await adminResponse.json();
        if (adminResponse.ok) {
            renderOrganizerAdminsList(adminResult.admins || []);
        }
    } catch (err) {
        showToast('Network error loading organizer parameters.', 'error');
    } finally {
        showLoading(false);
    }
}

function toggleOrganizerSubTab(tab) {
    orgSubTab = tab;
    document.getElementById('tab-org-events').classList.toggle('active', tab === 'events');
    document.getElementById('tab-org-admins').classList.toggle('active', tab === 'admins');

    document.getElementById('org-subtab-events-view').classList.toggle('active', tab === 'events');
    document.getElementById('org-subtab-admins-view').classList.toggle('active', tab === 'admins');
}

function renderOrganizerEventsTable() {
    const tbody = document.getElementById('org-events-table-body');
    tbody.innerHTML = '';

    if (organizerEventsCache.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--text-muted);">No events found.</td></tr>';
        return;
    }

    organizerEventsCache.forEach(event => {
        const eventDate = new Date(event.startDate).toLocaleDateString();
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><b>${event.name}</b></td>
            <td>
                ${eventDate} at ${event.startTime}<br>
                <span style="font-size:12px; color:var(--text-muted);">${event.venue}</span>
            </td>
            <td><b>${event.verifiedCount || 0} / ${event.maximumCapacity}</b></td>
            <td><span class="badge badge-success">${event.status.replace('_', ' ')}</span></td>
            <td>
                <button class="btn btn-outline btn-xs" onclick="openEventDeskDirect('${event._id}')">
                    Open Desk
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openEventDeskDirect(eventId) {
    adminToken = orgToken;
    localStorage.setItem('adminToken', adminToken);
    activeEventId = eventId;
    sessionStorage.setItem('activeEventId', eventId);
    
    document.getElementById('admin-auth-wrapper').classList.add('hidden');
    document.getElementById('admin-event-select-wrapper').classList.add('hidden');
    
    showAdminDashboard();
    navigateTo('admin');
}

function buildOrganizerAdminEventChecklist() {
    const container = document.getElementById('create-admin-event-checklist');
    container.innerHTML = '';

    if (organizerEventsCache.length === 0) {
        container.innerHTML = '<p class="empty-list-txt">Create events first.</p>';
        return;
    }

    organizerEventsCache.forEach(e => {
        const label = document.createElement('label');
        label.className = 'checklist-item';
        label.innerHTML = `
            <input type="checkbox" name="assignedEvents" value="${e._id}">
            <span>${e.name}</span>
        `;
        container.appendChild(label);
    });
}

function renderOrganizerAdminsList(admins) {
    const container = document.getElementById('active-admins-list');
    container.innerHTML = '';

    if (admins.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:30px; color:var(--text-muted);">No administrative staff registered.</div>';
        return;
    }

    admins.forEach(adm => {
        const badges = adm.assignedEvents.map(e => `<span class="mini-event-badge">${e.name}</span>`).join(' ');
        const row = document.createElement('div');
        row.className = 'admin-item-row';
        row.innerHTML = `
            <div>
                <h4>${adm.name}</h4>
                <p>${adm.email}</p>
                <div class="admin-assigned-badges">${badges || '<span class="text-muted" style="font-size:10px;">Unassigned</span>'}</div>
            </div>
            <button class="btn btn-danger btn-xs" onclick="revokeAdmin('${adm._id}')">Revoke</button>
        `;
        container.appendChild(row);
    });
}

async function handleCreateEvent(e) {
    e.preventDefault();
    const name = document.getElementById('evt-name').value;
    const category = document.getElementById('evt-category').value;
    const description = document.getElementById('evt-desc').value;
    const banner = document.getElementById('evt-banner').value;
    const venue = document.getElementById('evt-venue').value;
    const startDate = document.getElementById('evt-start-date').value;
    const endDate = document.getElementById('evt-end-date').value;
    const startTime = document.getElementById('evt-start-time').value;
    const endTime = document.getElementById('evt-end-time').value;
    const registrationOpenDate = document.getElementById('evt-reg-open').value;
    const registrationCloseDate = document.getElementById('evt-reg-close').value;
    const maximumCapacity = document.getElementById('evt-capacity').value;
    const status = document.getElementById('evt-status').value;

    showLoading(true, 'Creating event...');

    try {
        const response = await fetch(`${API_BASE}/events`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${orgToken}`
            },
            body: JSON.stringify({
                name, category, description, banner, venue,
                startDate, endDate, startTime, endTime,
                registrationOpenDate, registrationCloseDate,
                maximumCapacity, status
            })
        });

        if (response.ok) {
            showToast('Event created successfully.', 'success');
            hideCreateEventModal();
            loadOrganizerData();
        } else {
            const resData = await response.json();
            showToast(resData.message || 'Creation failed.', 'error');
        }
    } catch (err) {
        showToast('Network error creating event.', 'error');
    } finally {
        showLoading(false);
    }
}

async function handleCreateAdmin(e) {
    e.preventDefault();
    const name = document.getElementById('admin-name').value;
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;

    const assignedEvents = [];
    document.querySelectorAll('#create-admin-event-checklist input:checked').forEach(cb => {
        assignedEvents.push(cb.value);
    });

    showLoading(true, 'Creating admin credentials...');

    try {
        const response = await fetch(`${API_BASE}/admin/create-admin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${orgToken}`
            },
            body: JSON.stringify({ name, email, password, assignedEvents })
        });
        
        if (response.ok) {
            showToast('Administrator registered successfully.', 'success');
            document.getElementById('form-create-admin').reset();
            loadOrganizerData();
        } else {
            const resData = await response.json();
            showToast(resData.message || 'Creation failed.', 'error');
        }
    } catch (err) {
        showToast('Network error registering admin.', 'error');
    } finally {
        showLoading(false);
    }
}

async function revokeAdmin(adminId) {
    if (!confirm('Are you sure you want to revoke this admin account?')) return;
    showLoading(true, 'Revoking admin access...');
    try {
        const response = await fetch(`${API_BASE}/admin/revoke-admin/${adminId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${orgToken}` }
        });
        if (response.ok) {
            showToast('Admin account revoked.', 'success');
            loadOrganizerData();
        } else {
            showToast('Failed to revoke admin.', 'error');
        }
    } catch (err) {
        showToast('Network error.', 'error');
    } finally {
        showLoading(false);
    }
}

function showCreateEventModal() {
    document.getElementById('form-create-event').reset();
    document.getElementById('modal-create-event').classList.remove('hidden');
}
function hideCreateEventModal() {
    document.getElementById('modal-create-event').classList.add('hidden');
}

// ==========================================
// ADMIN CHECK-IN DESK PORTAL
// ==========================================
async function handleAdminLogin(e) {
    e.preventDefault();
    const email = document.getElementById('adm-login-email').value;
    const password = document.getElementById('adm-login-password').value;

    showLoading(true, 'Authenticating admin...');
    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const result = await response.json();

        if (response.ok) {
            if (result.user.role !== 'admin') {
                showToast('Access denied. Admin portal.', 'error');
                return;
            }
            adminToken = result.token;
            localStorage.setItem('adminToken', adminToken);
            activeAdminUserObj = result.user;
            localStorage.setItem('adminUserObj', JSON.stringify(activeAdminUserObj));

            showToast('Login authorized!', 'success');
            showAdminEventSelect();
        } else {
            showToast(result.message || 'Invalid credentials.', 'error');
        }
    } catch (err) {
        showToast('Network error.', 'error');
    } finally {
        showLoading(false);
    }
}

function showAdminEventSelect() {
    document.getElementById('admin-auth-wrapper').classList.add('hidden');
    document.getElementById('admin-event-dashboard').classList.add('hidden');
    
    const select = document.getElementById('adm-select-event');
    select.innerHTML = '<option value="">Select Event...</option>';

    if (activeAdminUserObj && activeAdminUserObj.assignedEvents) {
        activeAdminUserObj.assignedEvents.forEach(e => {
            const opt = document.createElement('option');
            opt.value = e._id;
            opt.textContent = e.name;
            select.appendChild(opt);
        });
    }

    document.getElementById('admin-event-select-wrapper').classList.remove('hidden');
}

function handleAdminEventSelect(e) {
    e.preventDefault();
    const eventId = document.getElementById('adm-select-event').value;
    if (!eventId) {
        showToast('Please select an event.', 'error');
        return;
    }

    // Direct access, no password check required (PRD Section 12)
    activeEventId = eventId;
    sessionStorage.setItem('activeEventId', eventId);
    showAdminDashboard();
}

function showAdminDashboard() {
    document.getElementById('admin-auth-wrapper').classList.add('hidden');
    document.getElementById('admin-event-select-wrapper').classList.add('hidden');
    document.getElementById('admin-event-dashboard').classList.remove('hidden');

    loadAdminDashboardStats();
    directoryPage = 1;
    loadDirectory();
}

function changeAdminEvent() {
    stopScanner();
    activeEventId = null;
    sessionStorage.removeItem('activeEventId');
    showAdminEventSelect();
}

function logoutAdmin() {
    stopScanner();
    adminToken = null;
    activeEventId = null;
    activeAdminUserObj = null;
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUserObj');
    sessionStorage.removeItem('activeEventId');

    document.getElementById('admin-auth-wrapper').classList.remove('hidden');
    document.getElementById('admin-event-dashboard').classList.add('hidden');
    showToast('Desk logged out.', 'success');
}

async function loadAdminDashboardStats() {
    if (!adminToken || !activeEventId) return;

    try {
        const response = await fetch(`${API_BASE}/admin/${activeEventId}/dashboard`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const result = await response.json();

        if (response.ok) {
            document.getElementById('adm-active-event-name').textContent = result.event.name;
            document.getElementById('adm-active-event-venue').textContent = result.event.venue;
            
            const eventDate = new Date(result.event.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
            document.getElementById('adm-active-event-date').textContent = `${eventDate} at ${result.event.startTime}`;

            document.getElementById('adm-metric-total').textContent = result.stats.totalRegistrations;
            document.getElementById('adm-metric-checkedin').textContent = result.stats.checkedInCount;
        }
    } catch (err) {
        console.error('Stats load error:', err.message);
    }
}

async function loadDirectory() {
    if (!adminToken || !activeEventId) return;

    const search = document.getElementById('directory-search-input').value.trim();

    try {
        const response = await fetch(`${API_BASE}/admin/${activeEventId}/participants?page=${directoryPage}&limit=15&search=${search}`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const result = await response.json();

        if (response.ok) {
            renderDirectoryTable(result.participants || []);
            
            directoryTotalPages = result.pagination.totalPages || 1;
            document.getElementById('directory-pagination-info').textContent = `Page ${result.pagination.currentPage} of ${directoryTotalPages} (Total: ${result.pagination.totalCount})`;
            
            document.getElementById('btn-prev-page').disabled = directoryPage <= 1;
            document.getElementById('btn-next-page').disabled = directoryPage >= directoryTotalPages;
        }
    } catch (err) {
        console.error('Directory load error:', err.message);
    }
}

function changeDirectoryPage(delta) {
    const target = directoryPage + delta;
    if (target >= 1 && target <= directoryTotalPages) {
        directoryPage = target;
        loadDirectory();
    }
}

function renderDirectoryTable(list) {
    const tbody = document.getElementById('directory-table-body');
    tbody.innerHTML = '';

    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:20px;">No attendees found.</td></tr>';
        return;
    }

    list.forEach(p => {
        let statusText = '<span class="badge badge-pending">Pending</span>';
        let actionBtn = `<button class="btn btn-success btn-xs" onclick="manualMarkPresent('${p.registrationId}')">Mark Present</button>`;

        if (p.attendanceStatus === 'Checked-In') {
            statusText = `<span class="badge badge-success">Checked-In</span><br><span style="font-size:10px; color:var(--text-muted);">${p.attendanceTimestamp ? new Date(p.attendanceTimestamp).toLocaleTimeString() : ''}</span>`;
            actionBtn = '<span class="text-muted" style="font-size:11px;">Completed</span>';
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><code>${p.registrationId}</code></td>
            <td><b>${p.name}</b></td>
            <td>
                ${p.email}<br>
                <span style="font-size:11px; color:var(--text-muted);">${p.phone}</span>
            </td>
            <td>${statusText}</td>
            <td>${actionBtn}</td>
        `;
        tbody.appendChild(tr);
    });
}

// QR Code Scanning
function startScanner() {
    document.getElementById('btn-start-scanner').classList.add('hidden');
    document.getElementById('btn-stop-scanner').classList.remove('hidden');
    document.getElementById('scanner-feedback').classList.add('hidden');

    html5QrcodeScanner = new Html5Qrcode("qr-camera-viewport");
    const config = { fps: 10, qrbox: { width: 220, height: 220 } };

    html5QrcodeScanner.start(
        { facingMode: "environment" },
        config,
        onScanSuccess,
        onScanFailure
    ).catch(err => {
        showToast('Camera access permission denied or failed.', 'error');
        stopScanner();
    });
}

async function stopScanner() {
    document.getElementById('btn-start-scanner').classList.remove('hidden');
    document.getElementById('btn-stop-scanner').classList.add('hidden');
    
    if (html5QrcodeScanner) {
        try {
            await html5QrcodeScanner.stop();
            html5QrcodeScanner.clear();
        } catch (e) {
            // Ignored
        }
        html5QrcodeScanner = null;
    }
}

async function onScanSuccess(decodedText) {
    await stopScanner();

    const feedback = document.getElementById('scanner-feedback');
    feedback.className = 'scanner-feedback-box'; // reset
    feedback.classList.remove('hidden');

    document.getElementById('scan-feedback-icon').innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';
    document.getElementById('scan-feedback-title').textContent = 'Checking registration...';
    document.getElementById('scan-feedback-desc').textContent = 'Validating parameters';

    try {
        const response = await fetch(`${API_BASE}/attendance/mark`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({ qrData: decodedText })
        });
        const result = await response.json();

        // Exact scan feedbacks check (PRD Section 16)
        if (response.ok) {
            feedback.classList.add('success');
            document.getElementById('scan-feedback-icon').innerHTML = '<i class="fa-solid fa-circle-check text-success"></i>';
            document.getElementById('scan-feedback-title').textContent = '✓ Attendance Recorded';
            document.getElementById('scan-feedback-desc').textContent = `${result.participant.name} is successfully checked in.`;
            showToast('✓ Attendance Recorded', 'success');

            loadAdminDashboardStats();
            loadDirectory();
        } else {
            feedback.classList.add('error');
            document.getElementById('scan-feedback-icon').innerHTML = '<i class="fa-solid fa-triangle-exclamation text-danger"></i>';
            
            const message = result.message || '✗ Invalid Registration';
            document.getElementById('scan-feedback-title').textContent = message;
            document.getElementById('scan-feedback-desc').textContent = message.includes('Already') ? 'This QR code was scanned earlier.' : 'Invalid code structure.';
            showToast(message, message.includes('Already') ? 'warning' : 'error');
        }
    } catch (err) {
        feedback.classList.add('error');
        document.getElementById('scan-feedback-icon').innerHTML = '<i class="fa-solid fa-circle-exclamation text-danger"></i>';
        document.getElementById('scan-feedback-title').textContent = '✗ Invalid Registration';
        document.getElementById('scan-feedback-desc').textContent = 'Network communication failure.';
        showToast('✗ Invalid Registration', 'error');
    }

    // Auto resume after 3 seconds
    setTimeout(() => {
        if (currentPage === 'admin' && !document.getElementById('admin-event-dashboard').classList.contains('hidden')) {
            startScanner();
        } else {
            feedback.classList.add('hidden');
        }
    }, 3000);
}

function onScanFailure(error) {
    // Standard scanner logs
}

async function handleManualCheckin(e) {
    e.preventDefault();
    const regId = document.getElementById('manual-reg-id-input').value.trim();
    await manualMarkPresent(regId);
}

async function manualMarkPresent(regId) {
    if (!regId) return;

    showLoading(true, 'Checking in manually...');
    try {
        const response = await fetch(`${API_BASE}/attendance/mark-manual`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({ registrationId: regId, eventId: activeEventId })
        });
        const result = await response.json();

        if (response.ok) {
            showToast('✓ Attendance Recorded', 'success');
            document.getElementById('manual-reg-id-input').value = '';
            loadAdminDashboardStats();
            loadDirectory();
        } else {
            showToast(result.message || 'Mark present failed.', 'error');
        }
    } catch (err) {
        showToast('Network error during manual check-in.', 'error');
    } finally {
        showLoading(false);
    }
}

async function exportReport(format) {
    if (!adminToken || !activeEventId) return;

    showLoading(true, 'Compiling report...');
    try {
        const response = await fetch(`${API_BASE}/admin/${activeEventId}/export-csv`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });

        if (response.ok) {
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            
            // File naming
            const disposition = response.headers.get('Content-Disposition');
            let filename = 'report.csv';
            if (disposition && disposition.includes('filename=')) {
                filename = disposition.split('filename=')[1].replace(/['"]/g, '');
            }
            
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            a.remove();
            showToast('CSV Report downloaded successfully.', 'success');
        } else {
            showToast('Failed to export CSV report.', 'error');
        }
    } catch (err) {
        showToast('Network error during download.', 'error');
    } finally {
        showLoading(false);
    }
}

// ==========================================
// SIMULATED DRAWER LOGS
// ==========================================
function toggleMailbox() {
    const drawer = document.getElementById('simulated-mailbox-drawer');
    mailboxOpen = !mailboxOpen;
    drawer.classList.toggle('hidden', !mailboxOpen);
    
    if (mailboxOpen) {
        fetchSimulatedEmails();
        mailboxInterval = setInterval(fetchSimulatedEmails, 5000);
    } else {
        if (mailboxInterval) {
            clearInterval(mailboxInterval);
            mailboxInterval = null;
        }
    }
}

async function fetchSimulatedEmails() {
    try {
        const response = await fetch(`${API_BASE}/registration/simulated-emails`);
        const result = await response.json();
        
        if (response.ok) {
            renderSimulatedMailbox(result.notifications || []);
        }
    } catch (err) {
        console.error('Mail intercept fetch error:', err.message);
    }
}

function triggerMailboxPoll() {
    fetchSimulatedEmails();
}

function renderSimulatedMailbox(list) {
    const container = document.getElementById('mailbox-messages-list');
    document.getElementById('mail-badge-count').textContent = list.length;
    container.innerHTML = '';

    if (list.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:30px; color:var(--text-muted);">No SMTP mail intercept records.</div>';
        return;
    }

    list.forEach(msg => {
        const sentTime = new Date(msg.sentAt).toLocaleTimeString();
        const otpMatch = msg.content.match(/\b\d{6}\b/);
        const otpCode = otpMatch ? otpMatch[0] : '';
        const copyButtonHtml = otpCode 
            ? `<button class="otp-copy-btn" onclick="copyOtpToClipboard('${otpCode}', this)"><i class="fa-solid fa-copy"></i> Copy OTP: ${otpCode}</button>`
            : '';

        const item = document.createElement('div');
        item.className = 'mail-item';
        item.innerHTML = `
            <div class="mail-item-header">
                <span class="mail-item-recipient">To: ${msg.recipient}</span>
                <span>${sentTime}</span>
            </div>
            <div class="mail-item-subject">${msg.type}</div>
            <div class="mail-item-body">${msg.content}</div>
            ${copyButtonHtml}
        `;
        container.appendChild(item);
    });
}

function copyOtpToClipboard(code, btn) {
    navigator.clipboard.writeText(code).then(() => {
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
        showToast('OTP copied to clipboard.', 'success');
        
        const otpInput = document.getElementById('otp-input');
        if (otpInput && document.getElementById('reg-step-2').classList.contains('active')) {
            otpInput.value = code;
        }

        setTimeout(() => {
            btn.innerHTML = `<i class="fa-solid fa-copy"></i> Copy OTP: ${code}`;
        }, 2000);
    });
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================
function showLoading(show, message = 'Loading parameters...') {
    const loader = document.getElementById('app-loading-screen');
    document.getElementById('loading-overlay-message').textContent = message;
    
    if (show) {
        loader.classList.remove('hidden');
    } else {
        loader.classList.add('hidden');
    }
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = '<i class="fa-solid fa-circle-info"></i>';
    if (type === 'success') icon = '<i class="fa-solid fa-circle-check text-success"></i>';
    if (type === 'error') icon = '<i class="fa-solid fa-circle-exclamation text-danger"></i>';
    if (type === 'warning') icon = '<i class="fa-solid fa-triangle-exclamation text-warning"></i>';

    toast.innerHTML = `${icon} <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease-out forwards';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 4000);
}
// Append basic animation
document.write('<style>@keyframes fadeOut { from { opacity: 1; } to { opacity: 0; transform: translateY(8px); } }</style>');
