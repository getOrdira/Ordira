// src/services/external/__tests__/stripe.service.test.ts

// Set environment variables before importing the service
process.env.STRIPE_SECRET_KEY = 'sk_test_mock_stripe_secret_key';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_mock_webhook_secret';
process.env.APP_URL = 'https://test.ordira.com';

// Mock Stripe before importing
const mockStripeInstance = {
  customers: {
    create: jest.fn(),
    retrieve: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  subscriptions: {
    create: jest.fn(),
    update: jest.fn(),
    retrieve: jest.fn(),
    cancel: jest.fn()
  },
  charges: {
    create: jest.fn(),
    retrieve: jest.fn()
  },
  checkout: {
    sessions: {
      create: jest.fn(),
      retrieve: jest.fn()
    }
  },
  webhooks: {
    constructEvent: jest.fn()
  },
  coupons: {
    create: jest.fn(),
    retrieve: jest.fn()
  }
};

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => mockStripeInstance);
});

import { StripeService } from '../stripe.service';

describe('StripeService', () => {
  let stripeService: StripeService;

  beforeEach(() => {
    stripeService = new StripeService();
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Customer Management', () => {
    describe('createCustomer', () => {
      it('should create a customer successfully', async () => {
        const businessId = 'business-id-123';
        const email = 'test@example.com';
        const mockCustomer = {
          id: 'cus_test123',
          email,
          metadata: { businessId }
        };

        mockStripeInstance.customers.create.mockResolvedValue(mockCustomer);

        const result = await stripeService.createCustomer(businessId, email);

        expect(result).toBe('cus_test123');
        expect(mockStripeInstance.customers.create).toHaveBeenCalledWith({
          metadata: { businessId },
          email
        });
      });

      it('should handle customer creation errors', async () => {
        const businessId = 'business-id-123';
        const email = 'invalid-email';

        mockStripeInstance.customers.create.mockRejectedValue(new Error('Invalid email'));

        await expect(stripeService.createCustomer(businessId, email))
          .rejects.toThrow('Invalid email');
      });
    });
  });

  describe('Subscription Management', () => {
    describe('createSubscription', () => {
      it('should create a subscription successfully', async () => {
        const customerId = 'cus_test123';
        const plan = 'foundation';
        const mockSubscription = {
          id: 'sub_test123',
          customer: customerId,
          status: 'active',
          metadata: { plan }
        };

        mockStripeInstance.subscriptions.create.mockResolvedValue(mockSubscription);

        const result = await stripeService.createSubscription(customerId, plan);

        expect(result).toEqual(mockSubscription);
        expect(mockStripeInstance.subscriptions.create).toHaveBeenCalledWith({
          customer: customerId,
          items: [{ price: 'price_1RqIhPAUE6HtX6lzNr05UfW6' }],
          metadata: { plan }
        });
      });

      it('should create a subscription with coupon', async () => {
        const customerId = 'cus_test123';
        const plan = 'growth';
        const couponId = 'coupon_test123';
        const mockSubscription = {
          id: 'sub_test123',
          customer: customerId,
          status: 'active',
          metadata: { plan },
          discount: { coupon: { id: couponId } }
        };

        mockStripeInstance.subscriptions.create.mockResolvedValue(mockSubscription);

        const result = await stripeService.createSubscription(customerId, plan, couponId);

        expect(result).toEqual(mockSubscription);
        expect(mockStripeInstance.subscriptions.create).toHaveBeenCalledWith({
          customer: customerId,
          items: [{ price: 'price_1RqJ1AAUE6HtX6lzavobhOU3' }],
          metadata: { plan },
          coupon: couponId
        });
      });

      it('should handle subscription creation errors', async () => {
        const customerId = 'cus_test123';
        const plan = 'foundation';

        mockStripeInstance.subscriptions.create.mockRejectedValue(new Error('Invalid customer'));

        await expect(stripeService.createSubscription(customerId, plan))
          .rejects.toThrow('Invalid customer');
      });
    });

    describe('updateSubscription', () => {
      it('should update a subscription successfully', async () => {
        const subscriptionId = 'sub_test123';
        const plan = 'growth';
        const mockSubscription = {
          id: subscriptionId,
          status: 'active',
          metadata: { plan }
        };

        mockStripeInstance.subscriptions.update.mockResolvedValue(mockSubscription);

        const result = await stripeService.updateSubscription(subscriptionId, plan);

        expect(result).toEqual(mockSubscription);
        expect(mockStripeInstance.subscriptions.update).toHaveBeenCalledWith(subscriptionId, {
          cancel_at_period_end: false,
          items: [{ price: 'price_1RqJ1AAUE6HtX6lzavobhOU3' }],
          metadata: { plan }
        });
      });

      it('should update a subscription with coupon', async () => {
        const subscriptionId = 'sub_test123';
        const plan = 'enterprise';
        const couponId = 'coupon_test123';
        const mockSubscription = {
          id: subscriptionId,
          status: 'active',
          metadata: { plan },
          discount: { coupon: { id: couponId } }
        };

        mockStripeInstance.subscriptions.update.mockResolvedValue(mockSubscription);

        const result = await stripeService.updateSubscription(subscriptionId, plan, couponId);

        expect(result).toEqual(mockSubscription);
        expect(mockStripeInstance.subscriptions.update).toHaveBeenCalledWith(subscriptionId, {
          cancel_at_period_end: false,
          items: [{ price: 'price_1RqJ3vAUE6HtX6lz8hpLnfVm' }],
          metadata: { plan },
          coupon: couponId
        });
      });

      it('should handle subscription update errors', async () => {
        const subscriptionId = 'sub_invalid';
        const plan = 'foundation';

        mockStripeInstance.subscriptions.update.mockRejectedValue(new Error('Subscription not found'));

        await expect(stripeService.updateSubscription(subscriptionId, plan))
          .rejects.toThrow('Subscription not found');
      });
    });

    describe('applyCouponToSubscription', () => {
      it('should apply coupon to subscription successfully', async () => {
        const subscriptionId = 'sub_test123';
        const couponId = 'coupon_test123';
        const mockSubscription = {
          id: subscriptionId,
          status: 'active',
          discount: { coupon: { id: couponId } }
        };

        mockStripeInstance.subscriptions.update.mockResolvedValue(mockSubscription);

        const result = await stripeService.applyCouponToSubscription(subscriptionId, couponId);

        expect(result).toEqual(mockSubscription);
        expect(mockStripeInstance.subscriptions.update).toHaveBeenCalledWith(subscriptionId, {
          coupon: couponId
        });
      });

      it('should handle coupon application errors', async () => {
        const subscriptionId = 'sub_test123';
        const couponId = 'coupon_invalid';

        mockStripeInstance.subscriptions.update.mockRejectedValue(new Error('Invalid coupon'));

        await expect(stripeService.applyCouponToSubscription(subscriptionId, couponId))
          .rejects.toThrow('Invalid coupon');
      });
    });
  });

  describe('Payment Processing', () => {
    describe('chargeCustomer', () => {
      it('should charge a customer successfully', async () => {
        const customerId = 'cus_test123';
        const amount = 29.99;
        const description = 'Test payment';
        const mockCharge = {
          id: 'ch_test123',
          customer: customerId,
          amount: 2999, // cents
          currency: 'usd',
          description,
          status: 'succeeded'
        };

        mockStripeInstance.charges.create.mockResolvedValue(mockCharge);

        const result = await stripeService.chargeCustomer(customerId, amount, description);

        expect(result).toEqual(mockCharge);
        expect(mockStripeInstance.charges.create).toHaveBeenCalledWith({
          customer: customerId,
          amount: 2999, // amount * 100
          currency: 'usd',
          description
        });
      });

      it('should handle decimal amounts correctly', async () => {
        const customerId = 'cus_test123';
        const amount = 19.95;
        const description = 'Test payment';
        const mockCharge = {
          id: 'ch_test123',
          amount: 1995, // cents
          status: 'succeeded'
        };

        mockStripeInstance.charges.create.mockResolvedValue(mockCharge);

        const result = await stripeService.chargeCustomer(customerId, amount, description);

        expect(result).toEqual(mockCharge);
        expect(mockStripeInstance.charges.create).toHaveBeenCalledWith({
          customer: customerId,
          amount: 1995, // Math.round(19.95 * 100)
          currency: 'usd',
          description
        });
      });

      it('should handle charge errors', async () => {
        const customerId = 'cus_test123';
        const amount = 29.99;
        const description = 'Test payment';

        mockStripeInstance.charges.create.mockRejectedValue(new Error('Insufficient funds'));

        await expect(stripeService.chargeCustomer(customerId, amount, description))
          .rejects.toThrow('Insufficient funds');
      });
    });
  });

  describe('Checkout Sessions', () => {
    describe('createCheckoutSession', () => {
      it('should create a checkout session successfully', async () => {
        const customerId = 'cus_test123';
        const plan = 'foundation';
        const mockSession = {
          id: 'cs_test123',
          customer: customerId,
          mode: 'subscription',
          url: 'https://checkout.stripe.com/pay/cs_test123'
        };

        mockStripeInstance.checkout.sessions.create.mockResolvedValue(mockSession);

        const result = await stripeService.createCheckoutSession(customerId, plan);

        expect(result).toBe('cs_test123');
        expect(mockStripeInstance.checkout.sessions.create).toHaveBeenCalledWith({
          customer: customerId,
          mode: 'subscription',
          line_items: [{ price: 'price_1RqIhPAUE6HtX6lzNr05UfW6', quantity: 1 }],
          success_url: 'https://test.ordira.com/billing/success?session_id={CHECKOUT_SESSION_ID}',
          cancel_url: 'https://test.ordira.com/billing/cancel'
        });
      });

      it('should handle checkout session creation errors', async () => {
        const customerId = 'cus_test123';
        const plan = 'foundation';

        mockStripeInstance.checkout.sessions.create.mockRejectedValue(new Error('Invalid customer'));

        await expect(stripeService.createCheckoutSession(customerId, plan))
          .rejects.toThrow('Invalid customer');
      });
    });
  });

  describe('Webhook Validation', () => {
    describe('validateWebhook', () => {
      it('should validate webhook successfully', async () => {
        const payload = Buffer.from('{"type":"customer.created"}');
        const signature = 't=1234567890,v1=valid_signature';
        const mockEvent = {
          id: 'evt_test123',
          type: 'customer.created',
          data: { object: { id: 'cus_test123' } }
        };

        mockStripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent);

        const result = await stripeService.validateWebhook(payload, signature);

        expect(result).toEqual(mockEvent);
        expect(mockStripeInstance.webhooks.constructEvent).toHaveBeenCalledWith(
          payload,
          signature,
          'whsec_mock_webhook_secret'
        );
      });

      it('should handle webhook validation errors', async () => {
        const payload = Buffer.from('{"type":"customer.created"}');
        const signature = 'invalid_signature';

        mockStripeInstance.webhooks.constructEvent.mockImplementation(() => {
          throw new Error('Invalid signature');
        });

        await expect(stripeService.validateWebhook(payload, signature))
          .rejects.toThrow('Invalid signature');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle missing environment variables', async () => {
      const originalSecretKey = process.env.STRIPE_SECRET_KEY;
      delete process.env.STRIPE_SECRET_KEY;
      
      // Re-import the service to get the new environment
      jest.resetModules();
      
      // Mock Stripe again for the new import
      jest.doMock('stripe', () => {
        return jest.fn().mockImplementation(() => {
          throw new Error('Missing Stripe secret key');
        });
      });
      
      await expect(() => {
        const { StripeService: NewStripeService } = require('../stripe.service');
        new NewStripeService();
      }).toThrow('Missing Stripe secret key');

      process.env.STRIPE_SECRET_KEY = originalSecretKey;
    });

    it('should handle network errors gracefully', async () => {
      const customerId = 'cus_test123';
      const email = 'test@example.com';

      mockStripeInstance.customers.create.mockRejectedValue(new Error('Network error'));

      await expect(stripeService.createCustomer('business-id-123', email))
        .rejects.toThrow('Network error');
    });

    it('should handle invalid plan keys', async () => {
      const customerId = 'cus_test123';
      const invalidPlan = 'invalid_plan' as any;

      mockStripeInstance.subscriptions.create.mockRejectedValue(new Error('Invalid price ID'));

      await expect(stripeService.createSubscription(customerId, invalidPlan))
        .rejects.toThrow("Cannot read properties of undefined (reading 'stripePriceId')");
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete subscription flow', async () => {
      const businessId = 'business-id-123';
      const email = 'test@example.com';
      const plan = 'growth';

      // Mock customer creation
      const mockCustomer = { id: 'cus_test123', email };
      mockStripeInstance.customers.create.mockResolvedValue(mockCustomer);

      // Mock subscription creation
      const mockSubscription = { id: 'sub_test123', customer: 'cus_test123', status: 'active' };
      mockStripeInstance.subscriptions.create.mockResolvedValue(mockSubscription);

      // Create customer
      const customerId = await stripeService.createCustomer(businessId, email);
      expect(customerId).toBe('cus_test123');

      // Create subscription
      const subscription = await stripeService.createSubscription(customerId, plan);
      expect(subscription.id).toBe('sub_test123');
      expect(subscription.status).toBe('active');
    });

    it('should handle subscription upgrade flow', async () => {
      const subscriptionId = 'sub_test123';
      const newPlan = 'enterprise';
      const couponId = 'upgrade_coupon';

      // Mock subscription update
      const mockUpdatedSubscription = {
        id: subscriptionId,
        status: 'active',
        metadata: { plan: newPlan },
        discount: { coupon: { id: couponId } }
      };
      mockStripeInstance.subscriptions.update.mockResolvedValue(mockUpdatedSubscription);

      const result = await stripeService.updateSubscription(subscriptionId, newPlan, couponId);

      expect(result.id).toBe(subscriptionId);
      expect(result.metadata.plan).toBe(newPlan);
      expect(result.discount?.coupon.id).toBe(couponId);
    });

    it('should handle payment processing flow', async () => {
      const customerId = 'cus_test123';
      const amount = 99.99;
      const description = 'Premium feature purchase';

      // Mock charge creation
      const mockCharge = {
        id: 'ch_test123',
        customer: customerId,
        amount: 9999,
        currency: 'usd',
        description,
        status: 'succeeded'
      };
      mockStripeInstance.charges.create.mockResolvedValue(mockCharge);

      const result = await stripeService.chargeCustomer(customerId, amount, description);

      expect(result.id).toBe('ch_test123');
      expect(result.amount).toBe(9999);
      expect(result.status).toBe('succeeded');
    });
  });
});
