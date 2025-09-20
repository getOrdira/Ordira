// src/__tests__/integration/auth.integration.test.ts

import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { Business } from '../../models/business.model';
import { Manufacturer } from '../../models/manufacturer.model';
import { User } from '../../models/user.model';
import { createTestBusiness, createTestManufacturer, createTestUser } from '../../utils/__tests__/testHelpers';

// Import your app setup
// Note: You'll need to create a test app setup that doesn't start the server
let app: express.Application;

beforeAll(async () => {
  // Set up test database
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
  process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ordira-test';
  
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI);
  }
  
  // Initialize your Express app for testing
  // app = require('../../index').app; // Uncomment when you have a test app setup
});

afterAll(async () => {
  await mongoose.connection.close();
});

afterEach(async () => {
  // Clean up test data
  await Business.deleteMany({});
  await Manufacturer.deleteMany({});
  await User.deleteMany({});
});

describe('Authentication Integration Tests', () => {
  describe('POST /api/auth/register/business', () => {
    it('should register a new business successfully', async () => {
      const businessData = createTestBusiness({
        email: 'newbusiness@test.com',
        businessName: 'New Test Business'
      });

      const response = await request(app)
        .post('/api/auth/register/business')
        .send(businessData)
        .expect(201);

      expect(response.body).toHaveProperty('businessId');
      expect(response.body.businessId).toBeDefined();

      // Verify business was created in database
      const createdBusiness = await Business.findOne({ email: businessData.email });
      expect(createdBusiness).toBeTruthy();
      expect(createdBusiness?.businessName).toBe(businessData.businessName);
    });

    it('should reject duplicate email registration', async () => {
      const businessData = createTestBusiness();
      await Business.create(businessData);

      const response = await request(app)
        .post('/api/auth/register/business')
        .send(businessData)
        .expect(409);

      expect(response.body.message).toContain('already in use');
    });

    it('should validate required fields', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: '123' // Too short
      };

      const response = await request(app)
        .post('/api/auth/register/business')
        .send(invalidData)
        .expect(400);

      expect(response.body.message).toContain('validation');
    });
  });

  describe('POST /api/auth/login/business', () => {
    let testBusiness: any;

    beforeEach(async () => {
      testBusiness = await Business.create(createTestBusiness());
    });

    it('should login with valid credentials', async () => {
      const loginData = {
        email: testBusiness.email,
        password: 'TestPass123!'
      };

      const response = await request(app)
        .post('/api/auth/login/business')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('business');
      expect(response.body.business.email).toBe(testBusiness.email);
    });

    it('should reject invalid credentials', async () => {
      const loginData = {
        email: testBusiness.email,
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/auth/login/business')
        .send(loginData)
        .expect(401);

      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should reject non-existent user', async () => {
      const loginData = {
        email: 'nonexistent@test.com',
        password: 'TestPass123!'
      };

      const response = await request(app)
        .post('/api/auth/login/business')
        .send(loginData)
        .expect(401);

      expect(response.body.message).toContain('Invalid credentials');
    });
  });

  describe('POST /api/auth/register/manufacturer', () => {
    it('should register a new manufacturer successfully', async () => {
      const manufacturerData = createTestManufacturer({
        email: 'newmanufacturer@test.com',
        name: 'New Test Manufacturer'
      });

      const response = await request(app)
        .post('/api/auth/register/manufacturer')
        .send(manufacturerData)
        .expect(201);

      expect(response.body).toHaveProperty('manufacturerId');
      expect(response.body.manufacturerId).toBeDefined();

      // Verify manufacturer was created in database
      const createdManufacturer = await Manufacturer.findOne({ email: manufacturerData.email });
      expect(createdManufacturer).toBeTruthy();
      expect(createdManufacturer?.name).toBe(manufacturerData.name);
    });
  });

  describe('POST /api/auth/register/user', () => {
    it('should register a new user successfully', async () => {
      const userData = createTestUser({
        email: 'newuser@test.com',
        firstName: 'New',
        lastName: 'User'
      });

      const response = await request(app)
        .post('/api/auth/register/user')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(userData.email);

      // Verify user was created in database
      const createdUser = await User.findOne({ email: userData.email });
      expect(createdUser).toBeTruthy();
      expect(createdUser?.firstName).toBe(userData.firstName);
    });
  });

  describe('Protected Routes', () => {
    let authToken: string;
    let testBusiness: any;

    beforeEach(async () => {
      testBusiness = await Business.create(createTestBusiness());
      
      // Get auth token
      const loginResponse = await request(app)
        .post('/api/auth/login/business')
        .send({
          email: testBusiness.email,
          password: 'TestPass123!'
        });
      
      authToken = loginResponse.body.token;
    });

    it('should access protected route with valid token', async () => {
      const response = await request(app)
        .get('/api/business/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('business');
    });

    it('should reject protected route without token', async () => {
      const response = await request(app)
        .get('/api/business/profile')
        .expect(401);

      expect(response.body.message).toContain('Unauthorized');
    });

    it('should reject protected route with invalid token', async () => {
      const response = await request(app)
        .get('/api/business/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.message).toContain('Invalid token');
    });
  });

  describe('Password Reset Flow', () => {
    let testBusiness: any;

    beforeEach(async () => {
      testBusiness = await Business.create(createTestBusiness());
    });

    it('should initiate password reset', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testBusiness.email })
        .expect(200);

      expect(response.body.message).toContain('reset');
    });

    it('should handle non-existent email gracefully', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@test.com' })
        .expect(200);

      // Should not reveal whether email exists
      expect(response.body.message).toContain('reset');
    });
  });

  describe('Token Refresh', () => {
    let authToken: string;
    let testBusiness: any;

    beforeEach(async () => {
      testBusiness = await Business.create(createTestBusiness());
      
      const loginResponse = await request(app)
        .post('/api/auth/login/business')
        .send({
          email: testBusiness.email,
          password: 'TestPass123!'
        });
      
      authToken = loginResponse.body.token;
    });

    it('should refresh valid token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body.token).not.toBe(authToken);
    });

    it('should reject refresh with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.message).toContain('Invalid token');
    });
  });
});
