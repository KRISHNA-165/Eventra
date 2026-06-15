const express = require('express');
const QRCode = require('qrcode');
const dns = require('dns').promises;
const net = require('net');
const Participant = require('../models/Participant');
const Event = require('../models/Event');
const Notification = require('../models/Notification');
const { sendMail } = require('../utils/mailer');
const router = express.Router();

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// SMTP mailbox verification helper
async function checkMailboxExists(email) {
    const domain = email.split('@')[1];
    if (!domain) return false;

    // Quick pass for local/test emails
    if (domain.toLowerCase() === 'event.com') return true;

    try {
        const mxRecords = await dns.resolveMx(domain);
        if (!mxRecords || mxRecords.length === 0) return false;

        // Sort by priority (lowest value has highest priority)
        mxRecords.sort((a, b) => a.priority - b.priority);
        const exchange = mxRecords[0].exchange;

        return new Promise((resolve) => {
            const socket = net.createConnection(25, exchange);
            let responseReceived = '';
            let step = 0;
            let result = true; // Default to true if SMTP dialog fails

            socket.setTimeout(4000); // 4 seconds timeout

            const write = (cmd) => {
                if (!socket.destroyed) socket.write(cmd);
            };

            socket.on('data', (chunk) => {
                responseReceived += chunk.toString();
                if (responseReceived.endsWith('\n')) {
                    const lines = responseReceived.trim().split('\r\n');
                    const lastLine = lines[lines.length - 1];
                    responseReceived = ''; // reset buffer

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
                        // SMTP 550, 551, 553 indicate non-existent mailbox
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
                // Fallback to true if connection is blocked (common on Port 25 for residential ISPs)
                console.log(`SMTP check connection error: ${err.message}. Falling back to domain check.`);
                resolve(true);
            });

            socket.on('timeout', () => {
                console.log('SMTP check connection timeout. Falling back.');
                socket.destroy();
                resolve(true);
            });

            socket.on('close', () => {
                resolve(result);
            });
        });
    } catch (error) {
        console.error('Mailbox verification failure:', error.message);
        return true; // Fallback to true
    }
}

// 1. Request OTP (Initiate Registration Flow)
router.post('/request-otp', async (req, res) => {
    try {
        const { eventId, name, email, phone, college, department, yearOfStudy, customFields } = req.body;

        if (!eventId || !name || !email || !phone || !college) {
            return res.status(400).json({ message: 'Missing required registration parameters.' });
        }

        // Validate email format (Step 1)
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Invalid email address format.' });
        }

        // Validate if mailbox exists (SMTP verification check)
        const mailboxExists = await checkMailboxExists(email);
        if (!mailboxExists) {
            return res.status(400).json({ message: 'The entered email address does not exist.' });
        }

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Target event not found.' });
        }

        // Check if registration dates are active
        const now = new Date();
        if (now < event.registrationOpenDate || now > event.registrationCloseDate) {
            return res.status(400).json({ message: 'Event registration is currently closed.' });
        }

        // Capacity check
        const registeredCount = await Participant.countDocuments({ event: eventId, isVerified: true });
        if (registeredCount >= event.maximumCapacity) {
            return res.status(400).json({ message: 'Event is fully booked.' });
        }

        // Check duplicate registrations
        const existing = await Participant.findOne({ event: eventId, email, isVerified: true });
        if (existing) {
            return res.status(400).json({ message: 'This email has already registered for the event.' });
        }

        // Generate 6-digit OTP code (Step 2)
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes OTP lifespan (PRD Section 9)

        // Store or update unverified participant details
        let participant = await Participant.findOne({ event: eventId, email, isVerified: false });
        if (participant) {
            participant.name = name;
            participant.phone = phone;
            participant.college = college;
            participant.department = department || '';
            participant.yearOfStudy = yearOfStudy || '';
            participant.customFields = customFields || {};
            participant.otp = { code: otpCode, expiresAt };
        } else {
            participant = new Participant({
                event: eventId,
                name,
                email,
                phone,
                college,
                department: department || '',
                yearOfStudy: yearOfStudy || '',
                customFields: customFields || {},
                otp: { code: otpCode, expiresAt }
            });
        }
        await participant.save();

        // Send OTP via email using Nodemailer / Gmail SMTP (Step 3)
        const otpText = `Hello ${name},\n\nYour verification code is: ${otpCode}.\nIt will expire in 10 minutes.`;
        await sendMail({
            to: email,
            subject: 'Email Verification OTP - Eventra',
            text: otpText
        });

        // Audit log in notifications
        // Mask the OTP in the logs when real SMTP credentials exist to enforce verification check
        const hasRealSMTP = !!(process.env.SMTP_USER && process.env.SMTP_PASS);
        const loggedText = hasRealSMTP 
            ? `Hello ${name},\n\nYour verification code is: ******.\nIt will expire in 10 minutes.`
            : otpText;

        const notification = new Notification({
            event: eventId,
            recipient: email,
            type: 'OTP',
            content: loggedText,
            status: 'Sent'
        });
        await notification.save();

        res.json({ message: 'Verification OTP sent successfully.' });
    } catch (error) {
        console.error('Request OTP error:', error.message);
        res.status(500).json({ message: 'Server error sending verification email.' });
    }
});

