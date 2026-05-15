const db = require('./config/db');

// Test DB Connection
async function checkConnection() {
    try {
        await db.query('SELECT 1');
        console.log('✅ MySQL Database Connected Successfully!');
    } catch (err) {
        console.error('❌ Database Connection Failed:', err.message);
    }
}

checkConnection();
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors()); // Allows your frontend to talk to your backend
app.use(express.json()); // Allows the server to read JSON data sent from forms

// A simple test route
app.get('/', (req, res) => {
    res.send('Educational Portal Backend is running!');
});

// Port configuration
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is live on http://localhost:${PORT}`);
});
const authRoutes = require('./routes/auth');

// Routes
app.use('/api/auth', authRoutes);