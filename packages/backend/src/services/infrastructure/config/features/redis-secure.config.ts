/**
 * Redis Cluster Configuration - SECURITY HARDENED
 *
 * Provides security-hardened configuration templates for Redis cluster setup.
 * This file contains recommended configurations for different environments with security best practices.
 */

import * as crypto from 'crypto';

// Security helper functions
const getSecurePassword = (): string | undefined => {
  // If REDIS_URL is set, password is embedded in the URL, so we don't need REDIS_PASSWORD
  if (process.env.REDIS_URL) {
    return undefined;
  }

  const password = process.env.REDIS_PASSWORD;
  if (!password) {
    throw new Error('REDIS_PASSWORD environment variable is required when not using REDIS_URL');
  }
  return password;
};

const getTLSConfig = (): { tls?: any } => {
  // Only configure TLS if explicitly enabled
  if (process.env.REDIS_TLS !== 'true') {
    return {};
  }

  if (!process.env.REDIS_CA_CERT) {
    throw new Error('REDIS_CA_CERT environment variable is required when REDIS_TLS=true');
  }

  return {
    tls: {
      rejectUnauthorized: true,
      ca: process.env.REDIS_CA_CERT,
      cert: process.env.REDIS_CLIENT_CERT,
      key: process.env.REDIS_CLIENT_KEY
    }
  };
};

export interface RedisSecureEnvironmentConfig {
  development: {
    nodes: Array<{ host: string; port: number }>;
    options: any;
    description: string;
  };
  staging: {
    nodes: Array<{ host: string; port: number }>;
    options: any;
    description: string;
  };
  production: {
    nodes: Array<{ host: string; port: number }>;
    options: any;
    description: string;
  };
}

/**
 * Security-hardened Redis Cluster configuration for different environments
 */
export const secureRedisClusterConfigs: RedisSecureEnvironmentConfig = {
  development: {
    description: "Single Redis instance for development - Security Enabled",
    nodes: [
      { host: 'localhost', port: 6379 }
    ],
    options: {
      enableReadyCheck: false,
      redisOptions: {
        connectTimeout: 10000,
        lazyConnect: true,
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 100,
        ...(getSecurePassword() ? { password: getSecurePassword() } : {}),
        commandTimeout: 5000,
        ...getTLSConfig()
      },
      enableOfflineQueue: true,
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100
    }
  },

  staging: {
    description: "Redis cluster with 3 nodes for staging - Security Hardened",
    nodes: [
      { host: 'redis-staging-1', port: 6379 },
      { host: 'redis-staging-2', port: 6379 },
      { host: 'redis-staging-3', port: 6379 }
    ],
    options: {
      enableReadyCheck: false,
      redisOptions: {
        connectTimeout: 10000,
        lazyConnect: true,
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 100,
        ...(getSecurePassword() ? { password: getSecurePassword() } : {}),
        commandTimeout: 5000,
        ...getTLSConfig()
      },
      clusterRetryDelayOnFailover: 100,
      clusterRetryDelayOnClusterDown: 300,
      clusterMaxRedirections: 16,
      scaleReads: 'slave',
      enableOfflineQueue: false,
      maxRetriesPerRequest: 2,
      retryDelayOnFailover: 100
    }
  },

  production: {
    description: "High-availability Redis cluster for production - Maximum Security",
    nodes: [
      { host: 'redis-prod-1', port: 6379 },
      { host: 'redis-prod-2', port: 6379 },
      { host: 'redis-prod-3', port: 6379 },
      { host: 'redis-prod-4', port: 6379 },
      { host: 'redis-prod-5', port: 6379 },
      { host: 'redis-prod-6', port: 6379 }
    ],
    options: {
      enableReadyCheck: false,
      redisOptions: {
        connectTimeout: 5000,
        lazyConnect: true,
        maxRetriesPerRequest: 2,
        retryDelayOnFailover: 50,
        ...(getSecurePassword() ? { password: getSecurePassword() } : {}),
        commandTimeout: 3000,
        ...getTLSConfig(),
        // Security hardening
        keepAlive: 30000,
        family: 4, // Force IPv4
        db: 0 // Ensure we're using default DB
      },
      clusterRetryDelayOnFailover: 50,
      clusterRetryDelayOnClusterDown: 200,
      clusterMaxRedirections: 5, // Reduced for security
      scaleReads: 'slave',
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1, // Fail fast in production
      retryDelayOnFailover: 50,
      // Security: Disable automatic reconnection to prevent connection loops
      lazyConnect: true,
      natMap: {
        // NAT mapping for cloud deployments
        // '10.0.0.1:6379': { host: 'redis-prod-1.example.com', port: 6379 }
      }
    }
  }
};

/**
 * Security-hardened Docker Compose configuration for Redis cluster
 */
