import mysql from 'mysql2/promise';
import { env } from './env';
import { logger } from './logger';

export const pool = mysql.createPool({
  uri: env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+00:00',
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
