const express = require('express');
const cors = require('cors');
const path = require('path');
const dns = require('dns').promises;
const net = require('net');

const app = express();
const PORT = 3001; 

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

async function checkMailboxExists(email) {
    const domain = email.split('@')[1];
    if (!domain) return false;
    if (domain.toLowerCase() === 'event.com') return true;

    try {
        const mxRecords = await dns.resolveMx(domain);
        if (!mxRecords || mxRecords.length === 0) return false;

        mxRecords.sort((a, b) => a.priority - b.priority);
        const exchange = mxRecords[0].exchange;

        return new Promise((resolve) => {
            const socket = net.createConnection(25, exchange);
            let responseReceived = '';
            let step = 0;
            let result = true;

            socket.setTimeout(4000);

            const write = (cmd) => {
                if (!socket.destroyed) socket.write(cmd);
            };

            socket.on('data', (chunk) => {
                responseReceived += chunk.toString();
                if (responseReceived.endsWith('\n')) {
                    const lines = responseReceived.trim().split('\r\n');
                    const lastLine = lines[lines.length - 1];
                    responseReceived = '';

                    if (step === 0 && lastLine.startsWith('220')) {
                        write('HELO eventra.com\r\n');
                        step = 1;
                    } else if (step === 1 && lastLine.startsWith('250')) {
                        write('MAIL FROM:<verify@eventra.com>\r\n');
                        step = 2;
                    } else if (step === 2 && lastLine.startsWith('250')) {
                        write(`RCPT TO:<${email}>\r\n`);
                        step = 3;
                    } else if (step === 3) {
                        if (lastLine.startsWith('550') || lastLine.startsWith('551') || lastLine.startsWith('553')) {
                            result = false;
                        } else {
                            result = true;
                        }
                        write('QUIT\r\n');
                        socket.end();
                    }
                }
            });

            socket.on('error', (err) => {
                console.log(`SMTP check error: ${err.message}`);
                resolve(true);
            });

            socket.on('timeout', () => {
                socket.destroy();
                resolve(true);
            });

            socket.on('close', () => {
                resolve(result);
            });
        });
    } catch (error) {
        return true;
    }
}

// Mock Database Collections
let users = [
    { _id: 'org-1', name: 'ACM Chapter', email: 'organizer@event.com', password: 'organizer123', role: 'organizer', assignedEvents: [] },
    { _id: 'adm-1', name: 'Admin Joe', email: 'admin1@event.com', password: 'admin123', role: 'admin', assignedEvents: ['evt-1', 'evt-2'] },
    { _id: 'adm-2', name: 'Admin Sam', email: 'admin2@event.com', password: 'admin123', role: 'admin', assignedEvents: ['evt-2'] }
];

let events = [
    {
        _id: 'evt-1',
        name: 'Hackathon 2026',
        description: 'A coding sprint event where programmers collaborate and build software.',
        banner: 'theme-purple',
        category: 'HACK',
        venue: 'Main Science Annex',
        startDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // tomorrow
        endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        startTime: '09:00 AM',
        endTime: '05:00 PM',
        registrationOpenDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        registrationCloseDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        maximumCapacity: 80,
        status: 'registration_open',
        participantCounter: 3,
        organizer: { _id: 'org-1', name: 'ACM Chapter' }
    },
    {
        _id: 'evt-2',
        name: 'React JS Workshop',
        description: 'Hands-on training session on building user interfaces using React.',
        banner: 'theme-indigo',
        category: 'WORK',
        venue: 'Programming Lab 3',
        startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // day after tomorrow
        endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        startTime: '02:00 PM',
        endTime: '05:00 PM',
        registrationOpenDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        registrationCloseDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        maximumCapacity: 40,
        status: 'registration_open',
        participantCounter: 2,
        organizer: { _id: 'org-1', name: 'ACM Chapter' }
    }
];