export const secureDockerComposeRedisCluster = `
version: '3.8'

services:
  redis-node-1:
    image: redis:7-alpine
    command: >
      redis-server
      --cluster-enabled yes
      --cluster-config-file nodes.conf
      --cluster-node-timeout 5000
      --appendonly yes
      --port 6379
      --requirepass "\${REDIS_PASSWORD}"
      --masterauth "\${REDIS_PASSWORD}"
      --protected-mode yes
      --bind 0.0.0.0
      --maxclients 1000
      --timeout 300
      --tcp-keepalive 300
      --rename-command FLUSHDB ""
      --rename-command FLUSHALL ""
      --rename-command DEBUG ""
      --rename-command CONFIG "CONFIG_9f2c4e07-4a5d-4b8f-9c7e-8f1a2b3c4d5e"
    environment:
      - REDIS_PASSWORD=\${REDIS_PASSWORD}
    ports:
      - "6379:6379"
      - "16379:16379"
    volumes:
      - redis-node-1-data:/data
    networks:
      - redis-cluster

  redis-node-2:
    image: redis:7-alpine
    command: >
      redis-server
      --cluster-enabled yes
      --cluster-config-file nodes.conf
      --cluster-node-timeout 5000
      --appendonly yes
      --port 6379
      --requirepass "\${REDIS_PASSWORD}"
      --masterauth "\${REDIS_PASSWORD}"
      --protected-mode yes
      --bind 0.0.0.0
      --maxclients 1000
      --timeout 300
      --tcp-keepalive 300
      --rename-command FLUSHDB ""
      --rename-command FLUSHALL ""
      --rename-command DEBUG ""
      --rename-command CONFIG "CONFIG_9f2c4e07-4a5d-4b8f-9c7e-8f1a2b3c4d5e"
    environment:
      - REDIS_PASSWORD=\${REDIS_PASSWORD}
    ports:
      - "6380:6379"
      - "16380:16379"
    volumes:
      - redis-node-2-data:/data
    networks:
      - redis-cluster

volumes:
  redis-node-1-data:
  redis-node-2-data:

networks:
  redis-cluster:
    driver: bridge
`;

/**
 * Security-hardened Kubernetes configuration for Redis cluster
 */
export const secureKubernetesRedisCluster = `
apiVersion: v1
kind: Secret
metadata:
  name: redis-password
type: Opaque
data:
  password: # Base64 encoded password

---
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-cluster-config
data:
  redis.conf: |
    cluster-enabled yes
    cluster-config-file /data/nodes.conf
    cluster-node-timeout 5000
    appendonly yes
    protected-mode yes
    bind 0.0.0.0
    port 6379
    requirepass "\${REDIS_PASSWORD}"
    masterauth "\${REDIS_PASSWORD}"
    maxclients 1000
    timeout 300
    tcp-keepalive 300
    # Security hardening
    rename-command FLUSHDB ""
    rename-command FLUSHALL ""
    rename-command DEBUG ""
    rename-command CONFIG "CONFIG_9f2c4e07-4a5d-4b8f-9c7e-8f1a2b3c4d5e"

---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-cluster
spec:
  serviceName: redis-cluster-service
  replicas: 6
  selector:
    matchLabels:
      app: redis-cluster
  template:
    metadata:
      labels:
        app: redis-cluster
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        command: ["redis-server"]
        args: ["/etc/redis/redis.conf"]
        env:
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: redis-password
              key: password
        ports:
        - containerPort: 6379
          name: redis
        - containerPort: 16379
          name: cluster
        volumeMounts:
        - name: data
          mountPath: /data
        - name: config
          mountPath: /etc/redis
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          runAsNonRoot: true
          runAsUser: 1000
      volumes:
      - name: config
        configMap:
          name: redis-cluster-config
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: "10Gi"
`;

/**
 * Security-hardened AWS ElastiCache Redis cluster configuration
 */
