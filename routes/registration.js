const express = require('express');
const QRCode = require('qrcode');
const Participant = require('../models/Participant');
const router = express.Router();

// Generate unique registration ID
const generateRegistrationId = () => {
    return 'REG-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5).toUpperCase();
};

// Register participant
router.post('/register', async (req, res) => {
    try {
        const { name, email, registrationId } = req.body;

        // Validate input
        if (!name || !email) {
            return res.status(400).json({ message: 'Name and email are required' });
        }

        // Check if email already exists
        const existingParticipant = await Participant.findOne({ email });
        if (existingParticipant) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        // Generate registration ID if not provided
        const finalRegistrationId = registrationId || generateRegistrationId();

        // Check if registration ID already exists
        const existingId = await Participant.findOne({ registrationId: finalRegistrationId });
        if (existingId) {
            return res.status(400).json({ message: 'Registration ID already exists' });
        }

        // Create QR code data
        const qrData = JSON.stringify({
            registrationId: finalRegistrationId,
            email: email,
            name: name
        });

        // Generate QR code as base64
        const qrCodeBase64 = await QRCode.toDataURL(qrData, {
            width: 300,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });

        // Create participant
        const participant = new Participant({
            name,
            email,
            registrationId: finalRegistrationId,
            qrCodeData: qrData
        });


        await participant.save();

        res.json({
            message: 'Registration successful',
            participant: {
                name: participant.name,
                email: participant.email,
                registrationId: participant.registrationId,
                qrCode: qrCodeBase64
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get participant by registration ID
router.get('/participant/:registrationId', async (req, res) => {
    try {
        const { registrationId } = req.params;
        const participant = await Participant.findOne({ registrationId });
        
        if (!participant) {
            return res.status(404).json({ message: 'Participant not found' });
        }

        res.json({ participant });
    } catch (error) {
        console.error('Get participant error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
