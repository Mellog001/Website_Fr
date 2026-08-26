import pool from '../config/database';
import { hashPassword } from '../common/utils/hash';
import { v4 as uuidv4 } from 'uuid';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function createAdmin() {
  try {
    const [rows]: any = await pool.execute(
      "SELECT id, email FROM users WHERE role = 'ADMIN' LIMIT 1"
    );

    if (rows.length > 0) {
      console.error(
        `An administrator already exists: ${rows[0].email}`
      );
      process.exit(1);
    }

    const email = (await question('Admin email: ')).trim();
    const password = await question('Admin password: ');

    if (!email || !password) {
      throw new Error('Email and password are required.');
    }

    if (password.length < 8) {
      throw new Error('Admin password must be at least 8 characters.');
    }

    const [existing]: any = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      throw new Error('A user with this email already exists.');
    }

    const passwordHash = await hashPassword(password);
    const id = uuidv4();

    await pool.execute(
      `INSERT INTO users
        (id, email, password_hash, role, is_email_verified)
       VALUES (?, ?, ?, 'ADMIN', TRUE)`,
      [id, email, passwordHash]
    );

    console.log('');
    console.log('=================================');
    console.log('Admin account created successfully');
    console.log('=================================');
    console.log(`Email: ${email}`);
    console.log('Role: ADMIN');
    console.log('Email verification: automatic');
    console.log('');

    process.exit(0);
  } catch (error: any) {
    console.error('');
    console.error('Failed to create admin:');
    console.error(error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

createAdmin();