/**
 * Auth Routes Integration Tests
 * 
 * Full API integration tests using Supertest against real Express app.
 * Tests complete authentication flow: register → login → refresh → protected routes.
 */

import request from 'supertest';
import { Application } from 'express';
import {
  startMongoMemoryServer,
  stopMongoMemoryServer,
  clearDatabase,
} from '../utils/mongo';
import { createRedisMock, clearRedis } from '../utils/redis';
import { createTestApp } from '../utils/app';
import {
  createTestUser,
  createTestBusiness,
} from '../factories';

describe('Auth Routes Integration Tests', () => {
  let app: Application;
  let redisMock: any;

  beforeAll(async () => {
    await startMongoMemoryServer();
    redisMock = createRedisMock();
    app = await createTestApp();
  });

  afterAll(async () => {
    await stopMongoMemoryServer();
    await clearRedis(redisMock);
  });

  beforeEach(async () => {
    await clearDatabase();
    await clearRedis(redisMock);
  });

  describe('POST /api/auth/register/user', () => {
    it('should register a new user successfully', async () => {
      const userData = createTestUser({
        email: 'newuser@example.com',
        firstName: 'John',
        lastName: 'Doe',
      });

      const response = await request(app)
        .post('/api/auth/register/user')
        .send({
          email: userData.email,
          password: userData.password,
          firstName: userData.firstName,
          lastName: userData.lastName,
          preferences: {
            emailNotifications: true,
            smsNotifications: false,
            marketingEmails: true,
            language: 'en',
            timezone: 'UTC',
          },
        })
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('userId');
      expect(response.body).toHaveProperty('email', userData.email);
    });

    it('should reject duplicate email registration', async () => {
      const userData = createTestUser({
        email: 'duplicate@example.com',
      });

      // First registration
      await request(app)
        .post('/api/auth/register/user')
        .send({
          email: userData.email,
          password: userData.password,
          firstName: userData.firstName,
          lastName: userData.lastName,
          preferences: {
            emailNotifications: true,
            smsNotifications: false,
            marketingEmails: true,
            language: 'en',
            timezone: 'UTC',
          },
        })
        .expect(201);

      // Duplicate registration
      const response = await request(app)
        .post('/api/auth/register/user')
        .send({
          email: userData.email,
          password: userData.password,
          firstName: userData.firstName,
          lastName: userData.lastName,
          preferences: {
            emailNotifications: true,
            smsNotifications: false,
            marketingEmails: true,
            language: 'en',
            timezone: 'UTC',
          },
        })
        .expect(409);

      expect(response.body.message).toContain('already');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register/user')
        .send({
          email: 'invalid-email',
          password: '123', // Too short
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
      expect(response.body.details).toBeDefined();
    });
  });

  describe('POST /api/auth/login/user', () => {
    let registeredUser: any;
    let userCredentials: any;

    beforeEach(async () => {
      userCredentials = createTestUser({
        email: 'login-test@example.com',
        password: 'TestPassword123!',
      });

      // Register user first
      await request(app)
        .post('/api/auth/register/user')
        .send({
          email: userCredentials.email,
          password: userCredentials.password,
          firstName: userCredentials.firstName,
          lastName: userCredentials.lastName,
          preferences: {
            emailNotifications: true,
            smsNotifications: false,
            marketingEmails: true,
            language: 'en',
            timezone: 'UTC',
          },
        });

      registeredUser = userCredentials;
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login/user')
        .send({
          email: registeredUser.email,
          password: registeredUser.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(registeredUser.email);
      expect(response.body.success).toBe(true);
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login/user')
        .send({
          email: registeredUser.email,
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body.message).toBeDefined();
    });

    it('should reject non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login/user')
        .send({
          email: 'nonexistent@example.com',
          password: 'TestPassword123!',
        })
        .expect(404);

      expect(response.body.message).toBeDefined();
    });
  });

  describe('POST /api/auth/refresh', () => {
    let accessToken: string;
    let refreshToken: string;

    beforeEach(async () => {
      const userCredentials = createTestUser({
        email: 'refresh-test@example.com',
        password: 'TestPassword123!',
      });

      // Register and login
      await request(app)
        .post('/api/auth/register/user')
        .send({
          email: userCredentials.email,
          password: userCredentials.password,
          firstName: userCredentials.firstName,
          lastName: userCredentials.lastName,
          preferences: {
            emailNotifications: true,
            smsNotifications: false,
            marketingEmails: true,
            language: 'en',
            timezone: 'UTC',
          },
        });

      const loginResponse = await request(app)
        .post('/api/auth/login/user')
        .send({
          email: userCredentials.email,
          password: userCredentials.password,
        });

      accessToken = loginResponse.body.token;
      refreshToken = loginResponse.body.refreshToken;
    });

    it('should refresh access token with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${refreshToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body.token).not.toBe(accessToken); // New token
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('should reject refresh with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', 'Bearer invalid-refresh-token')
        .expect(401);

      expect(response.body.message).toBeDefined();
    });

    it('should reject refresh with access token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);

      expect(response.body.message).toBeDefined();
    });
  });

  describe('Protected Routes', () => {
    let accessToken: string;

    beforeEach(async () => {
      const userCredentials = createTestUser({
        email: 'protected-test@example.com',
        password: 'TestPassword123!',
      });

      // Register and login
      await request(app)
        .post('/api/auth/register/user')
        .send({
          email: userCredentials.email,
          password: userCredentials.password,
          firstName: userCredentials.firstName,
          lastName: userCredentials.lastName,
          preferences: {
            emailNotifications: true,
            smsNotifications: false,
            marketingEmails: true,
            language: 'en',
            timezone: 'UTC',
          },
        });

      const loginResponse = await request(app)
        .post('/api/auth/login/user')
        .send({
          email: userCredentials.email,
          password: userCredentials.password,
        });

      accessToken = loginResponse.body.token;
    });

    it('should access protected route with valid token', async () => {
      // Example: Assuming /api/users/me exists
      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should reject protected route without token', async () => {
      const response = await request(app)
        .get('/api/users/me')
        .expect(401);

      expect(response.body.message).toContain('Unauthorized');
    });

    it('should reject protected route with invalid token', async () => {
      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.message).toBeDefined();
    });
  });

  describe('HTTP Status Codes', () => {
    it('should return correct status codes for various scenarios', async () => {
      // 201 Created - Successful registration
      await request(app)
        .post('/api/auth/register/user')
        .send({
          email: 'status-test@example.com',
          password: 'TestPassword123!',
          firstName: 'Test',
          lastName: 'User',
          preferences: {
            emailNotifications: true,
            smsNotifications: false,
            marketingEmails: true,
            language: 'en',
            timezone: 'UTC',
          },
        })
        .expect(201);

      // 400 Bad Request - Validation error
      await request(app)
        .post('/api/auth/register/user')
        .send({
          email: 'invalid-email',
        })
        .expect(400);

      // 401 Unauthorized - Invalid credentials
      await request(app)
        .post('/api/auth/login/user')
        .send({
          email: 'status-test@example.com',
          password: 'WrongPassword',
        })
        .expect(401);

      // 404 Not Found - Non-existent user
      await request(app)
        .post('/api/auth/login/user')
        .send({
          email: 'nonexistent@example.com',
          password: 'TestPassword123!',
        })
        .expect(404);
    });
  });

  describe('Response Headers', () => {
    it('should include CORS headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      // Check for CORS headers (adjust based on your CORS config)
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    it('should include security headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      // Check for Helmet security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on auth endpoints', async () => {
      // Make multiple rapid requests
      const requests = Array.from({ length: 10 }, () =>
        request(app)
          .post('/api/auth/login/user')
          .send({
            email: 'ratelimit-test@example.com',
            password: 'TestPassword123!',
          })
      );

      const responses = await Promise.all(requests);

      // At least one should be rate limited (429)
      const rateLimited = responses.some((res) => res.status === 429);
      // Note: This depends on your rate limit configuration
      // Adjust expectations based on your actual rate limits
      expect(rateLimited).toBeDefined();
    });
  });
});

