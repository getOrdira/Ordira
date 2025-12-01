// src/services/collaboration/core/realTimeCollaboration.service.ts

import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { Types } from 'mongoose';
import { authService } from '../../auth';
import { connectionValidationService } from './connectionValidation.service';
import { Workspace } from '../../../models/collaboration/workspace.model';
import { logger } from '../../../utils/logger';

/**
 * Real-Time Collaboration Event Types
 */
export enum CollaborationEventType {
  // Production Updates
  PRODUCTION_UPDATE_CREATED = 'production:update:created',
  PRODUCTION_UPDATE_VIEWED = 'production:update:viewed',
  PRODUCTION_UPDATE_COMMENTED = 'production:update:commented',

  // File Management
  FILE_UPLOADED = 'file:uploaded',
  FILE_VERSION_CREATED = 'file:version:created',
  FILE_ANNOTATED = 'file:annotated',
  FILE_APPROVED = 'file:approved',
  FILE_REJECTED = 'file:rejected',
  FILE_DELETED = 'file:deleted',

  // Task Management
  TASK_CREATED = 'task:created',
  TASK_UPDATED = 'task:updated',
  TASK_ASSIGNED = 'task:assigned',
  TASK_COMMENTED = 'task:commented',
  TASK_RESOLVED = 'task:resolved',
  TASK_STATUS_CHANGED = 'task:status:changed',
  CHECKLIST_ITEM_TOGGLED = 'task:checklist:toggled',

  // Workspace Activity
  WORKSPACE_MEMBER_JOINED = 'workspace:member:joined',
  WORKSPACE_MEMBER_LEFT = 'workspace:member:left',
  WORKSPACE_UPDATED = 'workspace:updated',
  WORKSPACE_ARCHIVED = 'workspace:archived',

  // User Presence
  USER_ONLINE = 'user:online',
  USER_OFFLINE = 'user:offline',
  USER_TYPING = 'user:typing',
  USER_VIEWING = 'user:viewing'
}

/**
 * Collaboration Event Payload
 */
export interface ICollaborationEvent {
  type: CollaborationEventType;
  workspaceId: string;
  userId: string;
  userType: 'brand' | 'manufacturer';
  data: any;
  timestamp: Date;
}

/**
 * Socket Authentication Data
 */
export interface ISocketAuthData {
  userId: string;
  userType: 'brand' | 'manufacturer';
  businessId?: string;
  manufacturerId?: string;
  email?: string;
}

/**
 * Workspace Room Data
 */
interface IWorkspaceRoom {
  workspaceId: string;
  connectedUsers: Map<string, ISocketAuthData>;
  lastActivity: Date;
}

/**
 * Real-Time Collaboration Service
 * Handles WebSocket connections and real-time event broadcasting
 */
export class RealTimeCollaborationService {
  private io: SocketIOServer | null = null;
  private workspaceRooms: Map<string, IWorkspaceRoom> = new Map();
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set of socket IDs

  /**
   * Initialize Socket.io server
   */
  public initialize(httpServer: HTTPServer): void {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.setupMiddleware();
    this.setupConnectionHandlers();

    logger.info('Real-time collaboration service initialized', {
      service: 'RealTimeCollaboration'
    });
  }

