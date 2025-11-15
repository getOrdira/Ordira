/**
 * Connections Invitations Controller Unit Tests
 * 
 * Tests connection invitation operations: send invitation, bulk invite, respond, cancel, list, stats, check status, remove connection, recent activity.
 */

import { Response, NextFunction } from 'express';
import { ConnectionsInvitationsController } from '../../../../controllers/features/connections/connectionsInvitations.controller';
import { getConnectionsServices } from '../../../../controllers/features/connections/connectionsBase.controller';
import {
  createMockRequest,
  createMockResponse,
  createMockNext,
} from '../../../../utils/__tests__/testHelpers';

// Mock connections services
jest.mock('../../../../controllers/features/connections/connectionsBase.controller', () => ({
  getConnectionsServices: jest.fn(() => ({
    validation: {
      invitation: {
        validateCreateInvitation: jest.fn(),
        validateBulkInvitation: jest.fn(),
        validateInvitationResponse: jest.fn(),
      },
    },
    features: {
      invitations: {
        sendInvite: jest.fn(),
        bulkInvite: jest.fn(),
        respondInvite: jest.fn(),
        cancelInvite: jest.fn(),
        getInvitationById: jest.fn(),
        listInvitesForBrand: jest.fn(),
        listInvitesForManufacturer: jest.fn(),
        getPendingInvitesForBrand: jest.fn(),
        getPendingInvitesForManufacturer: jest.fn(),
        getConnectionStats: jest.fn(),
        getManufacturerConnectionStats: jest.fn(),
        getConnectedManufacturers: jest.fn(),
        getConnectedBrands: jest.fn(),
        areConnected: jest.fn(),
        removeConnection: jest.fn(),
        getRecentActivity: jest.fn(),
      },
    },
    utils: {
      helpers: {
        mapInvitationToSummary: jest.fn(),
      },
    },
  })),
}));

// Mock logger
jest.mock('../../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    logSafe: jest.fn(),
  },
}));

