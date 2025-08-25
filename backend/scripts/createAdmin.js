const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Admin = require('../models/Admin'); 

// Replace with your actual MongoDB URI
const MONGO_URI = 'mongodb+srv://himath:ranhinda123@cluster0.tjl808a.mongodb.net/';

mongoose.connect(MONGO_URI)
  .then(async () => {
    const hashedPassword = await bcrypt.hash('admin12345', 10); 
    const admin = new Admin({
      username: 'admin',
      password: hashedPassword
    });

    await admin.save();
    console.log('✅ Admin user created successfully!');
    mongoose.disconnect();
  })
  .catch(err => {
    console.error('❌ Error connecting or creating admin:', err);
  });