// 2. Verify OTP (Verify & Issue Ticket)
router.post('/verify-otp', async (req, res) => {
    try {
        const { eventId, email, otp } = req.body;

        const participant = await Participant.findOne({ event: eventId, email, isVerified: false });
        if (!participant) {
            return res.status(404).json({ message: 'No pending registration record found.' });
        }

        // Verify OTP code & expiration (Step 4 & 5)
        if (!participant.otp || participant.otp.code !== otp) {
            return res.status(400).json({ message: 'Invalid verification code.' });
        }

        if (new Date() > participant.otp.expiresAt) {
            return res.status(400).json({ message: 'Verification code has expired. Request a new one.' });
        }

        // Atomically increment Event counter to generate sequential ID
        const event = await Event.findByIdAndUpdate(
            eventId,
            { $inc: { participantCounter: 1 } },
            { new: true }
        );

        // Format: HACK2026-0001 (PRD Section 10)
        const year = event.startDate ? new Date(event.startDate).getFullYear() : 2026;
        const prefix = event.category ? event.category.substring(0, 4).toUpperCase() : 'EVT';
        const formattedRegId = `${prefix}${year}-${String(event.participantCounter).padStart(4, '0')}`;

        // QR Code Payload structure: { registrationId, eventId } (PRD Section 11)
        const qrPayload = JSON.stringify({
            registrationId: formattedRegId,
            eventId: eventId
        });

        // Generate QR code base64
        const qrCodeBase64 = await QRCode.toDataURL(qrPayload, {
            width: 300,
            margin: 2
        });

        // Save verification parameters
        participant.isVerified = true;
        participant.registrationId = formattedRegId;
        participant.qrCodeData = qrPayload;
        participant.otp = undefined; // clear temp OTP
        await participant.save();

        // Send Confirmation Email containing ticket & QR details
        const confirmText = `Hi ${participant.name},\n\nYour registration is confirmed!\nEvent: ${event.name}\nVenue: ${event.venue}\nRegistration ID: ${formattedRegId}\n\nPlease bring your QR code ticket for scanning.`;
        
        await sendMail({
            to: email,
            subject: `Registration Confirmed: ${event.name}`,
            text: confirmText
        });

        const notification = new Notification({
            event: eventId,
            recipient: email,
            type: 'Registration Success',
            content: confirmText,
            status: 'Sent'
        });
        await notification.save();

        res.json({
            message: 'Registration verified and ticket issued.',
            participant: {
                name: participant.name,
                email: participant.email,
                registrationId: formattedRegId,
                qrCode: qrCodeBase64,
                event: event.name,
                venue: event.venue,
                dateTime: `${new Date(event.startDate).toLocaleDateString()} at ${event.startTime}`
            }
        });
    } catch (error) {
        console.error('Verify OTP error:', error.message);
        res.status(500).json({ message: 'Server error during registration verification.' });
    }
});

module.exports = router;