export const secureAwsElastiCacheConfig = {
  description: "AWS ElastiCache Redis cluster configuration - Security Hardened",
  cloudFormationTemplate: `
AWSTemplateFormatVersion: '2010-09-09'
Description: 'Security-hardened Redis Cluster for high-performance caching'

Parameters:
  VpcId:
    Type: AWS::EC2::VPC::Id
    Description: VPC ID where the cluster will be deployed

  SubnetIds:
    Type: List<AWS::EC2::Subnet::Id>
    Description: Subnet IDs for the cluster

Resources:
  RedisAuthToken:
    Type: AWS::SecretsManager::Secret
    Properties:
      Description: Redis authentication token
      GenerateSecretString:
        SecretStringTemplate: '{}'
        GenerateStringKey: 'password'
        PasswordLength: 32
        ExcludeCharacters: '"@/\\'

  RedisKMSKey:
    Type: AWS::KMS::Key
    Properties:
      Description: KMS key for Redis encryption
      KeyPolicy:
        Statement:
          - Effect: Allow
            Principal:
              AWS: !Sub 'arn:aws:iam::\${AWS::AccountId}:root'
            Action: 'kms:*'
            Resource: '*'

  RedisLogGroup:
    Type: AWS::Logs::LogGroup
    Properties:
      LogGroupName: !Sub '/aws/elasticache/\${AWS::StackName}'
      RetentionInDays: 30

  RedisSubnetGroup:
    Type: AWS::ElastiCache::SubnetGroup
    Properties:
      Description: Subnet group for Redis cluster
      SubnetIds: !Ref SubnetIds

  RedisCluster:
    Type: AWS::ElastiCache::ReplicationGroup
    Properties:
      ReplicationGroupDescription: Security-hardened Redis cluster
      NumCacheClusters: 6
      Engine: redis
      CacheNodeType: cache.r6g.large
      SecurityGroupIds:
        - !Ref RedisSecurityGroup
      CacheSubnetGroupName: !Ref RedisSubnetGroup
      Port: 6379
      AtRestEncryptionEnabled: true
      TransitEncryptionEnabled: true
      MultiAZEnabled: true
      AutomaticFailoverEnabled: true
      AuthToken: !Ref RedisAuthToken
      KmsKeyId: !Ref RedisKMSKey
      LogDeliveryConfigurations:
        - DestinationType: cloudwatch-logs
          DestinationDetails:
            LogGroup: !Ref RedisLogGroup
          LogFormat: json
          LogType: slow-log

  RedisSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Security group for Redis cluster
      VpcId: !Ref VpcId
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 6379
          ToPort: 6379
          SourceSecurityGroupId: !Ref ApplicationSecurityGroup

  ApplicationSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Security group for applications accessing Redis
      VpcId: !Ref VpcId

Outputs:
  RedisEndpoint:
    Description: Redis cluster endpoint
    Value: !GetAtt RedisCluster.RedisEndpoint.Address
    Export:
      Name: !Sub '\${AWS::StackName}-RedisEndpoint'

  RedisAuthToken:
    Description: Redis authentication token (SecretARN)
    Value: !Ref RedisAuthToken
    Export:
      Name: !Sub '\${AWS::StackName}-RedisAuthToken'
  `,

  environmentVariables: `
# Add these to your environment variables (SECURITY HARDENED)
REDIS_CLUSTER_NODES=your-cluster.cache.amazonaws.com:6379
REDIS_PASSWORD=your-secure-auth-token-from-secrets-manager
REDIS_TLS=true
REDIS_CA_CERT=/path/to/ca-cert.pem
REDIS_CLIENT_CERT=/path/to/client-cert.pem
REDIS_CLIENT_KEY=/path/to/client-key.pem
# Security: Connection timeout and retry settings
REDIS_CONNECT_TIMEOUT=5000
REDIS_COMMAND_TIMEOUT=3000
REDIS_MAX_RETRIES=2
  `
};

/**
 * Get secure Redis cluster configuration based on environment
 */
export function getSecureRedisClusterConfig(environment: keyof RedisSecureEnvironmentConfig) {
  return secureRedisClusterConfigs[environment];
}

/**
 * Validate Redis connection security
 * Only validates TLS if REDIS_TLS is explicitly set to 'true'
 * If REDIS_URL is set, password is embedded in URL and REDIS_PASSWORD is not required
 */
export function validateRedisSecurityConfig() {
  // If REDIS_URL is set, password is embedded in the URL, so we don't need REDIS_PASSWORD
  if (!process.env.REDIS_URL) {
    const requiredVars = ['REDIS_PASSWORD'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      throw new Error(`Missing required Redis security environment variables: ${missingVars.join(', ')}`);
    }
  }

  // Only validate TLS if explicitly enabled
  if (process.env.REDIS_TLS === 'true') {
    const tlsVars = ['REDIS_CA_CERT'];
    const missingTlsVars = tlsVars.filter(varName => !process.env[varName]);

    if (missingTlsVars.length > 0) {
      throw new Error(`Missing required Redis TLS variables: ${missingTlsVars.join(', ')}`);
    }
  }

  return true;
}

/**
 * Security-hardened health check configuration
 */
export const secureHealthCheckConfig = {
  http: {
    path: '/health/redis',
    port: 3000,
    interval: 30,
    timeout: 5,
    healthyThreshold: 2,
    unhealthyThreshold: 3
  },

  redis: {
    command: 'PING',
    expectedResponse: 'PONG',
    timeout: 1000,
    interval: 10000,
    // Security: Limit auth attempts
    maxAuthAttempts: 3,
    authTimeout: 5000
  }
};

