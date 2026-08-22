import request from 'supertest';
import app from '../src/app';
import { cleanDatabase } from './helpers/db-helper';
import pool from '../src/config/database';
import { redisConnection } from '../src/config/redis';
import { RowDataPacket } from 'mysql2';

describe('🔑 Authentication Integration Tests', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await cleanDatabase();
    await pool.end();
    await redisConnection.quit();
  });

  const testStudent = {
    email: 'teststudent@educonnect.com',
    password: 'SecurePassword123!',
    role: 'STUDENT',
  };

  describe('POST /api/v1/auth/register', () => {
    it('should register a new student user successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(testStudent);

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data.user.email).toBe(testStudent.email);
      expect(response.body.data.user.role).toBe(testStudent.role);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();

      // Check database
      const [rows] = await pool.execute<RowDataPacket[]>(
        'SELECT * FROM users WHERE email = ?',
        [testStudent.email]
      );
      expect(rows.length).toBe(1);
    });

    it('should fail if email is already registered', async () => {
      // Register once
      await request(app).post('/api/v1/auth/register').send(testStudent);

      // Register again
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(testStudent);

      expect(response.status).toBe(409);
      expect(response.body.status).toBe('error');
    });

    it('should reject weak passwords', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'weakpass@educonnect.com',
          password: 'weak',
          role: 'STUDENT',
        });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/v1/auth/register').send(testStudent);
    });

    it('should log in an existing user with correct credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testStudent.email,
          password: testStudent.password,
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });

    it('should reject wrong passwords', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testStudent.email,
          password: 'wrong_password',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    let refreshToken: string;

    beforeEach(async () => {
      const registerRes = await request(app).post('/api/v1/auth/register').send(testStudent);
      refreshToken = registerRes.body.data.refreshToken;
    });

    it('should successfully rotate tokens using a valid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });

    it('should fail with random invalid refresh tokens', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid_refresh_token_string' });

      expect(response.status).toBe(401);
    });
  });
});
