const express = require('express');
const Event = require('../models/Event');
const Participant = require('../models/Participant');
const auth = require('../middleware/auth');
const router = express.Router();

// Middleware to check if user is an organizer
const isOrganizer = (req, res, next) => {
    if (req.user && req.user.role === 'organizer') {
        next();
    } else {
        res.status(403).json({ message: 'Access denied. Organizers only.' });
    }
};

// Create an Event (Organizer only)
router.post('/', auth, isOrganizer, async (req, res) => {
    try {
        const {
            name, description, banner, venue, category,
            startDate, endDate, startTime, endTime,
            registrationOpenDate, registrationCloseDate,
            maximumCapacity, allowWaitlist,
            enableQrAttendance, enableManualAttendance,
            eventAccessPassword, customFields
        } = req.body;

        const event = new Event({
            name, description, banner, venue, category,
            startDate, endDate, startTime, endTime,
            registrationOpenDate, registrationCloseDate,
            maximumCapacity, allowWaitlist,
            enableQrAttendance, enableManualAttendance,
            eventAccessPassword, customFields,
            organizer: req.user._id
        });

        await event.save();
        res.status(201).json({ message: 'Event created successfully', event });
    } catch (error) {
        console.error('Create event error:', error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
});

// Get Public Event Listing
// Default: upcoming events sorted by closest date first.
// If query past=true: past events sorted by most recent first.
router.get('/', async (req, res) => {
    try {
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Start of today

        const showPast = req.query.past === 'true';

        let query = {};
        if (showPast) {
            query.endDate = { $lt: now };
        } else {
            query.endDate = { $gte: now };
        }

        const events = await Event.find(query)
            .sort(showPast ? { startDate: -1, startTime: -1 } : { startDate: 1, startTime: 1 })
            .populate('organizer', 'name email');

        // Append verified registration count for each event
        const eventsWithCounts = await Promise.all(events.map(async (event) => {
            const count = await Participant.countDocuments({ event: event._id, isVerified: true });
            return { ...event.toObject(), verifiedCount: count };
        }));

        res.json({ events: eventsWithCounts });
    } catch (error) {
        console.error('Get public events error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get Events created by logged-in Organizer
router.get('/organizer', auth, isOrganizer, async (req, res) => {
    try {
        const events = await Event.find({ organizer: req.user._id }).sort({ startDate: -1 });
        
        // Append verified counts
        const eventsWithCounts = await Promise.all(events.map(async (event) => {
            const count = await Participant.countDocuments({ event: event._id, isVerified: true });
            return { ...event.toObject(), verifiedCount: count };
        }));

        res.json({ events: eventsWithCounts });
    } catch (error) {
        console.error('Get organizer events error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get specific Event details (public metadata, hides admin details like eventAccessPassword)
router.get('/:id', async (req, res) => {
    try {
        const event = await Event.findById(req.params.id).populate('organizer', 'name email');
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Return event with sensitive password field removed
        const eventData = event.toObject();
        delete eventData.eventAccessPassword;

        res.json({ event: eventData });
    } catch (error) {
        console.error('Get event details error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
