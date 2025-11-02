/**
 * Redis Cluster Configuration
 *
 * Provides configuration templates and best practices for Redis cluster setup.
 * This file contains recommended configurations for different environments.
 */

export interface RedisClusterEnvironmentConfig {
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
 * Redis Cluster configuration for different environments
 */
export const redisClusterConfigs: RedisClusterEnvironmentConfig = {
  development: {
    description: "Single Redis instance for development",
    nodes: [
      { host: 'localhost', port: 6379 }
    ],
    options: {
      enableReadyCheck: false,
      redisOptions: {
        connectTimeout: 10000,
        lazyConnect: true,
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 100
      },
      enableOfflineQueue: true
    }
  },

  staging: {
    description: "Redis cluster with 3 nodes for staging",
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
        retryDelayOnFailover: 100
      },
      clusterRetryDelayOnFailover: 100,
      clusterRetryDelayOnClusterDown: 300,
      clusterMaxRedirections: 16,
      scaleReads: 'slave',
      enableOfflineQueue: false
    }
  },

  production: {
    description: "High-availability Redis cluster for production",
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
        password: process.env.REDIS_PASSWORD
      },
      clusterRetryDelayOnFailover: 50,
      clusterRetryDelayOnClusterDown: 200,
      clusterMaxRedirections: 10,
      scaleReads: 'slave',
      enableOfflineQueue: false,
      natMap: {
        // NAT mapping for cloud deployments
        // '10.0.0.1:6379': { host: 'redis-prod-1.example.com', port: 6379 }
      }
    }
  }
};

/**
 * Docker Compose configuration for Redis cluster
 */
export const dockerComposeRedisCluster = `
version: '3.8'

services:
  redis-node-1:
    image: redis:7-alpine
    command: redis-server --cluster-enabled yes --cluster-config-file nodes.conf --cluster-node-timeout 5000 --appendonly yes --port 6379
    ports:
      - "6379:6379"
      - "16379:16379"
    volumes:
      - redis-node-1-data:/data
    networks:
      - redis-cluster

  redis-node-2:
    image: redis:7-alpine
    command: redis-server --cluster-enabled yes --cluster-config-file nodes.conf --cluster-node-timeout 5000 --appendonly yes --port 6379
    ports:
      - "6380:6379"
      - "16380:16379"
    volumes:
      - redis-node-2-data:/data
    networks:
      - redis-cluster

  redis-node-3:
    image: redis:7-alpine
    command: redis-server --cluster-enabled yes --cluster-config-file nodes.conf --cluster-node-timeout 5000 --appendonly yes --port 6379
    ports:
      - "6381:6379"
      - "16381:16379"
    volumes:
      - redis-node-3-data:/data
    networks:
      - redis-cluster

  redis-node-4:
    image: redis:7-alpine
    command: redis-server --cluster-enabled yes --cluster-config-file nodes.conf --cluster-node-timeout 5000 --appendonly yes --port 6379
    ports:
      - "6382:6379"
      - "16382:16379"
    volumes:
      - redis-node-4-data:/data
    networks:
      - redis-cluster

  redis-node-5:
    image: redis:7-alpine
    command: redis-server --cluster-enabled yes --cluster-config-file nodes.conf --cluster-node-timeout 5000 --appendonly yes --port 6379
    ports:
      - "6383:6379"
      - "16383:16379"
    volumes:
      - redis-node-5-data:/data
    networks:
      - redis-cluster

  redis-node-6:
    image: redis:7-alpine
    command: redis-server --cluster-enabled yes --cluster-config-file nodes.conf --cluster-node-timeout 5000 --appendonly yes --port 6379
    ports:
      - "6384:6379"
      - "16384:16379"
    volumes:
      - redis-node-6-data:/data
    networks:
      - redis-cluster

  redis-cluster-init:
    image: redis:7-alpine
    depends_on:
      - redis-node-1
      - redis-node-2
      - redis-node-3
      - redis-node-4
      - redis-node-5
      - redis-node-6
    command: >
      sh -c "
        sleep 10 &&
        redis-cli --cluster create \\
          redis-node-1:6379 \\
          redis-node-2:6379 \\
          redis-node-3:6379 \\
          redis-node-4:6379 \\
          redis-node-5:6379 \\
          redis-node-6:6379 \\
          --cluster-replicas 1 \\
          --cluster-yes
      "
    networks:
      - redis-cluster

volumes:
  redis-node-1-data:
  redis-node-2-data:
  redis-node-3-data:
  redis-node-4-data:
  redis-node-5-data:
  redis-node-6-data:

networks:
  redis-cluster:
    driver: bridge
`;

