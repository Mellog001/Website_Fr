import pool from './src/config/database';

async function migrate() {
  try {
    // 1. Add is_email_verified to users
    console.log('Adding is_email_verified to users...');
    try {
      await pool.execute('ALTER TABLE users ADD COLUMN is_email_verified BOOLEAN NOT NULL DEFAULT FALSE AFTER role');
    } catch (err: any) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('Column is_email_verified already exists.');
      } else {
        throw err;
      }
    }

    // 2. Create verification_tokens
    console.log('Creating verification_tokens table...');
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS verification_tokens (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        token VARCHAR(255) NOT NULL,
        type ENUM('EMAIL_VERIFICATION', 'PASSWORD_RESET') NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_verification_tokens_user_id (user_id),
        INDEX idx_verification_tokens_token (token),
        INDEX idx_verification_tokens_expires_at (expires_at),
        CONSTRAINT fk_verification_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. Create refresh_tokens
    console.log('Creating refresh_tokens table...');
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        token_id VARCHAR(36) NOT NULL UNIQUE,
        expires_at DATETIME NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_refresh_tokens_user_id (user_id),
        INDEX idx_refresh_tokens_token_id (token_id),
        INDEX idx_refresh_tokens_expires_at (expires_at),
        CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. Create scheduled_jobs
    console.log('Creating scheduled_jobs table...');
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS scheduled_jobs (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        queue_name VARCHAR(100) NOT NULL,
        job_name VARCHAR(100) NOT NULL,
        payload JSON NOT NULL,
        status ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
        attempts INT NOT NULL DEFAULT 0,
        max_attempts INT NOT NULL DEFAULT 3,
        run_at DATETIME NOT NULL,
        error_message TEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_scheduled_jobs_poll (queue_name, status, run_at),
        INDEX idx_scheduled_jobs_run_at (run_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('Migration successful.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await pool.end();
  }
}

migrate();
