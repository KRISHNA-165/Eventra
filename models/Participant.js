const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
    name: String,
    email: String,
    registrationId: String,
    qrCodeData: String, // ✅ Add this field
    attended: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Participant', participantSchema);
