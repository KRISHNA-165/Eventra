const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    registrationId: {
        type: String,
        required: true,
        unique: true
    },
    qrCodeData: {
        type: String,
        required: true
    },
    attendanceStatus: {
        type: String,
        enum: ['Not Attended', 'Attended'],
        default: 'Not Attended'
    },
    attendanceTimestamp: {
        type: Date,
        default: null
    },
    registrationTimestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Participant', participantSchema);
