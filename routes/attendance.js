const express = require('express');
const auth = require('../middleware/auth');
const Participant = require('../models/Participant');
const Event = require('../models/Event');
const Attendance = require('../models/Attendance');
const Notification = require('../models/Notification');
const { sendMail } = require('../utils/mailer');
const router = express.Router();

// Helper to verify if the admin user is assigned to the event
async function checkEventAccess(user, eventId) {
    if (user.role === 'organizer') {
        const event = await Event.findOne({ _id: eventId, organizer: user._id });
        return !!event;
    } else if (user.role === 'admin') {
        return user.assignedEvents.some(id => id.toString() === eventId.toString());
    }
    return false;
}

// 1. Mark QR Code Attendance (Core Scanner API)
router.post('/mark', auth, async (req, res) => {
    try {
        const { qrData } = req.body;
        if (!qrData) {
            return res.status(400).json({ message: '✗ Invalid Registration' });
        }

        // Parse QR payload
        let parsed;
        try {
            parsed = JSON.parse(qrData);
        } catch (e) {
            return res.status(400).json({ message: '✗ Invalid Registration' });
        }

        const { registrationId, eventId } = parsed;
        if (!registrationId || !eventId) {
            return res.status(400).json({ message: '✗ Invalid Registration' });
        }

        // RBAC validation: Check if admin is assigned to this event
        const hasAccess = await checkEventAccess(req.user, eventId);
        if (!hasAccess) {
            return res.status(403).json({ message: 'Access denied. Unassigned event.' });
        }

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: '✗ Invalid Registration' });
        }

        const participant = await Participant.findOne({ event: eventId, registrationId, isVerified: true });
        if (!participant) {
            return res.status(404).json({ message: '✗ Invalid Registration' });
        }

        // If participant is already checked in (PRD Section 16)
        if (participant.attendanceStatus === 'Checked-In') {
            return res.status(400).json({
                message: '⚠ Already Checked In',
                participant: {
                    name: participant.name,
                    email: participant.email,
                    registrationId: participant.registrationId,
                    attendanceTimestamp: participant.attendanceTimestamp
                }
            });
        }

        // Mark attendance (PRD Section 18)
        participant.attendanceStatus = 'Checked-In';
        participant.attendanceTimestamp = new Date();
        await participant.save();

        // Save check-in log
        const log = new Attendance({
            event: eventId,
            participant: participant._id,
            admin: req.user._id,
            method: 'QR'
        });
        await log.save();

        // Send attendance confirmation email (PRD Section 10)
        const checkinText = `Hello ${participant.name},\n\nYour attendance at "${event.name}" has been recorded successfully at ${participant.attendanceTimestamp.toLocaleTimeString()}.\nThank you for attending!`;
        
        await sendMail({
            to: participant.email,
            subject: `Attendance Recorded: ${event.name}`,
            text: checkinText
        });

        // Save audit log
        const notification = new Notification({
            event: eventId,
            recipient: participant.email,
            type: 'Attendance Confirmation',
            content: checkinText,
            status: 'Sent'
        });
        await notification.save();

        res.json({
            message: '✓ Attendance Recorded',
            participant: {
                name: participant.name,
                email: participant.email,
                registrationId: participant.registrationId,
                attendanceTimestamp: participant.attendanceTimestamp
            }
        });
    } catch (error) {
        console.error('QR Check-in error:', error.message);
        res.status(500).json({ message: '✗ Invalid Registration' });
    }
});

// 2. Mark Manual Check-In (Admin desk fallback)
router.post('/mark-manual', auth, async (req, res) => {
    try {
        const { registrationId, eventId } = req.body;

        if (!registrationId || !eventId) {
            return res.status(400).json({ message: 'Missing parameters.' });
        }

        const hasAccess = await checkEventAccess(req.user, eventId);
        if (!hasAccess) {
            return res.status(403).json({ message: 'Access denied.' });
        }

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found.' });
        }

        const participant = await Participant.findOne({ event: eventId, registrationId, isVerified: true });
        if (!participant) {
            return res.status(404).json({ message: 'Participant not found.' });
        }

        if (participant.attendanceStatus === 'Checked-In') {
            return res.status(400).json({ message: '⚠ Already Checked In' });
        }

        participant.attendanceStatus = 'Checked-In';
        participant.attendanceTimestamp = new Date();
        await participant.save();

        // Save log
        const log = new Attendance({
            event: eventId,
            participant: participant._id,
            admin: req.user._id,
            method: 'Manual'
        });
        await log.save();

        // Send confirmation email
        const checkinText = `Hello ${participant.name},\n\nYour attendance at "${event.name}" was manually marked by an admin at ${participant.attendanceTimestamp.toLocaleTimeString()}.`;
        await sendMail({
            to: participant.email,
            subject: `Attendance Recorded: ${event.name}`,
            text: checkinText
        });

        res.json({
            message: '✓ Attendance Recorded',
            participant: {
                name: participant.name,
                email: participant.email,
                registrationId: participant.registrationId,
                attendanceTimestamp: participant.attendanceTimestamp
            }
        });
    } catch (error) {
        console.error('Manual check-in error:', error.message);
        res.status(500).json({ message: 'Server error marking attendance.' });
    }
});

// 3. Get Attendance Status (Public Check)
router.get('/status/:registrationId', async (req, res) => {
    try {
        const { registrationId } = req.params;
        const participant = await Participant.findOne({ registrationId, isVerified: true })
            .populate('event', 'name venue startDate startTime');

        if (!participant) {
            return res.status(404).json({ message: 'Participant registration not found.' });
        }

        res.json({
            participant: {
                name: participant.name,
                email: participant.email,
                registrationId: participant.registrationId,
                attendanceStatus: participant.attendanceStatus,
                attendanceTimestamp: participant.attendanceTimestamp,
                eventName: participant.event.name,
                venue: participant.event.venue,
                eventDate: new Date(participant.event.startDate).toLocaleDateString(),
                eventTime: participant.event.startTime
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error looking up status.' });
    }
});

module.exports = router;
