const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
    event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    phone: {
        type: String,
        required: true,
        trim: true
    },
    college: {
        type: String,
        required: true,
        trim: true
    },
    department: {
        type: String,
        default: ''
    },
    yearOfStudy: {
        type: String,
        default: ''
    },
    customFields: {
        type: Map,
        of: String,
        default: {}
    },
    registrationId: {
        type: String,
        default: '' // Generated after email verification
    },
    qrCodeData: {
        type: String,
        default: '' // Generated after email verification
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    otp: {
        code: String,
        expiresAt: Date
    },
    attendanceStatus: {
        type: String,
        enum: ['Pending', 'Checked-In'],
        default: 'Pending'
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

// Compound index to ensure email is unique per event
participantSchema.index({ event: 1, email: 1 }, { unique: true });

module.exports = mongoose.model('Participant', participantSchema);
