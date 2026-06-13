const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Event = require('../models/Event');
const Participant = require('../models/Participant');
const router = express.Router();

const isOrganizer = (req, res, next) => {
    if (req.user && req.user.role === 'organizer') {
        next();
    } else {
        res.status(403).json({ message: 'Access denied. Organizers only.' });
    }
};

// 1. Create Admin Account (Organizer only)
router.post('/create-admin', auth, isOrganizer, async (req, res) => {
    try {
        const { name, email, password, assignedEvents } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Name, email, and password are required' });
        }

        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(400).json({ message: 'A user account with this email already exists' });
        }

        const adminUser = new User({
            name,
            email,
            password,
            role: 'admin',
            assignedEvents: assignedEvents || []
        });
        await adminUser.save();

        res.status(201).json({ message: 'Admin account created successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Error creating administrator account.' });
    }
});

// 2. Revoke Admin Account (Organizer only)
router.delete('/revoke-admin/:id', auth, isOrganizer, async (req, res) => {
    try {
        await User.findOneAndDelete({ _id: req.params.id, role: 'admin' });
        res.json({ message: 'Admin credentials revoked successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Error revoking administrator access.' });
    }
});

// 3. List Active Administrators (Organizer only)
router.get('/list-admins', auth, isOrganizer, async (req, res) => {
    try {
        const admins = await User.find({ role: 'admin' })
            .select('-password')
            .populate('assignedEvents', 'name');
        res.json({ admins });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching admins list.' });
    }
});

// 4. Organizer Portal Stats (PRD Section 14)
router.get('/organizer-stats', auth, isOrganizer, async (req, res) => {
    try {
        const orgId = req.user._id;
        const totalEvents = await Event.countDocuments({ organizer: orgId });
        
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const upcomingEvents = await Event.countDocuments({ organizer: orgId, endDate: { $gte: now } });

        const myEvents = await Event.find({ organizer: orgId }).select('_id');
        const myEventIds = myEvents.map(e => e._id);

        const totalRegistrations = await Participant.countDocuments({ event: { $in: myEventIds }, isVerified: true });
        const totalAttendance = await Participant.countDocuments({ event: { $in: myEventIds }, isVerified: true, attendanceStatus: 'Checked-In' });

        res.json({
            stats: {
                totalEvents,
                upcomingEvents,
                totalRegistrations,
                totalAttendance
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving organizer statistics.' });
    }
});

// 5. Admin Event Dashboard Summary (PRD Section 15)
router.get('/:eventId/dashboard', auth, async (req, res) => {
    try {
        const { eventId } = req.params;
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found.' });
        }

        const totalRegistrations = await Participant.countDocuments({ event: eventId, isVerified: true });
        const checkedInCount = await Participant.countDocuments({ event: eventId, isVerified: true, attendanceStatus: 'Checked-In' });

        res.json({
            event: {
                name: event.name,
                venue: event.venue,
                startDate: event.startDate,
                startTime: event.startTime,
                description: event.description,
                category: event.category,
                maximumCapacity: event.maximumCapacity
            },
            stats: {
                totalRegistrations,
                checkedInCount
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error loading admin event dashboard.' });
    }
});

// 6. Paginated & Searchable Participant Directory (PRD Section 15)
router.get('/:eventId/participants', auth, async (req, res) => {
    try {
        const { eventId } = req.params;
        const { search = '', page = 1, limit = 50 } = req.query;

        const skip = (page - 1) * limit;
        let query = { event: eventId, isVerified: true };

        if (search.trim()) {
            const regex = new RegExp(search.trim(), 'i');
            query.$or = [
                { name: regex },
                { email: regex },
                { registrationId: regex }
            ];
        }

        const participants = await Participant.find(query)
            .sort({ name: 1 })
            .skip(skip)
            .limit(parseInt(limit));

        const totalCount = await Participant.countDocuments(query);

        res.json({
            participants,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalCount / limit),
                totalCount
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error searching participants directory.' });
    }
});

// 7. Export CSV Participant & Attendance Lists (PRD Section 19)
router.get('/:eventId/export-csv', auth, async (req, res) => {
    try {
        const { eventId } = req.params;
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found.' });
        }

        const participants = await Participant.find({ event: eventId, isVerified: true }).sort({ name: 1 });

        let csv = 'Registration ID,Name,Email,Phone,Attendance Status,Check-In Time\n';
        participants.forEach(p => {
            const timeStr = p.attendanceTimestamp ? p.attendanceTimestamp.toLocaleString() : 'N/A';
            csv += `"${p.registrationId}","${p.name}","${p.email}","${p.phone}","${p.attendanceStatus}","${timeStr}"\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${event.name.replace(/\s+/g, '_')}_report.csv"`);
        res.status(200).send(csv);
    } catch (error) {
        res.status(500).json({ message: 'Error generating CSV download.' });
    }
});

module.exports = router;
