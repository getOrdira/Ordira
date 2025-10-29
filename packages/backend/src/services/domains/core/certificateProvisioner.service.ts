import fs from 'fs/promises';
import path from 'path';
import acme, { forge } from 'acme-client';
import type { Order, Authorization } from 'acme-client/types';
import type { Challenge } from 'acme-client/types/rfc8555';

import { createAppError } from '../../../middleware/error.middleware';
import { logger } from '../../../utils/logger';

export interface CertificateProvisionerOptions {
  challengeDirectory?: string;
  certificateDirectory?: string;
  useStaging?: boolean;
}

export interface CertificatePaths {
  certificatePath: string;
  privateKeyPath: string;
  fullChainPath: string;
}

export interface CertificateDetails extends CertificatePaths {
  certificate: string;
  privateKey: string;
  expiresAt?: Date;
  validFrom?: Date;
  issuer?: string;
  serialNumber?: string;
}

export interface StoredCertificateInfo extends CertificatePaths {
  exists: boolean;
  expiresAt?: Date;
  validFrom?: Date;
  issuer?: string;
  serialNumber?: string;
}

const DEFAULT_CERT_DIR = process.env.CERT_STORAGE_DIR || 'certs';
const DEFAULT_CHALLENGE_DIR =
  process.env.ACME_CHALLENGE_DIR || path.join('.well-known', 'acme-challenge');

/**
 * Service responsible for interacting with ACME providers (Let's Encrypt) to provision,
 * renew, revoke, and inspect SSL certificates for tenant custom domains.
 */
export class CertificateProvisionerService {
  private readonly challengeDirectory: string;
  private readonly certificateDirectory: string;
  private readonly directoryUrl: string;

  constructor(options: CertificateProvisionerOptions = {}) {
    this.challengeDirectory = path.resolve(
      process.cwd(),
      options.challengeDirectory ?? DEFAULT_CHALLENGE_DIR
    );
    this.certificateDirectory = path.resolve(
      process.cwd(),
      options.certificateDirectory ?? DEFAULT_CERT_DIR
    );

    this.directoryUrl = options.useStaging
      ? acme.directory.letsencrypt.staging
      : acme.directory.letsencrypt.production;
  }

  /**
   * Issue a new certificate for the provided hostname using HTTP-01 validation.
   */
  async provisionCertificate(hostname: string): Promise<CertificateDetails> {
    const normalizedHost = this.normalizeHostname(hostname);

    try {
      const client = await this.createClient();
      const order = await client.createOrder({
        identifiers: [{ type: 'dns', value: normalizedHost }]
      });

      await this.prepareChallengeDirectory();
      await this.completeHttpChallenges(client, order);

      await client.waitForValidStatus(order);

      const [privateKeyPem, csr] = await forge.createCsr({
        commonName: normalizedHost
      });

      await client.finalizeOrder(order, csr);
      const certificatePem = await client.getCertificate(order);

      const output = await this.persistCertificate(normalizedHost, {
        certificatePem,
        privateKeyPem: privateKeyPem.toString()
      });

      logger.info('Certificate provisioned for host', {
        hostname: normalizedHost,
        expiresAt: output.expiresAt?.toISOString()
      });

      return output;
    } catch (error: any) {
      logger.error('Failed to provision certificate', {
        hostname: normalizedHost,
        error: error?.message
      });
      throw createAppError(
        `Failed to provision certificate for ${normalizedHost}`,
        502,
        'CERTIFICATE_PROVISION_FAILED',
        { cause: error?.message }
      );
    }
  }

  /**
   * Retrieve metadata about an existing certificate on disk.
   */
  async getCertificateInfo(hostname: string): Promise<StoredCertificateInfo> {
    const normalizedHost = this.normalizeHostname(hostname);
    const certPaths = this.buildCertificatePaths(normalizedHost);

    try {
      await fs.access(certPaths.certificatePath);

      const certificatePem = await fs.readFile(certPaths.certificatePath, 'utf-8');
      const parsed = await this.parseCertificate(certificatePem);

      return {
        exists: true,
        ...certPaths,
        ...parsed
      };
    } catch (error) {
      return {
        exists: false,
        ...certPaths
      };
    }
  }

  /**
   * Renew an existing certificate. This currently reprovisions a new certificate.
   */
  async renewCertificate(hostname: string): Promise<CertificateDetails> {
    const info = await this.getCertificateInfo(hostname);

    if (!info.exists) {
      throw createAppError(
        `No certificate found for ${hostname}`,
        404,
        'CERTIFICATE_NOT_FOUND'
      );
    }

    return this.provisionCertificate(hostname);
  }