let participants = [
    { _id: 'p-1', event: 'evt-1', name: 'Alice Smith', email: 'alice@gmail.com', phone: '9876543201', college: 'Stanford', registrationId: 'HACK2026-0001', qrCodeData: '', isVerified: true, attendanceStatus: 'Checked-In', attendanceTimestamp: new Date(Date.now() - 30 * 60 * 1000), registrationTimestamp: new Date() },
    { _id: 'p-2', event: 'evt-1', name: 'Bob Jones', email: 'bob@yahoo.com', phone: '9876543202', college: 'MIT', registrationId: 'HACK2026-0002', qrCodeData: '', isVerified: true, attendanceStatus: 'Checked-In', attendanceTimestamp: new Date(Date.now() - 15 * 60 * 1000), registrationTimestamp: new Date() },
    { _id: 'p-3', event: 'evt-1', name: 'Charlie Brown', email: 'charlie@gmail.com', phone: '9876543203', college: 'Harvard', registrationId: 'HACK2026-0003', qrCodeData: '', isVerified: true, attendanceStatus: 'Pending', attendanceTimestamp: null, registrationTimestamp: new Date() },
    
    { _id: 'p-4', event: 'evt-2', name: 'David Lee', email: 'david@gmail.com', phone: '9876543204', college: 'Stanford', registrationId: 'WORK2026-0001', qrCodeData: '', isVerified: true, attendanceStatus: 'Checked-In', attendanceTimestamp: new Date(Date.now() - 10 * 60 * 1000), registrationTimestamp: new Date() },
    { _id: 'p-5', event: 'evt-2', name: 'Emily Rose', email: 'emily@gmail.com', phone: '9876543205', college: 'UC Berkeley', registrationId: 'WORK2026-0002', qrCodeData: '', isVerified: true, attendanceStatus: 'Pending', attendanceTimestamp: null, registrationTimestamp: new Date() }
];

let notifications = [];

// ==========================================
// MOCK API ROUTES
// ==========================================

// 1. Auth Login
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        let assignedEventsData = [];
        if (user.role === 'admin') {
            assignedEventsData = events.filter(e => user.assignedEvents.includes(e._id)).map(event => ({
                _id: event._id,
                name: event.name
            }));
        }

        res.json({
            token: `mock-jwt-token-for-${user.role}-${user._id}`,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                assignedEvents: assignedEventsData
            }
        });
    } else {
        res.status(400).json({ message: 'Invalid credentials' });
    }
});

// 2. Auth Register
app.post('/api/auth/register', (req, res) => {
    const { name, email, password } = req.body;
    const existing = users.find(u => u.email === email);
    if (existing) return res.status(400).json({ message: 'Email already registered' });

    const newUser = {
        _id: 'org-' + Date.now(),
        name,
        email,
        password,
        role: 'organizer',
        assignedEvents: []
    };
    users.push(newUser);

    res.status(201).json({
        token: `mock-jwt-token-for-organizer-${newUser._id}`,
        user: {
            id: newUser._id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role
        }
    });
});

// 3. Create Admin
app.post('/api/admin/create-admin', (req, res) => {
    const { name, email, password, assignedEvents } = req.body;
    const existing = users.find(u => u.email === email);
    if (existing) return res.status(400).json({ message: 'Email already exists' });

    const newAdmin = {
        _id: 'adm-' + Date.now(),
        name,
        email,
        password,
        role: 'admin',
        assignedEvents: assignedEvents || []
    };
    users.push(newAdmin);
    res.status(201).json({ message: 'Admin account created successfully.' });
});

// 4. List Admins
app.get('/api/admin/list-admins', (req, res) => {
    const adminsList = users.filter(u => u.role === 'admin').map(adm => {
        const assignedEventsData = events.filter(e => adm.assignedEvents.includes(e._id));
        return {
            _id: adm._id,
            name: adm.name,
            email: adm.email,
            assignedEvents: assignedEventsData
        };
    });
    res.json({ admins: adminsList });
});

// 5. Revoke Admin
app.delete('/api/admin/revoke-admin/:id', (req, res) => {
    users = users.filter(u => u._id !== req.params.id);
    res.json({ message: 'Admin credentials revoked.' });
});

// 6. Get Public Events
app.get('/api/events', (req, res) => {
    const eventsWithCounts = events.map(e => {
        const count = participants.filter(p => p.event === e._id && p.isVerified).length;
        return { ...e, verifiedCount: count };
    });
    res.json({ events: eventsWithCounts });
});

