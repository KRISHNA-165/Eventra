const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Event Attendance System - Startup Script\n');

// Check if config.env exists
const configPath = path.join(__dirname, 'config.env');
if (!fs.existsSync(configPath)) {
    console.log('❌ config.env file not found!');
    console.log('📝 Creating config.env with default values...\n');
    
    const defaultConfig = `PORT=3000
MONGODB_URI=mongodb://localhost:27017/event_attendance
JWT_SECRET=your_jwt_secret_key_here_change_in_production_${Date.now()}
ADMIN_EMAIL=admin@event.com
ADMIN_PASSWORD=admin123`;
    
    fs.writeFileSync(configPath, defaultConfig);
    console.log('✅ config.env created successfully!\n');
}

// Check if node_modules exists
const nodeModulesPath = path.join(__dirname, 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
    console.log('📦 Installing dependencies...\n');
    exec('npm install', (error, stdout, stderr) => {
        if (error) {
            console.error('❌ Error installing dependencies:', error);
            return;
        }
        console.log('✅ Dependencies installed successfully!\n');
        startServer();
    });
} else {
    startServer();
}

function startServer() {
    console.log('🎯 Starting Event Attendance System...\n');
    console.log('📋 Quick Setup Guide:');
    console.log('1. Make sure MongoDB is running');
    console.log('2. Run "node seed.js" to create sample data (optional)');
    console.log('3. Access the application at http://localhost:3000');
    console.log('4. Admin login: admin@event.com / admin123\n');
    
    console.log('🌐 Server starting...\n');
    
    exec('npm start', (error, stdout, stderr) => {
        if (error) {
            console.error('❌ Error starting server:', error);
            return;
        }
        console.log(stdout);
    });
}
