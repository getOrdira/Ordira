// src/services/external/certificateManager.service.ts

import fs from 'fs/promises';
import path from 'path';
import acme, { forge } from 'acme-client';

// Define proper types for ACME challenges
type ChallengeStatus = 'pending' | 'processing' | 'valid' | 'invalid';

interface HttpChallenge {
  type: 'http-01';
  token: string;
  url: string;
  status: ChallengeStatus;
}

interface DnsChallenge {
  type: 'dns-01';
  token: string;
  url: string;
  status: ChallengeStatus;
}

interface TlsAlpnChallenge {
  type: 'tls-alpn-01';
  token: string;
  url: string;
  status: ChallengeStatus;
}

type Challenge = HttpChallenge | DnsChallenge | TlsAlpnChallenge;

// Type guard to validate challenge type
function isValidChallengeType(type: string): type is 'dns-01' | 'http-01' | 'tls-alpn-01' {
  return ['dns-01', 'http-01', 'tls-alpn-01'].includes(type);
}

// Type guard to check if challenge is HTTP-01
function isHttpChallenge(challenge: { type: string; token: string; url: string; status: string }): challenge is HttpChallenge {
  return challenge.type === 'http-01';
}

const CERT_DIR = process.env.CERT_STORAGE_DIR || 'certs';
const CHALLENGE_DIR = process.env.ACME_CHALLENGE_DIR || 
                      path.join('.well-known', 'acme-challenge');

export class CertificateManagerService {

  /** Returns an ACME client with a fresh account key. */
  private async getAcmeClient(): Promise<acme.Client> {
    const accountKey = await forge.createPrivateKey();
    return new acme.Client({
      directoryUrl: acme.directory.letsencrypt.production,
      accountKey
    });
  }

  async provisionCertForHost(hostname: string): Promise<void> {
    // 1) Prepare ACME client & new order
    const client = await this.getAcmeClient();
    const order = await client.createOrder({
      identifiers: [{ type: 'dns', value: hostname }]
    });

    const challengePath = path.resolve(process.cwd(), CHALLENGE_DIR);
    await fs.mkdir(challengePath, { recursive: true });

    const authzs = await client.getAuthorizations(order);
    for (const auth of authzs) {
      const challenges = auth.challenges as Array<{ type: string; token: string; url: string; status: string }>;
      const httpChallenge = challenges.find(isHttpChallenge);
      
      if (!httpChallenge) {
        throw new Error(
          `No HTTP-01 challenge found for ${auth.identifier.value}`
        );
      }

      // Now httpChallenge is properly typed as HttpChallenge
      const keyAuth = await client.getChallengeKeyAuthorization(httpChallenge);
      const tokenFile = path.join(challengePath, httpChallenge.token);
      await fs.writeFile(tokenFile, keyAuth, 'utf-8');

      await client.verifyChallenge(auth, httpChallenge);
      await client.completeChallenge(httpChallenge);
      await client.waitForValidStatus(httpChallenge);

      await fs.unlink(tokenFile);
    }

    await client.waitForValidStatus(order);

    const [privateKeyPem, csr] = await forge.createCsr({
      commonName: hostname
    });

    await client.finalizeOrder(order, csr);
    const certPem = await client.getCertificate(order);

    const outDir = path.resolve(process.cwd(), CERT_DIR, hostname);
    await fs.mkdir(outDir, { recursive: true });
    await Promise.all([
      fs.writeFile(path.join(outDir, 'privkey.pem'), privateKeyPem, 'utf-8'),
      fs.writeFile(path.join(outDir, 'cert.pem'), certPem, 'utf-8'),
      fs.writeFile(path.join(outDir, 'fullchain.pem'), certPem, 'utf-8'),
    ]);
  }

  async getCertificateInfo(hostname: string): Promise<{
    exists: boolean;
    certPath?: string;
    keyPath?: string;
    fullchainPath?: string;
    expiresAt?: Date;
  }> {
    const certDir = path.resolve(process.cwd(), CERT_DIR, hostname);
    const certPath = path.join(certDir, 'cert.pem');
    
    try {
      await fs.access(certPath);
      
      // Read certificate and extract expiration date
      const certContent = await fs.readFile(certPath, 'utf-8');
      // TODO: Parse certificate to get expiration date
      
      return {
        exists: true,
        certPath: path.join(certDir, 'cert.pem'),
        keyPath: path.join(certDir, 'privkey.pem'),
        fullchainPath: path.join(certDir, 'fullchain.pem'),
        // expiresAt: parsedExpirationDate
      };
    } catch (error) {
      return { exists: false };
    }
  }

  async renewCertificate(hostname: string): Promise<void> {
    // Check if certificate needs renewal (e.g., expires in <30 days)
    const certInfo = await this.getCertificateInfo(hostname);
    
    if (!certInfo.exists) {
      throw new Error(`No certificate found for ${hostname}`);
    }

    // For now, just re-provision (in production, you'd check expiration first)
    await this.provisionCertForHost(hostname);
  }

  async revokeCertificate(hostname: string): Promise<void> {
    const certInfo = await this.getCertificateInfo(hostname);
    
    if (!certInfo.exists || !certInfo.certPath) {
      throw new Error(`No certificate found for ${hostname}`);
    }

    const client = await this.getAcmeClient();
    const certPem = await fs.readFile(certInfo.certPath, 'utf-8');
    
    await client.revokeCertificate(certPem);
    
    // Remove certificate files
    const certDir = path.resolve(process.cwd(), CERT_DIR, hostname);
    await fs.rm(certDir, { recursive: true, force: true });
  }

  async listCertificates(): Promise<string[]> {
    const certBaseDir = path.resolve(process.cwd(), CERT_DIR);
    
    try {
      const entries = await fs.readdir(certBaseDir, { withFileTypes: true });
      return entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);
    } catch (error) {
      return [];
    }
  }

  async validateDomainOwnership(hostname: string): Promise<boolean> {
    // TODO: Implement domain validation logic
    // This could involve DNS checks, HTTP challenges, etc.
    return true;
  }
}

// Export the function for backwards compatibility
export async function provisionCertForHost(hostname: string): Promise<void> {
  const service = new CertificateManagerService();
  return service.provisionCertForHost(hostname);
}

