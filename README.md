# Event Attendance & Registration System

A smart, full-stack web solution to manage event registrations and attendance using QR codes — fast, simple, and efficient.

Whether you're hosting a tech fest, workshop, or any campus event — this system lets users register, scan their QR, and walk right in. Meanwhile, admins get full control and real-time stats.

## 🚀 Features

### Frontend (User Side)
- **Registration Form**: Register participants with name, email, and optional registration ID
- **QR Code Generation**: Automatic QR code generation for each registered participant
- **QR Code Scanner**: Mobile-friendly web-based QR code scanner for attendance marking
- **Real-time Feedback**: Instant success/error messages and participant information display

### Backend (Server Side)
- **RESTful API**: Node.js with Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT-based admin authentication
- **QR Code Processing**: Server-side QR code generation and validation
- **Duplicate Prevention**: Prevents duplicate registrations and attendance marking

### Admin Dashboard
- **Live Statistics**: Real-time attendance stats (Total Registered, Attended, Remaining, Attendance Rate)
- **Recent Attendees**: List of recently marked attendees with timestamps
- **Excel Export**: Download attendance data as Excel file (.xlsx)
- **Secure Access**: Admin login with JWT authentication

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla JS)
- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **QR Code**: qrcode package for generation, html5-qrcode for scanning
- **Excel Export**: exceljs package
- **Authentication**: JWT (jsonwebtoken)
- **Styling**: Custom CSS with modern design

## 📦 Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas)
- Git

### 1. Clone the Repository
```bash
git clone <repository-url>
cd event-attendance-system
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `config.env` file in the root directory:
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/event_attendance
JWT_SECRET=your_jwt_secret_key_here_change_in_production
ADMIN_EMAIL=admin@event.com
ADMIN_PASSWORD=admin123
```

### 4. Start MongoDB
Make sure MongoDB is running on your system:
```bash
# For local MongoDB
mongod

# Or use MongoDB Atlas connection string in config.env
```

### 5. Seed Sample Data (Optional)
```bash
node seed.js
```
This will create:
- Admin user: `admin@event.com` / `admin123`
- 10 sample participants with random attendance status

### 6. Start the Application
```bash
# Development mode with auto-restart
npm run dev

# Or production mode
npm start
```

The application will be available at `http://localhost:3000`

## 🎯 Usage Guide

### For Participants

#### 1. Registration
1. Navigate to the "Register" tab
2. Fill in your name and email
3. Optionally provide a registration ID (or leave blank for auto-generation)
4. Click "Register"
5. Your QR code will be displayed - save or print it for the event

#### 2. Attendance Check-in
1. Navigate to the "Scan QR" tab
2. Allow camera permissions when prompted
3. Point your camera at your QR code
4. Your attendance will be automatically marked
5. You'll see a confirmation with your details

### For Administrators

#### 1. Admin Login
1. Navigate to the "Admin" tab
2. Login with admin credentials:
   - Email: `admin@event.com`
   - Password: `admin123`

#### 2. Dashboard Overview
- View real-time attendance statistics
- See recent attendees with timestamps
- Monitor attendance rates

#### 3. Export Data
- Click "Export to Excel" to download attendance data
- Excel file includes: Name, Email, Registration ID, Status, Timestamps

## 📁 Project Structure

```
event-attendance-system/
├── public/                 # Frontend files
│   ├── index.html         # Main HTML file
│   ├── styles.css         # CSS styles
│   └── script.js          # Frontend JavaScript
├── models/                # Database models
│   ├── Participant.js     # Participant schema
│   └── Admin.js          # Admin schema
├── routes/                # API routes
│   ├── auth.js           # Authentication routes
│   ├── registration.js   # Registration routes
│   ├── attendance.js     # Attendance routes
│   └── admin.js          # Admin routes
├── middleware/            # Custom middleware
│   └── auth.js           # JWT authentication
├── server.js             # Main server file
├── seed.js               # Database seeder
├── package.json          # Dependencies
├── config.env            # Environment variables
└── README.md             # This file
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/login` - Admin login
- `POST /api/auth/setup` - Create admin (initial setup)

### Registration
- `POST /api/registration/register` - Register new participant
- `GET /api/registration/participant/:registrationId` - Get participant details

### Attendance
- `POST /api/attendance/mark` - Mark attendance via QR scan
- `GET /api/attendance/status/:registrationId` - Check attendance status

### Admin (Protected)
- `GET /api/admin/dashboard` - Get dashboard statistics
- `GET /api/admin/participants` - Get all participants (paginated)
- `GET /api/admin/export` - Export data to Excel
- `GET /api/admin/participant/:id` - Get specific participant

## 🔒 Security Features

- JWT-based authentication for admin routes
- Password hashing with bcrypt
- Input validation and sanitization
- CORS configuration
- Rate limiting (configurable)
- Duplicate prevention for registrations and attendance

## 📱 Mobile Responsiveness

The application is fully responsive and optimized for mobile devices:
- Touch-friendly interface
- Mobile camera access for QR scanning
- Responsive grid layouts
- Mobile-optimized navigation

## 🚀 Deployment

### Local Development
```bash
npm run dev
```

### Production Deployment
1. Set production environment variables
2. Use a process manager like PM2:
```bash
npm install -g pm2
pm2 start server.js --name "event-attendance"
```

### Docker Deployment (Optional)
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Ensure MongoDB is running
   - Check connection string in `config.env`
   - Verify network connectivity

2. **Camera Not Working**
   - Ensure HTTPS in production (required for camera access)
   - Check browser permissions
   - Try different browsers

3. **QR Code Not Scanning**
   - Ensure good lighting
   - Hold device steady
   - Check QR code quality

4. **Admin Login Issues**
   - Run `node seed.js` to create default admin
   - Check email/password in `config.env`

## 📊 Sample Data

The seeder creates 10 sample participants with:
- Realistic names and email addresses
- Random attendance status (60% attended)
- Random registration and attendance timestamps
- Unique registration IDs

## 🔄 Future Enhancements

- Email notifications for registration confirmation
- Bulk registration via CSV upload
- Advanced reporting and analytics
- Multi-event support
- Real-time notifications
- Mobile app development
- Integration with external calendar systems

## 📄 License

This project is licensed under the ISC License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For support or questions, please create an issue in the repository or contact the development team.

**Happy Event Management! 🎉**

### 💡 Final Thoughts

This project is designed to simplify the way events are managed — from registration to real-time attendance tracking. Easy for users, powerful for admins.

Feel free to fork it, extend it, and make it your own!

<img width="935" height="497" alt="Screenshot 2025-09-11 155055" src="https://github.com/user-attachments/assets/f2d1a942-3aeb-46d1-b91f-546a56b14252" />
<img width="953" height="323" alt="Screenshot 2025-09-11 155319" src="https://github.com/user-attachments/assets/e77c5d13-1833-417b-a1f0-1d312370d7fd" />
<img width="945" height="503" alt="Screenshot 2025-09-11 155417" src="https://github.com/user-attachments/assets/d77ccf27-e59b-4ec6-b6a6-7f96d29ccc7c" />


