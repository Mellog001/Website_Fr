import mysql from 'mysql2/promise';
import { env } from './env';
import { logger } from './logger';

export const pool = mysql.createPool({
  uri: env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: 'Z',
});

// Ensure every new connection in the pool treats its session clock as UTC,
// regardless of what timezone the MySQL server itself is configured with.
pool.on('connection', function (connection) {
  connection.query("SET time_zone='+00:00';");
});

// Verify connection on startup
pool.getConnection()
  .then((conn) => {
    logger.info('🗄️  MySQL database connection pool established successfully');
    conn.release();
  })
  .catch((err) => {
    logger.error('❌ MySQL database connection failed:', err.message);
  });

export default pool;