const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    banner: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    venue: {
        type: String,
        required: true,
        trim: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    startTime: {
        type: String,
        required: true
    },
    endTime: {
        type: String,
        required: true
    },
    registrationOpenDate: {
        type: Date,
        required: true
    },
    registrationCloseDate: {
        type: Date,
        required: true
    },
    maximumCapacity: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['draft', 'registration_open', 'registration_closed', 'live', 'completed', 'cancelled'],
        default: 'registration_open'
    },
    participantCounter: {
        type: Number,
        default: 0
    },
    organizer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    customFields: [{
        name: String,
        fieldType: String,
        required: {
            type: Boolean,
            default: false
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Event', eventSchema);