  /**
   * Revoke a certificate with the CA and remove local artifacts.
   */
  async revokeCertificate(hostname: string): Promise<void> {
    const normalizedHost = this.normalizeHostname(hostname);
    const info = await this.getCertificateInfo(normalizedHost);

    if (!info.exists) {
      throw createAppError(
        `No certificate found for ${normalizedHost}`,
        404,
        'CERTIFICATE_NOT_FOUND'
      );
    }

    try {
      const client = await this.createClient();
      const certificatePem = await fs.readFile(info.certificatePath, 'utf-8');

      await client.revokeCertificate(certificatePem);

      await fs.rm(path.dirname(info.certificatePath), {
        recursive: true,
        force: true
      });

      logger.info('Certificate revoked and removed', { hostname: normalizedHost });
    } catch (error: any) {
      logger.error('Failed to revoke certificate', {
        hostname: normalizedHost,
        error: error?.message
      });

      throw createAppError(
        `Failed to revoke certificate for ${normalizedHost}`,
        502,
        'CERTIFICATE_REVOKE_FAILED',
        { cause: error?.message }
      );
    }
  }

  /**
   * List all hostnames with stored certificates.
   */
  async listCertificates(): Promise<string[]> {
    try {
      const entries = await fs.readdir(this.certificateDirectory, {
        withFileTypes: true
      });

      return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
    } catch (error) {
      return [];
    }
  }

  private async prepareChallengeDirectory(): Promise<void> {
    await fs.mkdir(this.challengeDirectory, { recursive: true });
  }

  private async completeHttpChallenges(client: acme.Client, order: Order): Promise<void> {
    const authorizations = await client.getAuthorizations(order);

    for (const authorization of authorizations) {
      const challenge = this.selectHttpChallenge(authorization.challenges as Challenge[]);

      if (!challenge) {
        throw createAppError(
          `No HTTP-01 challenge available for ${authorization.identifier.value}`,
          422,
          'ACME_CHALLENGE_MISSING'
        );
      }

      await this.handleHttpChallenge(client, authorization as Authorization, challenge);
    }
  }

  private async handleHttpChallenge(
    client: acme.Client,
    authorization: Authorization,
    challenge: Challenge
  ): Promise<void> {
    const tokenPath = path.join(this.challengeDirectory, challenge.token);

    try {
      const keyAuth = await client.getChallengeKeyAuthorization(challenge);
      await fs.writeFile(tokenPath, keyAuth, 'utf-8');

      await client.verifyChallenge(authorization, challenge);
      await client.completeChallenge(challenge);
      await client.waitForValidStatus(challenge);
    } finally {
      await this.safeUnlink(tokenPath);
    }
  }

  private async safeUnlink(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch {
      // Intentionally swallow – file may already be removed.
    }
  }

  private selectHttpChallenge(
    challenges: Challenge[] = []
  ): Challenge | undefined {
    return challenges.find(
      (challenge) => challenge.type === 'http-01'
    );
  }

  private async createClient(): Promise<acme.Client> {
    const accountKey = await forge.createPrivateKey();
    return new acme.Client({
      directoryUrl: this.directoryUrl,
      accountKey
    });
  }

  private async persistCertificate(
    hostname: string,
    payload: { certificatePem: string; privateKeyPem: string }
  ): Promise<CertificateDetails> {
    const outputDir = path.join(this.certificateDirectory, hostname);
    await fs.mkdir(outputDir, { recursive: true });

    const certificatePath = path.join(outputDir, 'cert.pem');
    const privateKeyPath = path.join(outputDir, 'privkey.pem');
    const fullChainPath = path.join(outputDir, 'fullchain.pem');

    await Promise.all([
      fs.writeFile(certificatePath, payload.certificatePem, { encoding: 'utf-8', mode: 0o600 }),
      fs.writeFile(privateKeyPath, payload.privateKeyPem, { encoding: 'utf-8', mode: 0o600 }),
      fs.writeFile(fullChainPath, payload.certificatePem, { encoding: 'utf-8', mode: 0o600 })
    ]);

    const parsed = await this.parseCertificate(payload.certificatePem);

    return {
      certificate: payload.certificatePem,
      privateKey: payload.privateKeyPem,
      certificatePath,
      privateKeyPath,
      fullChainPath,
      ...parsed
    };
  }

  private async parseCertificate(certificatePem: string): Promise<{
    expiresAt?: Date;
    validFrom?: Date;
    issuer?: string;
  }> {
    try {
      const certInfo = await forge.readCertificateInfo(certificatePem);
      
      return {
        expiresAt: certInfo.notAfter ? new Date(certInfo.notAfter) : undefined,
        validFrom: certInfo.notBefore ? new Date(certInfo.notBefore) : undefined,
        issuer: certInfo.issuer?.commonName
      };
    } catch (error: any) {
      logger.warn('Unable to parse certificate metadata', { error: error?.message });
      return {};
    }
  }

  private buildCertificatePaths(hostname: string): CertificatePaths {
    const outputDir = path.join(this.certificateDirectory, hostname);

    return {
      certificatePath: path.join(outputDir, 'cert.pem'),
      privateKeyPath: path.join(outputDir, 'privkey.pem'),
      fullChainPath: path.join(outputDir, 'fullchain.pem')
    };
  }

  private normalizeHostname(hostname: string): string {
    const trimmed = hostname.trim().toLowerCase();

    if (!trimmed) {
      throw createAppError('Hostname is required', 400, 'MISSING_HOSTNAME');
    }

    return trimmed;
  }
}

export const certificateProvisionerService = new CertificateProvisionerService();
