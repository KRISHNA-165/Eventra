const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },
    participant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Participant',
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    admin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    method: {
        type: String,
        enum: ['QR', 'Manual'],
        required: true
    },
    notes: {
        type: String,
        default: ''
    }
});

module.exports = mongoose.model('Attendance', attendanceSchema);