// 7. Get Events created by logged-in Organizer
app.get('/api/events/organizer', (req, res) => {
    const orgEvents = events.map(e => {
        const count = participants.filter(p => p.event === e._id && p.isVerified).length;
        return { ...e, verifiedCount: count };
    });
    res.json({ events: orgEvents });
});

// 8. Get Event details
app.get('/api/events/:id', (req, res) => {
    const event = events.find(e => e._id === req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json({ event });
});

// 9. Create Event
app.post('/api/events', (req, res) => {
    const eventData = req.body;
    const newEvent = {
        _id: 'evt-' + Date.now(),
        ...eventData,
        startDate: new Date(eventData.startDate),
        endDate: new Date(eventData.endDate),
        organizer: { _id: 'org-1', name: 'ACM Chapter' },
        verifiedCount: 0
    };
    events.push(newEvent);
    res.status(201).json({ message: 'Event created successfully', event: newEvent });
});

// 10. Organizer Portal Stats
app.get('/api/admin/organizer-stats', (req, res) => {
    const totalEvents = events.length;
    const upcomingEvents = events.filter(e => new Date(e.endDate) >= new Date()).length;
    const totalRegistrations = participants.filter(p => p.isVerified).length;
    const totalAttendance = participants.filter(p => p.isVerified && p.attendanceStatus === 'Checked-In').length;

    res.json({
        stats: {
            totalEvents,
            upcomingEvents,
            totalRegistrations,
            totalAttendance
        }
    });
});

// 11. Request OTP
app.post('/api/registration/request-otp', (req, res) => {
    const { eventId, name, email, phone, college, department, yearOfStudy } = req.body;
    const event = events.find(e => e._id === eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const otpCode = '789123';
    const newParticipant = {
        _id: 'p-' + Date.now(),
        event: eventId,
        name,
        email,
        phone,
        college,
        department: department || '',
        yearOfStudy: yearOfStudy || '',
        registrationId: '',
        isVerified: false,
        otp: { code: otpCode, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
        attendanceStatus: 'Pending',
        attendanceTimestamp: null,
        registrationTimestamp: new Date()
    };
    participants.push(newParticipant);

    const hasRealSMTP = !!(process.env.SMTP_USER && process.env.SMTP_PASS);
    const loggedText = hasRealSMTP 
        ? `Hello ${name},\n\nYour verification code is: ******.\nIt will expire in 10 minutes.`
        : `Hello ${name},\n\nYour verification code is: ${otpCode}.\nIt will expire in 10 minutes.`;

    notifications.unshift({
        event: eventId,
        recipient: email,
        type: 'OTP',
        content: loggedText,
        sentAt: new Date()
    });

    res.json({ message: 'Verification OTP sent successfully.' });
});

// 12. Verify OTP
app.post('/api/registration/verify-otp', (req, res) => {
    const { eventId, email, otp } = req.body;
    const participant = participants.find(p => p.event === eventId && p.email === email && !p.isVerified);
    
    if (!participant || participant.otp.code !== otp) {
        return res.status(400).json({ message: 'Invalid OTP code' });
    }

    const event = events.find(e => e._id === eventId);
    event.participantCounter += 1;
    const regId = `${event.category.toUpperCase()}${new Date(event.startDate).getFullYear()}-${String(event.participantCounter).padStart(4, '0')}`;
    
    participant.isVerified = true;
    participant.registrationId = regId;
    participant.qrCodeData = JSON.stringify({ registrationId: regId, eventId });
    participant.otp = undefined;

    notifications.unshift({
        event: eventId,
        recipient: email,
        type: 'Registration Success',
        content: `Hi ${participant.name},\n\nYour registration is confirmed!\nEvent: ${event.name}\nVenue: ${event.venue}\nRegistration ID: ${regId}\n\nPlease bring your QR code ticket for scanning.`,
        sentAt: new Date()
    });

    const mockQrCodeBase64 = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`;

    res.json({
        message: 'Registration verified and ticket issued.',
        participant: {
            name: participant.name,
            email: participant.email,
            registrationId: regId,
            qrCode: mockQrCodeBase64,
            event: event.name,
            venue: event.venue,
            dateTime: `${new Date(event.startDate).toLocaleDateString()} at ${event.startTime}`
        }
    });
});

// 13. Simulated Emails list
app.get('/api/registration/simulated-emails', (req, res) => {
    res.json({ notifications });
});

// 14. Mark Attendance (QR)
app.post('/api/attendance/mark', (req, res) => {
    const { qrData } = req.body;
    let parsed;
    try {
        parsed = JSON.parse(qrData);
    } catch (e) {
        return res.status(400).json({ message: '✗ Invalid Registration' });
    }

    const { registrationId, eventId } = parsed;
    const p = participants.find(part => part.event === eventId && part.registrationId === registrationId && part.isVerified);
    
    if (!p) {
        return res.status(404).json({ message: '✗ Invalid Registration' });
    }

    if (p.attendanceStatus === 'Checked-In') {
        return res.status(400).json({
            message: '⚠ Already Checked In',
            participant: { name: p.name, email: p.email, registrationId: p.registrationId, attendanceTimestamp: p.attendanceTimestamp }
        });
    }

    p.attendanceStatus = 'Checked-In';
    p.attendanceTimestamp = new Date();

    const event = events.find(e => e._id === eventId);
    notifications.unshift({
        event: eventId,
        recipient: p.email,
        type: 'Attendance Confirmation',
        content: `Hello ${p.name},\n\nYour attendance at "${event.name}" has been recorded successfully.`,
        sentAt: new Date()
    });

    res.json({
        message: '✓ Attendance Recorded',
        participant: { name: p.name, email: p.email, registrationId: p.registrationId, attendanceTimestamp: p.attendanceTimestamp }
    });
});

// 15. Mark Manual Check-In
app.post('/api/attendance/mark-manual', (req, res) => {
    const { registrationId, eventId } = req.body;
    const p = participants.find(part => part.event === eventId && part.registrationId === registrationId && part.isVerified);
    
    if (!p) return res.status(404).json({ message: 'Verified participant not found' });
    if (p.attendanceStatus === 'Checked-In') {
        return res.status(400).json({ message: '⚠ Already Checked In' });
    }

    p.attendanceStatus = 'Checked-In';
    p.attendanceTimestamp = new Date();

    const event = events.find(e => e._id === eventId);
    notifications.unshift({
        event: eventId,
        recipient: p.email,
        type: 'Attendance Confirmation',
        content: `Hello ${p.name},\n\nYour attendance at "${event.name}" has been manually marked successfully.`,
        sentAt: new Date()
    });

    res.json({
        message: '✓ Attendance Recorded',
        participant: { name: p.name, email: p.email, registrationId: p.registrationId, attendanceTimestamp: p.attendanceTimestamp }
    });
});

// 16. Admin Event Stats
app.get('/api/admin/:eventId/dashboard', (req, res) => {
    const { eventId } = req.params;
    const event = events.find(e => e._id === eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const totalRegistrations = participants.filter(p => p.event === eventId && p.isVerified).length;
    const checkedInCount = participants.filter(p => p.event === eventId && p.isVerified && p.attendanceStatus === 'Checked-In').length;

    res.json({
        event,
        stats: {
            totalRegistrations,
            checkedInCount
        }
    });
});

// 17. Directory list
app.get('/api/admin/:eventId/participants', (req, res) => {
    const { eventId } = req.params;
    const { page = 1, limit = 50, search = '' } = req.query;

    let filtered = participants.filter(p => p.event === eventId && p.isVerified);

    if (search.trim()) {
        const s = search.toLowerCase();
        filtered = filtered.filter(p => p.name.toLowerCase().includes(s) || p.email.toLowerCase().includes(s) || p.registrationId.toLowerCase().includes(s));
    }

    const totalCount = filtered.length;
    const paginated = filtered.slice((page - 1) * limit, page * limit);

    res.json({
        participants: paginated,
        pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalCount / limit),
            totalCount
        }
    });
});

// 18. Export CSV
app.get('/api/admin/:eventId/export-csv', (req, res) => {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=mock_attendance_report.csv');
    res.send('Registration ID,Name,Email,Status\nHACK2026-0001,Alice Smith,alice@gmail.com,Checked-In\n');
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Standalone Mock Test Server running on port ${PORT}`);
});
