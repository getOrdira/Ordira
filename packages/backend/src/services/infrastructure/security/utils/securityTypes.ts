export type SecurityActorType = 'business' | 'user' | 'manufacturer';

export enum SecurityEventType {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  PASSWORD_RESET = 'PASSWORD_RESET',
  TOKEN_REFRESH = 'TOKEN_REFRESH',
  TOKEN_INVALIDATED = 'TOKEN_INVALIDATED',
  SESSION_REVOKED = 'SESSION_REVOKED',
  ALL_SESSIONS_REVOKED = 'ALL_SESSIONS_REVOKED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_UNLOCKED = 'ACCOUNT_UNLOCKED',
  EMAIL_VERIFIED = 'EMAIL_VERIFIED',
  PHONE_VERIFIED = 'PHONE_VERIFIED',
  TWO_FACTOR_ENABLED = 'TWO_FACTOR_ENABLED',
  TWO_FACTOR_DISABLED = 'TWO_FACTOR_DISABLED',
  API_KEY_CREATED = 'API_KEY_CREATED',
  API_KEY_REVOKED = 'API_KEY_REVOKED',
  SECURITY_SETTINGS_CHANGED = 'SECURITY_SETTINGS_CHANGED'
}

export enum SecuritySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface SecurityEvent {
  eventType: SecurityEventType;
  userId: string;
  userType: SecurityActorType;
  severity: SecuritySeverity;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
  sessionId?: string;
  tokenId?: string;
  additionalData?: Record<string, unknown>;
  timestamp: Date;
  expiresAt?: Date;
}

export type SecurityEventCreateInput = Omit<SecurityEvent, 'timestamp'> & { timestamp?: Date };

export interface SessionInfo {
  sessionId: string;
  userId: string;
  userType: SecurityActorType;
  tokenId: string;
  ipAddress: string;
  userAgent: string;
  deviceFingerprint?: string;
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
  isActive: boolean;
}

export type SessionCreateInput = Omit<SessionInfo, 'sessionId' | 'createdAt' | 'lastActivity' | 'isActive'> & {
  sessionId?: string;
  createdAt?: Date;
  lastActivity?: Date;
  isActive?: boolean;
};

export interface TokenBlacklistEntry {
  tokenId: string;
  userId: string;
  tokenHash: string;
  reason: string;
  blacklistedAt: Date;
  expiresAt: Date;
}

export interface SuspiciousActivityContext {
  failedLogins: number;
  uniqueIpCount: number;
  recentSessions: number;
}

export interface SecurityAuditSummary {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  recentActivity: SecurityEvent[];
  riskScore: number;
}

export interface SystemSecurityMetrics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  topUsersByEvents: Array<{ userId: string; eventCount: number }>;
  suspiciousActivityCount: number;
}

// Security Scanning Types
export type SecurityVulnerabilityType = 
  | 'sql_injection' 
  | 'xss' 
  | 'csrf' 
  | 'insecure_direct_object_reference' 
  | 'security_misconfiguration' 
  | 'sensitive_data_exposure' 
  | 'missing_function_level_access_control' 
  | 'known_vulnerable_components' 
  | 'unvalidated_redirects_forwards' 
  | 'other';

export interface SecurityVulnerability {
  id: string;
  type: SecurityVulnerabilityType;
  severity: SecuritySeverity;
  title: string;
  description: string;
  recommendation: string;
  detectedAt: Date;
  resolved?: Date;
  metadata?: Record<string, any>;
}

export interface SecurityScanResult {
  scanId: string;
  timestamp: Date;
  vulnerabilities: SecurityVulnerability[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  status: 'completed' | 'failed' | 'in_progress';
}

export interface SecurityScanMetrics {
  totalScans: number;
  vulnerabilitiesFound: number;
  vulnerabilitiesResolved: number;
  averageScanTime: number;
  lastScanDate?: Date;
  riskScore: number; // 0-100, lower is better
}

export type SecurityVulnerabilityCreateInput = Omit<SecurityVulnerability, 'id' | 'detectedAt'> & {
  id?: string;
  detectedAt?: Date;
};

export type SecurityScanResultCreateInput = Omit<SecurityScanResult, 'scanId' | 'timestamp'> & {
  scanId?: string;
  timestamp?: Date;
};



