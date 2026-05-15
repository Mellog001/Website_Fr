const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Grace20?.', // Enter your MySQL password here
    database: process.env.DB_NAME || 'website_fr_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Convert pool to use promises (allows us to use async/await)
const promisePool = pool.promise();

module.exports = promisePool;