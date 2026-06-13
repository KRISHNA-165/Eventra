const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

// Register Organizer
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists with this email' });
        }

        const user = new User({
            name,
            email,
            password,
            role: 'organizer'
        });

        await user.save();

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Organizer registration error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Login for both Organizer and Admin
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Populate assigned events details for admin users
        let assignedEvents = [];
        if (user.role === 'admin') {
            await user.populate('assignedEvents');
            assignedEvents = user.assignedEvents.map(event => ({
                _id: event._id,
                name: event.name,
                hasPassword: !!event.eventAccessPassword
            }));
        }

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                assignedEvents
            }
        });
    } catch (error) {
        console.error('User login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create default organizer (fallback for setup scripts)
router.post('/setup', async (req, res) => {
    try {
        const { email, password } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const user = new User({
            name: 'Default Organizer',
            email,
            password,
            role: 'organizer'
        });
        await user.save();

        res.json({ message: 'Organizer created successfully' });
    } catch (error) {
        console.error('Setup error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