/**
 * Kubernetes configuration for Redis cluster
 */
export const kubernetesRedisCluster = `
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
    protected-mode no
    bind 0.0.0.0
    port 6379

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

---
apiVersion: v1
kind: Service
metadata:
  name: redis-cluster-service
spec:
  clusterIP: None
  selector:
    app: redis-cluster
  ports:
  - port: 6379
    targetPort: 6379
    name: redis
  - port: 16379
    targetPort: 16379
    name: cluster
`;

/**
 * AWS ElastiCache Redis cluster configuration
 */
export const awsElastiCacheConfig = {
  description: "AWS ElastiCache Redis cluster configuration",
  cloudFormationTemplate: `
AWSTemplateFormatVersion: '2010-09-09'
Description: 'Redis Cluster for high-performance caching'

Parameters:
  VpcId:
    Type: AWS::EC2::VPC::Id
    Description: VPC ID where the cluster will be deployed

  SubnetIds:
    Type: List<AWS::EC2::Subnet::Id>
    Description: Subnet IDs for the cluster

Resources:
  RedisSubnetGroup:
    Type: AWS::ElastiCache::SubnetGroup
    Properties:
      Description: Subnet group for Redis cluster
      SubnetIds: !Ref SubnetIds

  RedisCluster:
    Type: AWS::ElastiCache::ReplicationGroup
    Properties:
      ReplicationGroupDescription: High-performance Redis cluster
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
  `,

  environmentVariables: `
# Add these to your environment variables
REDIS_CLUSTER_NODES=your-cluster.cache.amazonaws.com:6379
REDIS_PASSWORD=your-auth-token
REDIS_TLS=true
  `
};

/**
 * Get Redis cluster configuration based on environment
 */
export function getRedisClusterConfig(environment: keyof RedisClusterEnvironmentConfig) {
  return redisClusterConfigs[environment];
}

/**
 * Generate Redis cluster setup script
 */
export function generateSetupScript(environment: keyof RedisClusterEnvironmentConfig): string {
  const config = redisClusterConfigs[environment];
  const nodeUrls = config.nodes.map(n => `${n.host}:${n.port}`).join(',');
  const nodeList = config.nodes.map(n => `${n.host}:${n.port}`).join(' ');

  return `#!/bin/bash
# Redis Cluster Setup Script for ${environment}
# ${config.description}

echo "Setting up Redis cluster for ${environment}..."

# Set environment variables
export NODE_ENV=${environment}
export REDIS_CLUSTER_NODES="${nodeUrls}"

echo "Configuration:"
echo "- Environment: ${environment}"
echo "- Nodes: ${config.nodes.length}"
echo "- Node URLs: $REDIS_CLUSTER_NODES"

# Verify Redis cluster connectivity
echo "Testing Redis cluster connectivity..."
for node in ${nodeList}; do
  echo "Testing connection to $node..."
  timeout 5 bash -c "</dev/tcp/\${node%:*}/\${node#*:}" && echo "✅ $node is reachable" || echo "❌ $node is not reachable"
done

echo "Redis cluster setup completed!"`;
}

/**
 * Health check configuration for load balancers
 */
export const healthCheckConfig = {
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
    interval: 10000
  }
};