  /**
   * Setup Socket.io middleware for authentication
   */
  private setupMiddleware(): void {
    if (!this.io) return;

    this.io.use(async (socket: Socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

        if (!token) {
          return next(new Error('Authentication token required'));
        }

        // Verify JWT token
        const decoded = await authService.verifyToken(token, { includeUserData: true });

        if (!decoded || !decoded.sub) {
          return next(new Error('Invalid authentication token'));
        }

        // Map auth service response to socket auth data format
        const userData = decoded.userData || {};
        const userType = decoded.type === 'business' ? 'brand' : (decoded.type === 'manufacturer' ? 'manufacturer' : 'brand');

        // Attach auth data to socket
        socket.data.auth = {
          userId: decoded.sub,
          userType: userType,
          businessId: decoded.type === 'business' ? decoded.sub : userData.businessId,
          manufacturerId: decoded.type === 'manufacturer' ? decoded.sub : userData.manufacturerId,
          email: decoded.email
        } as ISocketAuthData;

        logger.info('Socket authenticated', {
          socketId: socket.id,
          userId: decoded.sub,
          userType: userType
        });

        next();
      } catch (error) {
        logger.error('Socket authentication failed', {
          socketId: socket.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        next(new Error('Authentication failed'));
      }
    });
  }

  /**
   * Setup connection event handlers
   */
  private setupConnectionHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket: Socket) => {
      const authData: ISocketAuthData = socket.data.auth;

      logger.info('Client connected', {
        socketId: socket.id,
        userId: authData.userId,
        userType: authData.userType
      });

      // Track user socket
      this.trackUserSocket(authData.userId, socket.id);

      // Handle workspace join
      socket.on('workspace:join', async (workspaceId: string) => {
        await this.handleWorkspaceJoin(socket, workspaceId);
      });

      // Handle workspace leave
      socket.on('workspace:leave', async (workspaceId: string) => {
        await this.handleWorkspaceLeave(socket, workspaceId);
      });

      // Handle user typing indicator
      socket.on('user:typing', (data: { workspaceId: string; isTyping: boolean }) => {
        this.broadcastToWorkspace(data.workspaceId, CollaborationEventType.USER_TYPING, {
          userId: authData.userId,
          userType: authData.userType,
          isTyping: data.isTyping
        }, socket.id);
      });

      // Handle user viewing indicator
      socket.on('user:viewing', (data: { workspaceId: string; entityType: string; entityId: string }) => {
        this.broadcastToWorkspace(data.workspaceId, CollaborationEventType.USER_VIEWING, {
          userId: authData.userId,
          userType: authData.userType,
          entityType: data.entityType,
          entityId: data.entityId
        }, socket.id);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  /**
   * Handle workspace join
   */
  private async handleWorkspaceJoin(socket: Socket, workspaceId: string): Promise<void> {
    try {
      const authData: ISocketAuthData = socket.data.auth;

      // Verify workspace exists
      const workspace = await Workspace.findOne({ workspaceId });

      if (!workspace) {
        socket.emit('error', { message: 'Workspace not found' });
        return;
      }

      // Verify user has access to workspace
      const hasAccess = this.verifyWorkspaceAccess(workspace, authData);

      if (!hasAccess) {
        socket.emit('error', { message: 'Access denied to workspace' });
        return;
      }

      // Join socket room
      const roomName = `workspace:${workspaceId}`;
      await socket.join(roomName);

      // Track workspace room
      if (!this.workspaceRooms.has(workspaceId)) {
        this.workspaceRooms.set(workspaceId, {
          workspaceId,
          connectedUsers: new Map(),
          lastActivity: new Date()
        });
      }

      const room = this.workspaceRooms.get(workspaceId)!;
      room.connectedUsers.set(authData.userId, authData);
      room.lastActivity = new Date();

      // Notify other users
      this.broadcastToWorkspace(workspaceId, CollaborationEventType.USER_ONLINE, {
        userId: authData.userId,
        userType: authData.userType
      }, socket.id);

      // Send current online users to the joining user
      const onlineUsers = Array.from(room.connectedUsers.values());
      socket.emit('workspace:users:online', onlineUsers);

      logger.info('User joined workspace', {
        socketId: socket.id,
        workspaceId,
        userId: authData.userId,
        onlineCount: room.connectedUsers.size
      });
    } catch (error) {
      logger.error('Failed to join workspace', {
        socketId: socket.id,
        workspaceId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      socket.emit('error', { message: 'Failed to join workspace' });
    }
  }

  /**
   * Handle workspace leave
   */
  private async handleWorkspaceLeave(socket: Socket, workspaceId: string): Promise<void> {
    try {
      const authData: ISocketAuthData = socket.data.auth;
      const roomName = `workspace:${workspaceId}`;

      await socket.leave(roomName);

      const room = this.workspaceRooms.get(workspaceId);
      if (room) {
        room.connectedUsers.delete(authData.userId);

        // Notify other users
        this.broadcastToWorkspace(workspaceId, CollaborationEventType.USER_OFFLINE, {
          userId: authData.userId,
          userType: authData.userType
        }, socket.id);

        // Clean up empty room
        if (room.connectedUsers.size === 0) {
          this.workspaceRooms.delete(workspaceId);
        }
      }

      logger.info('User left workspace', {
        socketId: socket.id,
        workspaceId,
        userId: authData.userId
      });
    } catch (error) {
      logger.error('Failed to leave workspace', {
        socketId: socket.id,
        workspaceId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Handle socket disconnect
   */
  private handleDisconnect(socket: Socket): void {
    const authData: ISocketAuthData = socket.data.auth;

    logger.info('Client disconnected', {
      socketId: socket.id,
      userId: authData.userId
    });

    // Remove from user sockets tracking
    this.untrackUserSocket(authData.userId, socket.id);

    // Remove from all workspace rooms
    for (const [workspaceId, room] of this.workspaceRooms.entries()) {
      if (room.connectedUsers.has(authData.userId)) {
        room.connectedUsers.delete(authData.userId);

        // Notify other users
        this.broadcastToWorkspace(workspaceId, CollaborationEventType.USER_OFFLINE, {
          userId: authData.userId,
          userType: authData.userType
        }, socket.id);

        // Clean up empty room
        if (room.connectedUsers.size === 0) {
          this.workspaceRooms.delete(workspaceId);
        }
      }
    }
  }

  /**
   * Verify user has access to workspace
   */
  private verifyWorkspaceAccess(workspace: any, authData: ISocketAuthData): boolean {
    const isBrandMember = workspace.brandMembers.some(
      (m: any) => m.userId.toString() === authData.userId
    );

    const isManufacturerMember = workspace.manufacturerMembers.some(
      (m: any) => m.userId.toString() === authData.userId
    );

    return isBrandMember || isManufacturerMember;
  }

  /**
   * Track user socket connection
   */
  private trackUserSocket(userId: string, socketId: string): void {
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socketId);
  }

  /**
   * Untrack user socket connection
   */
  private untrackUserSocket(userId: string, socketId: string): void {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }
  }

  /**
   * Broadcast event to workspace room
   */
  public broadcastToWorkspace(
    workspaceId: string,
    eventType: CollaborationEventType,
    data: any,
    excludeSocketId?: string
  ): void {
    if (!this.io) return;

    const roomName = `workspace:${workspaceId}`;
    const event: ICollaborationEvent = {
      type: eventType,
      workspaceId,
      userId: data.userId || 'system',
      userType: data.userType || 'brand',
      data,
      timestamp: new Date()
    };

    if (excludeSocketId) {
      this.io.to(roomName).except(excludeSocketId).emit('collaboration:event', event);
    } else {
      this.io.to(roomName).emit('collaboration:event', event);
    }

    logger.debug('Event broadcasted to workspace', {
      workspaceId,
      eventType,
      excludeSocketId: excludeSocketId || 'none'
    });
  }

  /**
   * Broadcast event to specific user (all their sockets)
   */
  public broadcastToUser(userId: string, eventType: CollaborationEventType, data: any): void {
    if (!this.io) return;

    const socketIds = this.userSockets.get(userId);
    if (!socketIds || socketIds.size === 0) return;

    const event: ICollaborationEvent = {
      type: eventType,
      workspaceId: data.workspaceId || '',
      userId,
      userType: data.userType || 'brand',
      data,
      timestamp: new Date()
    };

    for (const socketId of socketIds) {
      this.io.to(socketId).emit('collaboration:event', event);
    }

    logger.debug('Event broadcasted to user', {
      userId,
      eventType,
      socketCount: socketIds.size
    });
  }

  /**
   * Get online users in workspace
   */
  public getWorkspaceOnlineUsers(workspaceId: string): ISocketAuthData[] {
    const room = this.workspaceRooms.get(workspaceId);
    if (!room) return [];

    return Array.from(room.connectedUsers.values());
  }

  /**
   * Check if user is online
   */
  public isUserOnline(userId: string): boolean {
    const sockets = this.userSockets.get(userId);
    return sockets ? sockets.size > 0 : false;
  }

  /**
   * Get workspace room statistics
   */
  public getWorkspaceStats(workspaceId: string): any {
    const room = this.workspaceRooms.get(workspaceId);
    if (!room) {
      return {
        workspaceId,
        isActive: false,
        onlineCount: 0,
        lastActivity: null
      };
    }

    return {
      workspaceId,
      isActive: true,
      onlineCount: room.connectedUsers.size,
      onlineUsers: Array.from(room.connectedUsers.keys()),
      lastActivity: room.lastActivity
    };
  }

  /**
   * Get all active workspaces
   */
  public getActiveWorkspaces(): string[] {
    return Array.from(this.workspaceRooms.keys());
  }

  /**
   * Clean up inactive rooms (called periodically)
   */
  public cleanupInactiveRooms(inactiveThresholdMinutes: number = 60): void {
    const threshold = new Date(Date.now() - inactiveThresholdMinutes * 60 * 1000);

    for (const [workspaceId, room] of this.workspaceRooms.entries()) {
      if (room.connectedUsers.size === 0 || room.lastActivity < threshold) {
        this.workspaceRooms.delete(workspaceId);
        logger.info('Cleaned up inactive workspace room', {
          workspaceId,
          lastActivity: room.lastActivity
        });
      }
    }
  }
}

// Export singleton instance
export const realTimeCollaborationService = new RealTimeCollaborationService();
