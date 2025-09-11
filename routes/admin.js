const express = require('express');
const ExcelJS = require('exceljs');
const Participant = require('../models/Participant');
const auth = require('../middleware/auth');
const router = express.Router();

// Get dashboard statistics
router.get('/dashboard', auth, async (req, res) => {
    try {
        const totalRegistered = await Participant.countDocuments();
        const totalAttended = await Participant.countDocuments({ attendanceStatus: 'Attended' });
        const totalNotAttended = totalRegistered - totalAttended;

        // Get recent attendees (last 10)
        const recentAttendees = await Participant.find({ attendanceStatus: 'Attended' })
            .sort({ attendanceTimestamp: -1 })
            .limit(10)
            .select('name email registrationId attendanceTimestamp');

        res.json({
            stats: {
                totalRegistered,
                totalAttended,
                totalNotAttended,
                attendanceRate: totalRegistered > 0 ? ((totalAttended / totalRegistered) * 100).toFixed(2) : 0
            },
            recentAttendees
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all participants
router.get('/participants', auth, async (req, res) => {
    try {
        const { page = 1, limit = 50, status } = req.query;
        const skip = (page - 1) * limit;

        let query = {};
        if (status && status !== 'all') {
            query.attendanceStatus = status;
        }

        const participants = await Participant.find(query)
            .sort({ registrationTimestamp: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .select('-qrCodeData');

        const total = await Participant.countDocuments(query);

        res.json({
            participants,
            pagination: {
                current: parseInt(page),
                pages: Math.ceil(total / limit),
                total
            }
        });
    } catch (error) {
        console.error('Get participants error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Export to Excel
router.get('/export', auth, async (req, res) => {
    try {
        const participants = await Participant.find()
            .sort({ registrationTimestamp: -1 })
            .select('-qrCodeData');

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Event Attendance');

        // Define columns
        worksheet.columns = [
            { header: 'Name', key: 'name', width: 25 },
            { header: 'Email', key: 'email', width: 35 },
            { header: 'Registration ID', key: 'registrationId', width: 20 },
            { header: 'Attendance Status', key: 'attendanceStatus', width: 18 },
            { header: 'Registration Date', key: 'registrationTimestamp', width: 20 },
            { header: 'Attendance Date', key: 'attendanceTimestamp', width: 20 }
        ];

        // Style header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };

        // Add data
        participants.forEach(participant => {
            worksheet.addRow({
                name: participant.name,
                email: participant.email,
                registrationId: participant.registrationId,
                attendanceStatus: participant.attendanceStatus,
                registrationTimestamp: participant.registrationTimestamp.toLocaleString(),
                attendanceTimestamp: participant.attendanceTimestamp ? participant.attendanceTimestamp.toLocaleString() : 'Not Attended'
            });
        });

        // Auto-fit columns
        worksheet.columns.forEach(column => {
            column.width = Math.max(column.width, 15);
        });

        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=event_attendance.xlsx');

        // Write to response
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get participant details
router.get('/participant/:id', auth, async (req, res) => {
    try {
        const participant = await Participant.findById(req.params.id);
        
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
