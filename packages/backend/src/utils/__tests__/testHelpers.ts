// src/utils/__tests__/testHelpers.ts
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { UnifiedAuthRequest } from '../../middleware/unifiedAuth.middleware';
import { Business } from '../../models/business.model';
import { Manufacturer } from '../../models/manufacturer.model';
import { User } from '../../models/user.model';

/**
 * Test utilities for creating mock requests, responses, and test data
 */

// ===== MOCK REQUEST/RESPONSE CREATORS =====

export function createMockRequest(overrides: Partial<Request> = {}): Request {
  return {
    method: 'GET',
    url: '/test',
    headers: {},
    body: {},
    query: {},
    params: {},
    ...overrides
  } as Request;
}

export function createMockResponse(): Response {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.end = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  res.getHeader = jest.fn();
  res.removeHeader = jest.fn().mockReturnValue(res);
  return res;
}

export function createMockNext(): jest.Mock {
  return jest.fn();
}

// ===== AUTHENTICATED REQUEST CREATORS =====

export function createAuthenticatedRequest(
  userType: 'business' | 'manufacturer' | 'user',
  userId: string,
  overrides: Partial<UnifiedAuthRequest> = {}
): UnifiedAuthRequest {
  const token = jwt.sign(
    { sub: userId, userType, iat: Date.now(), exp: Date.now() + 3600000 },
    process.env.JWT_SECRET || 'test-secret'
  );

  return {
    ...createMockRequest(),
    headers: {
      authorization: `Bearer ${token}`,
      ...overrides.headers
    },
    userId,
    userType,
    tokenPayload: {
      sub: userId,
      userType,
      iat: Date.now(),
      exp: Date.now() + 3600000
    },
    ...overrides
  } as UnifiedAuthRequest;
}

// ===== TEST DATA CREATORS =====

export function createTestBusiness(overrides: Partial<any> = {}) {
  return {
    email: 'test@business.com',
    password: 'TestPass123!',
    businessName: 'Test Business',
    industry: 'Technology',
    contactEmail: 'contact@testbusiness.com',
    phone: '+1234567890',
    address: {
      street: '123 Test St',
      city: 'Test City',
      state: 'TS',
      zipCode: '12345',
      country: 'US'
    },
    isEmailVerified: true,
    isActive: true,
    ...overrides
  };
}

export function createTestManufacturer(overrides: Partial<any> = {}) {
  return {
    email: 'test@manufacturer.com',
    password: 'TestPass123!',
    name: 'Test Manufacturer',
    industry: 'Manufacturing',
    description: 'Test manufacturer description',
    contactEmail: 'contact@testmanufacturer.com',
    servicesOffered: ['Production', 'Assembly'],
    moq: 100,
    isVerified: true,
    isActive: true,
    ...overrides
  };
}

export function createTestUser(overrides: Partial<any> = {}) {
  return {
    email: 'test@user.com',
    password: 'TestPass123!',
    firstName: 'Test',
    lastName: 'User',
    phone: '+1234567890',
    isEmailVerified: true,
    isActive: true,
    ...overrides
  };
}

// ===== DATABASE HELPERS =====

export async function createTestBusinessInDB(overrides: Partial<any> = {}) {
  const businessData = createTestBusiness(overrides);
  
  // For unit tests, return a mock object with _id
  if (process.env.TEST_TYPE === 'unit') {
    return {
      ...businessData,
      _id: { toString: () => '507f1f77bcf86cd799439011' }, // Mock ObjectId
      save: jest.fn().mockResolvedValue(this),
      toObject: () => businessData
    };
  }
  
  // For integration tests, use actual database
  const business = new Business(businessData);
  await business.save();
  return business;
}

export async function createTestManufacturerInDB(overrides: Partial<any> = {}) {
  const manufacturerData = createTestManufacturer(overrides);
  
  // For unit tests, return a mock object with _id
  if (process.env.TEST_TYPE === 'unit') {
    return {
      ...manufacturerData,
      _id: { toString: () => '507f1f77bcf86cd799439012' }, // Mock ObjectId
      save: jest.fn().mockResolvedValue(this),
      toObject: () => manufacturerData
    };
  }
  
  // For integration tests, use actual database
  const manufacturer = new Manufacturer(manufacturerData);
  await manufacturer.save();
  return manufacturer;
}

export async function createTestUserInDB(overrides: Partial<any> = {}) {
  const userData = createTestUser(overrides);
  
  // For unit tests, return a mock object with _id
  if (process.env.TEST_TYPE === 'unit') {
    return {
      ...userData,
      _id: { toString: () => '507f1f77bcf86cd799439013' }, // Mock ObjectId
      save: jest.fn().mockResolvedValue(this),
      toObject: () => userData
    };
  }
  
  // For integration tests, use actual database
  const user = new User(userData);
  await user.save();
  return user;
}

