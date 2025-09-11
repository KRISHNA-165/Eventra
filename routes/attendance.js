const express = require('express');
const Participant = require('../models/Participant');
const router = express.Router();

// Mark attendance
router.post('/mark', async (req, res) => {
    try {
        const { qrData } = req.body;

        if (!qrData) {
            return res.status(400).json({ message: 'QR code data is required' });
        }

        // Parse QR code data
        let parsedData;
        try {
            parsedData = JSON.parse(qrData);
        } catch (error) {
            return res.status(400).json({ message: 'Invalid QR code data format' });
        }

        const { registrationId, email } = parsedData;

        // Find participant
        const participant = await Participant.findOne({ 
            registrationId: registrationId,
            email: email 
        });

        if (!participant) {
            return res.status(404).json({ message: 'Participant not found' });
        }

        // Check if already attended
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

        // Mark attendance
        participant.attendanceStatus = 'Attended';
        participant.attendanceTimestamp = new Date();
        await participant.save();

        res.json({
            message: 'Attendance marked successfully',
            participant: {
                name: participant.name,
                email: participant.email,
                registrationId: participant.registrationId,
                attendanceTimestamp: participant.attendanceTimestamp
            }
        });
    } catch (error) {
        console.error('Mark attendance error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get attendance status
router.get('/status/:registrationId', async (req, res) => {
    try {
        const { registrationId } = req.params;
        const participant = await Participant.findOne({ registrationId });
        
        if (!participant) {
            return res.status(404).json({ message: 'Participant not found' });
        }

        res.json({
            participant: {
                name: participant.name,
                email: participant.email,
                registrationId: participant.registrationId,
                attendanceStatus: participant.attendanceStatus,
                attendanceTimestamp: participant.attendanceTimestamp
            }
        });
    } catch (error) {
        console.error('Get attendance status error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
