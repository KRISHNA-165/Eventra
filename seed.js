const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const QRCode = require('qrcode');
require('dotenv').config({ path: './config.env' });

// Import models
const Participant = require('./models/Participant');
const Admin = require('./models/Admin');

// Sample data
const sampleParticipants = [
    {
        name: 'John Smith',
        email: 'john.smith@email.com',
        registrationId: 'REG-001'
    },
    {
        name: 'Sarah Johnson',
        email: 'sarah.johnson@email.com',
        registrationId: 'REG-002'
    },
    {
        name: 'Michael Brown',
        email: 'michael.brown@email.com',
        registrationId: 'REG-003'
    },
    {
        name: 'Emily Davis',
        email: 'emily.davis@email.com',
        registrationId: 'REG-004'
    },
    {
        name: 'David Wilson',
        email: 'david.wilson@email.com',
        registrationId: 'REG-005'
    },
    {
        name: 'Lisa Anderson',
        email: 'lisa.anderson@email.com',
        registrationId: 'REG-006'
    },
    {
        name: 'Robert Taylor',
        email: 'robert.taylor@email.com',
        registrationId: 'REG-007'
    },
    {
        name: 'Jennifer Martinez',
        email: 'jennifer.martinez@email.com',
        registrationId: 'REG-008'
    },
    {
        name: 'William Garcia',
        email: 'william.garcia@email.com',
        registrationId: 'REG-009'
    },
    {
        name: 'Amanda Rodriguez',
        email: 'amanda.rodriguez@email.com',
        registrationId: 'REG-010'
    }
];

async function seedDatabase() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/event_attendance', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('Connected to MongoDB');

        // Clear existing data
        await Participant.deleteMany({});
        await Admin.deleteMany({});
        console.log('Cleared existing data');

        // Create admin user
        const admin = new Admin({
            email: 'admin@event.com',
            password: 'admin123'
        });
        await admin.save();
        console.log('Created admin user');

        // Create sample participants
        for (let i = 0; i < sampleParticipants.length; i++) {
            const participantData = sampleParticipants[i];
            
            // Create QR code data
            const qrData = JSON.stringify({
                registrationId: participantData.registrationId,
                email: participantData.email,
                name: participantData.name
            });

            // Randomly mark some participants as attended
            const isAttended = Math.random() > 0.4; // 60% chance of being attended
            const attendanceTimestamp = isAttended ? 
                new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) : // Random time within last 7 days
                null;

            const participant = new Participant({
                name: participantData.name,
                email: participantData.email,
                registrationId: participantData.registrationId,
                qrCodeData: qrData,
                attendanceStatus: isAttended ? 'Attended' : 'Not Attended',
                attendanceTimestamp: attendanceTimestamp,
                registrationTimestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Random time within last 30 days
            });

            await participant.save();
            console.log(`Created participant: ${participantData.name}`);
        }

        console.log('\n✅ Database seeded successfully!');
        console.log('\n📊 Summary:');
        console.log(`- Admin created: admin@event.com / admin123`);
        console.log(`- Participants created: ${sampleParticipants.length}`);
        
        const attendedCount = await Participant.countDocuments({ attendanceStatus: 'Attended' });
        const notAttendedCount = await Participant.countDocuments({ attendanceStatus: 'Not Attended' });
        
        console.log(`- Attended: ${attendedCount}`);
        console.log(`- Not Attended: ${notAttendedCount}`);
        console.log(`- Attendance Rate: ${((attendedCount / sampleParticipants.length) * 100).toFixed(1)}%`);

    } catch (error) {
        console.error('Seeding error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\nDatabase connection closed');
    }
}

// Run the seeder
seedDatabase();
