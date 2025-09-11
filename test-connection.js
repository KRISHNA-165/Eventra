const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

console.log('🔍 Testing MongoDB Atlas Connection...\n');
console.log('Connection String:', process.env.MONGODB_URI.replace(/\/\/.*@/, '//***:***@')); // Hide credentials

mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => {
    console.log('✅ MongoDB Atlas connection successful!');
    console.log('🎉 Your IP is whitelisted and credentials are correct.');
    process.exit(0);
})
.catch((error) => {
    console.error('❌ MongoDB Atlas connection failed:');
    console.error('Error:', error.message);
    
    if (error.message.includes('IP')) {
        console.log('\n🔧 Solution: Add your IP to MongoDB Atlas Network Access');
        console.log('1. Go to MongoDB Atlas Dashboard');
        console.log('2. Click "Network Access"');
        console.log('3. Click "Add IP Address"');
        console.log('4. Click "Add Current IP Address"');
        console.log('5. Wait 2-3 minutes for changes to propagate');
    } else if (error.message.includes('authentication')) {
        console.log('\n🔧 Solution: Check your database credentials');
        console.log('1. Verify username and password in config.env');
        console.log('2. Make sure the database user exists in Atlas');
    }
    
    process.exit(1);
});
