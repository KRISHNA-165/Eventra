const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3001; // Different port to avoid conflict

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Mock data for testing
let participants = [];
let adminToken = 'mock-admin-token';

// Mock registration endpoint
app.post('/api/registration/register', (req, res) => {
    const { name, email, registrationId } = req.body;
    
    if (!name || !email) {
        return res.status(400).json({ message: 'Name and email are required' });
    }
    
    // Check if email already exists
    const existing = participants.find(p => p.email === email);
    if (existing) {
        return res.status(400).json({ message: 'Email already registered' });
    }
    
    const finalRegistrationId = registrationId || `REG-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    
    const participant = {
        id: Date.now(),
        name,
        email,
        registrationId: finalRegistrationId,
        attendanceStatus: 'Not Attended',
        attendanceTimestamp: null,
        registrationTimestamp: new Date()
    };
    
    participants.push(participant);
    
    // Generate mock QR code (base64 encoded simple data)
    const qrData = JSON.stringify({
        registrationId: finalRegistrationId,
        email: email,
        name: name
    });
    
    // Simple QR code as data URL (mock)
    const qrCodeBase64 = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`;
    
    res.json({
        message: 'Registration successful',
        participant: {
            name: participant.name,
            email: participant.email,
            registrationId: participant.registrationId,
            qrCode: qrCodeBase64
        }
    });
});

// Mock attendance endpoint
app.post('/api/attendance/mark', (req, res) => {
    const { qrData } = req.body;
    
    if (!qrData) {
        return res.status(400).json({ message: 'QR code data is required' });
    }
    
    let parsedData;
    try {
        parsedData = JSON.parse(qrData);
    } catch (error) {
        return res.status(400).json({ message: 'Invalid QR code data format' });
    }
    
    const { registrationId, email } = parsedData;
    const participant = participants.find(p => p.registrationId === registrationId && p.email === email);
    
    if (!participant) {
        return res.status(404).json({ message: 'Participant not found' });
    }
    
    if (participant.attendanceStatus === 'Attended') {
        return res.status(400).json({ 
            message: 'Attendance already marked',
            participant: {
                name: participant.name,
                email: participant.email,
                registrationId: participant.registrationId,
                attendanceTimestamp: participant.attendanceTimestamp
            }
        });
    }
    
    participant.attendanceStatus = 'Attended';
    participant.attendanceTimestamp = new Date();
    
    res.json({
        message: 'Attendance marked successfully',
        participant: {
            name: participant.name,
            email: participant.email,
            registrationId: participant.registrationId,
            attendanceTimestamp: participant.attendanceTimestamp
        }
    });
});

// Mock admin login
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    if (email === 'admin@event.com' && password === 'admin123') {
        res.json({
            token: adminToken,
            admin: {
                id: 'mock-admin-id',
                email: email
            }
        });
    } else {
        res.status(400).json({ message: 'Invalid credentials' });
    }
});

// Mock dashboard
app.get('/api/admin/dashboard', (req, res) => {
    const totalRegistered = participants.length;
    const totalAttended = participants.filter(p => p.attendanceStatus === 'Attended').length;
    const totalNotAttended = totalRegistered - totalAttended;
    
    const recentAttendees = participants
        .filter(p => p.attendanceStatus === 'Attended')
        .sort((a, b) => new Date(b.attendanceTimestamp) - new Date(a.attendanceTimestamp))
        .slice(0, 10);
    
    res.json({
        stats: {
            totalRegistered,
            totalAttended,
            totalNotAttended,
            attendanceRate: totalRegistered > 0 ? ((totalAttended / totalRegistered) * 100).toFixed(2) : 0
        },
        recentAttendees
    });
});

// Serve static files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Test server running on port ${PORT}`);
    console.log(`🌐 Open http://localhost:${PORT} to test the application`);
    console.log(`📝 This is a mock version for testing without MongoDB`);
});

