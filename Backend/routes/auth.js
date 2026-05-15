const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Registration Route
router.post('/signup', async (req, res) => {
    const { full_name, email, password } = req.body;

    try {
        // Check if user already exists
        const [existingUser] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existingUser.length > 0) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Insert new user (Note: In a real app, we would hash the password here!)
        const [result] = await db.query(
            'INSERT INTO users (full_name, email, password) VALUES (?, ?, ?)',
            [full_name, email, password]
        );

        res.status(201).json({ message: 'User registered successfully!', userId: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;