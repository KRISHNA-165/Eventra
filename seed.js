const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

const User = require('./models/User');
const Event = require('./models/Event');
const Participant = require('./models/Participant');
const Attendance = require('./models/Attendance');
const Notification = require('./models/Notification');

async function seedDatabase() {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/event_attendance';
        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('Connected to MongoDB');

        // Clear existing tables
        await Participant.deleteMany({});
        await Event.deleteMany({});
        await User.deleteMany({});
        await Attendance.deleteMany({});
        await Notification.deleteMany({});
        console.log('Cleared database collections');

        // 1. Create Organizer
        const organizer = new User({
            name: 'ACM Chapter',
            email: 'organizer@event.com',
            password: 'organizer123',
            role: 'organizer'
        });
        await organizer.save();
        console.log('Created Organizer: organizer@event.com / organizer123');

        // 2. Create Events
        const now = new Date();
        const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
        const dayAfter = new Date(now); dayAfter.setDate(now.getDate() + 2);
        const nextWeek = new Date(now); nextWeek.setDate(now.getDate() + 7);

        // Event A: Hackathon
        const eventA = new Event({
            name: 'Hackathon 2026',
            description: 'A coding sprint event where programmers collaborate and build software.',
            banner: 'theme-purple',
            category: 'HACK',
            venue: 'Main Science Annex',
            startDate: tomorrow,
            endDate: dayAfter,
            startTime: '09:00 AM',
            endTime: '05:00 PM',
            registrationOpenDate: new Date(now.getTime() - 24 * 60 * 60 * 1000),
            registrationCloseDate: nextWeek,
            maximumCapacity: 80,
            status: 'registration_open',
            participantCounter: 3,
            organizer: organizer._id
        });
        await eventA.save();

        // Event B: React Workshop
        const eventB = new Event({
            name: 'React JS Workshop',
            description: 'Hands-on training session on building user interfaces using React.',
            banner: 'theme-indigo',
            category: 'WORK',
            venue: 'Programming Lab 3',
            startDate: dayAfter,
            endDate: dayAfter,
            startTime: '02:00 PM',
            endTime: '05:00 PM',
            registrationOpenDate: new Date(now.getTime() - 24 * 60 * 60 * 1000),
            registrationCloseDate: nextWeek,
            maximumCapacity: 40,
            status: 'registration_open',
            participantCounter: 2,
            organizer: organizer._id
        });
        await eventB.save();

        console.log('Created Events: Hackathon 2026 & React JS Workshop');

        // 3. Create Admins
        const admin1 = new User({
            name: 'Admin Joe',
            email: 'admin1@event.com',
            password: 'admin123',
            role: 'admin',
            assignedEvents: [eventA._id, eventB._id]
        });
        await admin1.save();

        const admin2 = new User({
            name: 'Admin Sam',
            email: 'admin2@event.com',
            password: 'admin123',
            role: 'admin',
            assignedEvents: [eventB._id]
        });
        await admin2.save();

        console.log('Created Admins: admin1@event.com / admin123 & admin2@event.com / admin123');

        // 4. Seed Participants for Event A (Hackathon)
        const participantsA = [
            { name: 'Alice Smith', email: 'alice@gmail.com', phone: '9876543201', college: 'Stanford', regId: 'HACK2026-0001', checkedIn: true },
            { name: 'Bob Jones', email: 'bob@yahoo.com', phone: '9876543202', college: 'MIT', regId: 'HACK2026-0002', checkedIn: true },
            { name: 'Charlie Brown', email: 'charlie@gmail.com', phone: '9876543203', college: 'Harvard', regId: 'HACK2026-0003', checkedIn: false }
        ];

        for (const pData of participantsA) {
            const qrPayload = JSON.stringify({ registrationId: pData.regId, eventId: eventA._id.toString() });
            
            const p = new Participant({
                event: eventA._id,
                name: pData.name,
                email: pData.email,
                phone: pData.phone,
                college: pData.college,
                registrationId: pData.regId,
                qrCodeData: qrPayload,
                isVerified: true,
                attendanceStatus: pData.checkedIn ? 'Checked-In' : 'Pending',
                attendanceTimestamp: pData.checkedIn ? new Date(Date.now() - 30 * 60 * 1000) : null
            });
            await p.save();

            if (pData.checkedIn) {
                const log = new Attendance({
                    event: eventA._id,
                    participant: p._id,
                    admin: admin1._id,
                    method: 'QR'
                });
                await log.save();
            }
        }

        // 5. Seed Participants for Event B (React Workshop)
        const participantsB = [
            { name: 'David Lee', email: 'david@gmail.com', phone: '9876543204', college: 'Stanford', regId: 'WORK2026-0001', checkedIn: true },
            { name: 'Emily Rose', email: 'emily@gmail.com', phone: '9876543205', college: 'UC Berkeley', regId: 'WORK2026-0002', checkedIn: false }
        ];

        for (const pData of participantsB) {
            const qrPayload = JSON.stringify({ registrationId: pData.regId, eventId: eventB._id.toString() });
            
            const p = new Participant({
                event: eventB._id,
                name: pData.name,
                email: pData.email,
                phone: pData.phone,
                college: pData.college,
                registrationId: pData.regId,
                qrCodeData: qrPayload,
                isVerified: true,
                attendanceStatus: pData.checkedIn ? 'Checked-In' : 'Pending',
                attendanceTimestamp: pData.checkedIn ? new Date(Date.now() - 15 * 60 * 1000) : null
            });
            await p.save();

            if (pData.checkedIn) {
                const log = new Attendance({
                    event: eventB._id,
                    participant: p._id,
                    admin: admin2._id,
                    method: 'Manual'
                });
                await log.save();
            }
        }

        console.log('Seeded participants and entry desk attendance logs');
        console.log('\n✅ Database seeded successfully!');
    } catch (error) {
        console.error('Seeding failed:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('Database connection closed');
    }
}

seedDatabase();