// ===== ASSERTION HELPERS =====

export function expectSuccessResponse(res: Response, expectedStatus = 200) {
  expect(res.status).toHaveBeenCalledWith(expectedStatus);
  expect(res.json).toHaveBeenCalled();
}

export function expectErrorResponse(res: Response, expectedStatus: number, expectedMessage?: string) {
  expect(res.status).toHaveBeenCalledWith(expectedStatus);
  expect(res.json).toHaveBeenCalled();
  
  if (expectedMessage) {
    const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
    expect(jsonCall.message).toContain(expectedMessage);
  }
}

export function expectValidationError(res: Response, field?: string) {
  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.json).toHaveBeenCalled();
  
  const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
  expect(jsonCall.message).toContain('validation');
  
  if (field) {
    expect(jsonCall.details).toBeDefined();
  }
}

// ===== MIDDLEWARE TESTING HELPERS =====

export async function testMiddleware(
  middleware: Function,
  req: Request,
  res: Response,
  next: jest.Mock,
  expectedBehavior: 'success' | 'error' | 'next'
) {
  await middleware(req, res, next);
  
  switch (expectedBehavior) {
    case 'success':
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      break;
    case 'error':
      expect(res.status).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
      break;
    case 'next':
      expect(next).toHaveBeenCalled();
      break;
  }
}

// ===== AUTHENTICATION TESTING HELPERS =====

export function expectAuthenticatedRequest(req: UnifiedAuthRequest, expectedUserType: string, expectedUserId: string) {
  expect(req.userId).toBe(expectedUserId);
  expect(req.userType).toBe(expectedUserType);
  expect(req.tokenPayload).toBeDefined();
  expect(req.tokenPayload?.sub).toBe(expectedUserId);
  expect(req.tokenPayload?.userType).toBe(expectedUserType);
}

export function expectUnauthenticatedRequest(req: Request) {
  expect((req as UnifiedAuthRequest).userId).toBeUndefined();
  expect((req as UnifiedAuthRequest).userType).toBeUndefined();
  expect((req as UnifiedAuthRequest).tokenPayload).toBeUndefined();
}

// ===== RATE LIMITING TESTING HELPERS =====

export function createRateLimitTestRequest(ip: string = '127.0.0.1') {
  return createMockRequest({
    ip,
    headers: {
      'x-forwarded-for': ip,
      'user-agent': 'test-agent'
    }
  });
}

// ===== DATA SANITIZATION TESTING HELPERS =====

export function createSensitiveDataObject() {
  return {
    username: 'testuser',
    password: 'secretpassword123',
    api_key: 'sk_1234567890abcdef',
    jwt_secret: 'my-super-secret-jwt-key',
    mongodb_uri: 'mongodb://user:pass@localhost:27017/database',
    stripe_secret_key: 'sk_test_1234567890abcdef',
    private_key: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    normalData: 'this should not be sanitized'
  };
}

export function expectSanitizedData(data: any) {
  expect(data.password).toBe('***REDACTED***');
  expect(data.api_key).toBe('***REDACTED***');
  expect(data.jwt_secret).toBe('***REDACTED***');
  expect(data.mongodb_uri).toBe('***REDACTED***');
  expect(data.stripe_secret_key).toBe('***REDACTED***');
  expect(data.private_key).toBe('***REDACTED***');
  expect(data.normalData).toBe('this should not be sanitized');
}

// ===== TIMEOUT HELPERS =====

export function waitFor(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== CLEANUP HELPERS =====

export async function cleanupTestData() {
  // For unit tests, we don't need to clean up real database
  // The models are mocked, so this is just a no-op
  if (process.env.TEST_TYPE === 'unit') {
    return;
  }
  
  // For integration tests, clean up the database
  if (mongoose.connection.readyState === 1) { // Connected
    await Business.deleteMany({});
    await Manufacturer.deleteMany({});
    await User.deleteMany({});
  }
}

// ===== MOCK HELPERS =====

export function mockJWT() {
  return jest.spyOn(jwt, 'sign').mockImplementation((payload, secret, options) => {
    return 'mock-jwt-token';
  });
}

export function mockBcrypt() {
  const bcrypt = require('bcrypt');
  jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-password');
  jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
  return bcrypt;
}

// ===== INTEGRATION TEST HELPERS =====

export function createIntegrationTestContext() {
  return {
    testBusiness: null as any,
    testManufacturer: null as any,
    testUser: null as any,
    authToken: null as string | null,
    setup: async function() {
      this.testBusiness = await createTestBusinessInDB();
      this.testManufacturer = await createTestManufacturerInDB();
      this.testUser = await createTestUserInDB();
    },
    cleanup: async function() {
      await cleanupTestData();
    }
  };
}