describe('ConnectionsInvitationsController', () => {
  let connectionsInvitationsController: ConnectionsInvitationsController;
  let mockRequest: any;
  let mockResponse: Response;
  let mockNext: NextFunction;
  let mockConnectionsServices: any;

  beforeEach(() => {
    connectionsInvitationsController = new ConnectionsInvitationsController();
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();
    mockNext = createMockNext();
    mockConnectionsServices = getConnectionsServices();
    jest.clearAllMocks();

    mockRequest.userId = 'user-id-123';
    mockRequest.userType = 'business';
    mockRequest.businessId = 'business-id-123';
    mockRequest.headers = {};
    mockRequest.performanceMetrics = {};

    (connectionsInvitationsController as any).validateBusinessUser = jest.fn(
      (req: any, res: any, callback: any) => callback()
    );
    (connectionsInvitationsController as any).validateManufacturerUser = jest.fn(
      (req: any, res: any, callback: any) => callback()
    );
    (connectionsInvitationsController as any).validateAuth = jest.fn(
      (req: any, res: any, callback: any) => callback()
    );
    (connectionsInvitationsController as any).resolveBrandId = jest.fn().mockReturnValue('brand-id-123');
    (connectionsInvitationsController as any).resolveManufacturerId = jest.fn().mockReturnValue('manufacturer-id-123');
    (connectionsInvitationsController as any).resolveConnectionPair = jest.fn().mockReturnValue({
      brandId: 'brand-id-123',
      manufacturerId: 'manufacturer-id-123',
    });
    (connectionsInvitationsController as any).recordPerformance = jest.fn();
    (connectionsInvitationsController as any).logAction = jest.fn();
    (connectionsInvitationsController as any).handleAsync = jest.fn(
      async (fn: any, res: any, message: string) => {
        try {
          const result = await fn();
          res.status(200).json({ success: true, data: result, message });
        } catch (error: any) {
          res.status(error.statusCode || 500).json({ success: false, message: error.message });
        }
      }
    );
    (connectionsInvitationsController as any).getRequestMeta = jest.fn().mockReturnValue({});
  });

  describe('sendInvitation', () => {
    const mockInvitation = {
      id: 'invitation-id-123',
      brandId: 'brand-id-123',
      manufacturerId: 'manufacturer-id-123',
      status: 'pending',
    };
    const mockSummary = {
      id: 'invitation-id-123',
      status: 'pending',
    };

    beforeEach(() => {
      (mockConnectionsServices.validation.invitation.validateCreateInvitation as jest.Mock).mockReturnValue({
        isValid: true,
      });
      (mockConnectionsServices.features.invitations.sendInvite as jest.Mock).mockResolvedValue(mockInvitation);
      (mockConnectionsServices.utils.helpers.mapInvitationToSummary as jest.Mock).mockReturnValue(mockSummary);
    });

    it('should send invitation successfully', async () => {
      mockRequest.validatedBody = {
        manufacturerId: 'manufacturer-id-123',
        invitationType: 'collaboration',
        message: 'Test invitation',
        terms: {},
      };

      await connectionsInvitationsController.sendInvitation(mockRequest, mockResponse, mockNext);

      expect(mockConnectionsServices.features.invitations.sendInvite).toHaveBeenCalledWith(
        'brand-id-123',
        'manufacturer-id-123',
        expect.objectContaining({
          invitationType: 'collaboration',
          message: 'Test invitation',
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.invitation).toEqual(mockSummary);
    });

    it('should return 400 when validation fails', async () => {
      (mockConnectionsServices.validation.invitation.validateCreateInvitation as jest.Mock).mockReturnValue({
        isValid: false,
        errors: ['Invalid manufacturerId'],
      });

      mockRequest.validatedBody = {
        manufacturerId: 'invalid-id',
      };

      await connectionsInvitationsController.sendInvitation(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('bulkInvite', () => {
    const mockResult = {
      successful: [{ id: 'invitation-id-1' }, { id: 'invitation-id-2' }],
      failed: [],
    };

    beforeEach(() => {
      (mockConnectionsServices.validation.invitation.validateBulkInvitation as jest.Mock).mockReturnValue({
        isValid: true,
      });
      (mockConnectionsServices.features.invitations.bulkInvite as jest.Mock).mockResolvedValue(mockResult);
    });

    it('should send bulk invitations successfully', async () => {
      mockRequest.validatedBody = {
        manufacturerIds: ['manufacturer-id-1', 'manufacturer-id-2'],
        invitationType: 'partnership',
        message: 'Bulk invitation',
      };

      await connectionsInvitationsController.bulkInvite(mockRequest, mockResponse, mockNext);

      expect(mockConnectionsServices.features.invitations.bulkInvite).toHaveBeenCalledWith(
        'brand-id-123',
        ['manufacturer-id-1', 'manufacturer-id-2'],
        expect.objectContaining({
          invitationType: 'partnership',
          message: 'Bulk invitation',
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('respondInvitation', () => {
    const mockInvitation = {
      id: 'invitation-id-123',
      status: 'accepted',
    };
    const mockSummary = {
      id: 'invitation-id-123',
      status: 'accepted',
    };

    beforeEach(() => {
      (mockConnectionsServices.validation.invitation.validateInvitationResponse as jest.Mock).mockReturnValue({
        isValid: true,
      });
      (mockConnectionsServices.features.invitations.respondInvite as jest.Mock).mockResolvedValue(mockInvitation);
      (mockConnectionsServices.utils.helpers.mapInvitationToSummary as jest.Mock).mockReturnValue(mockSummary);
      mockRequest.userType = 'manufacturer';
      mockRequest.manufacturerId = 'manufacturer-id-123';
    });

    it('should respond to invitation successfully', async () => {
      mockRequest.validatedBody = {
        inviteId: 'invitation-id-123',
        accept: true,
        message: 'Accepted',
      };

      await connectionsInvitationsController.respondInvitation(mockRequest, mockResponse, mockNext);

      expect(mockConnectionsServices.features.invitations.respondInvite).toHaveBeenCalledWith(
        'invitation-id-123',
        true,
        'manufacturer-id-123',
        'Accepted'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('cancelInvitation', () => {
    beforeEach(() => {
      (mockConnectionsServices.features.invitations.cancelInvite as jest.Mock).mockResolvedValue({});
    });

    it('should cancel invitation successfully', async () => {
      mockRequest.validatedParams = {
        inviteId: 'invitation-id-123',
      };

      await connectionsInvitationsController.cancelInvitation(mockRequest, mockResponse, mockNext);

      expect(mockConnectionsServices.features.invitations.cancelInvite).toHaveBeenCalledWith(
        'invitation-id-123',
        'brand-id-123'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getInvitationById', () => {
    const mockInvitation = {
      id: 'invitation-id-123',
      status: 'pending',
    };
    const mockSummary = {
      id: 'invitation-id-123',
      status: 'pending',
    };

    beforeEach(() => {
      (mockConnectionsServices.features.invitations.getInvitationById as jest.Mock).mockResolvedValue(mockInvitation);
      (mockConnectionsServices.utils.helpers.mapInvitationToSummary as jest.Mock).mockReturnValue(mockSummary);
    });

    it('should retrieve invitation by ID', async () => {
      mockRequest.validatedParams = {
        inviteId: 'invitation-id-123',
      };

      await connectionsInvitationsController.getInvitationById(mockRequest, mockResponse, mockNext);

      expect(mockConnectionsServices.features.invitations.getInvitationById).toHaveBeenCalledWith(
        'invitation-id-123'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 when invitation not found', async () => {
      (mockConnectionsServices.features.invitations.getInvitationById as jest.Mock).mockResolvedValue(null);

      mockRequest.validatedParams = {
        inviteId: 'non-existent-id',
      };

      await connectionsInvitationsController.getInvitationById(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });
  });

  describe('listBrandInvitations', () => {
    const mockInvitations = [
      { id: 'invitation-id-1', status: 'pending' },
      { id: 'invitation-id-2', status: 'accepted' },
    ];

    beforeEach(() => {
      (mockConnectionsServices.features.invitations.listInvitesForBrand as jest.Mock).mockResolvedValue(
        mockInvitations
      );
    });

    it('should list brand invitations', async () => {
      await connectionsInvitationsController.listBrandInvitations(mockRequest, mockResponse, mockNext);

      expect(mockConnectionsServices.features.invitations.listInvitesForBrand).toHaveBeenCalledWith(
        'brand-id-123'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('listManufacturerInvitations', () => {
    const mockInvitations = [
      { id: 'invitation-id-1', status: 'pending' },
    ];

    beforeEach(() => {
      (mockConnectionsServices.features.invitations.listInvitesForManufacturer as jest.Mock).mockResolvedValue(
        mockInvitations
      );
      mockRequest.userType = 'manufacturer';
    });

    it('should list manufacturer invitations', async () => {
      await connectionsInvitationsController.listManufacturerInvitations(mockRequest, mockResponse, mockNext);

      expect(mockConnectionsServices.features.invitations.listInvitesForManufacturer).toHaveBeenCalledWith(
        'manufacturer-id-123'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getBrandConnectionStats', () => {
    const mockStats = {
      total: 10,
      pending: 2,
      accepted: 8,
    };

    beforeEach(() => {
      (mockConnectionsServices.features.invitations.getConnectionStats as jest.Mock).mockResolvedValue(mockStats);
    });

    it('should retrieve brand connection stats', async () => {
      await connectionsInvitationsController.getBrandConnectionStats(mockRequest, mockResponse, mockNext);

      expect(mockConnectionsServices.features.invitations.getConnectionStats).toHaveBeenCalledWith('brand-id-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('checkConnectionStatus', () => {
    beforeEach(() => {
      (mockConnectionsServices.features.invitations.areConnected as jest.Mock).mockResolvedValue(true);
    });

    it('should check connection status', async () => {
      mockRequest.validatedParams = {
        brandId: 'brand-id-123',
        manufacturerId: 'manufacturer-id-123',
      };

      await connectionsInvitationsController.checkConnectionStatus(mockRequest, mockResponse, mockNext);

      expect(mockConnectionsServices.features.invitations.areConnected).toHaveBeenCalledWith(
        'brand-id-123',
        'manufacturer-id-123'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.connected).toBe(true);
    });
  });

  describe('removeConnection', () => {
    beforeEach(() => {
      (mockConnectionsServices.features.invitations.removeConnection as jest.Mock).mockResolvedValue({});
    });

    it('should remove connection successfully', async () => {
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };

      await connectionsInvitationsController.removeConnection(mockRequest, mockResponse, mockNext);

      expect(mockConnectionsServices.features.invitations.removeConnection).toHaveBeenCalledWith(
        'brand-id-123',
        'manufacturer-id-123'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getRecentActivity', () => {
    const mockActivity = [
      { id: 'activity-id-1', type: 'invitation_sent' },
      { id: 'activity-id-2', type: 'invitation_accepted' },
    ];

    beforeEach(() => {
      (mockConnectionsServices.features.invitations.getRecentActivity as jest.Mock).mockResolvedValue(mockActivity);
    });

    it('should retrieve recent activity', async () => {
      mockRequest.validatedQuery = {
        entityType: 'brand',
        limit: 10,
      };

      await connectionsInvitationsController.getRecentActivity(mockRequest, mockResponse, mockNext);

      expect(mockConnectionsServices.features.invitations.getRecentActivity).toHaveBeenCalledWith(
        'brand-id-123',
        'brand',
        10
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('Error Handling', () => {
    it('should propagate service errors correctly', async () => {
      const serviceError = {
        statusCode: 500,
        message: 'Invitations service unavailable',
      };
      (mockConnectionsServices.features.invitations.sendInvite as jest.Mock).mockRejectedValue(serviceError);

      (mockConnectionsServices.validation.invitation.validateCreateInvitation as jest.Mock).mockReturnValue({
        isValid: true,
      });

      mockRequest.validatedBody = {
        manufacturerId: 'manufacturer-id-123',
      };

      await connectionsInvitationsController.sendInvitation(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('Performance Tracking', () => {
    it('should record performance metrics', async () => {
      (mockConnectionsServices.validation.invitation.validateCreateInvitation as jest.Mock).mockReturnValue({
        isValid: true,
      });
      (mockConnectionsServices.features.invitations.sendInvite as jest.Mock).mockResolvedValue({});
      (mockConnectionsServices.utils.helpers.mapInvitationToSummary as jest.Mock).mockReturnValue({});

      mockRequest.validatedBody = {
        manufacturerId: 'manufacturer-id-123',
      };

      await connectionsInvitationsController.sendInvitation(mockRequest, mockResponse, mockNext);

      expect((connectionsInvitationsController as any).recordPerformance).toHaveBeenCalledWith(
        mockRequest,
        'SEND_INVITATION'
      );
    });
  });
});

