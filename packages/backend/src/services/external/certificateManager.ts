import {
  certificateProvisionerService,
  CertificateDetails,
  CertificateProvisionerService,
  StoredCertificateInfo
} from '../domains/core/certificateProvisioner.service';

/**
 * Backwards compatible wrapper around the new CertificateProvisionerService.
 * Legacy imports can continue using CertificateManagerService while the
 * modular domain services consume the provisioner directly.
 */
export class CertificateManagerService {
  constructor(
    private readonly provisioner: CertificateProvisionerService = certificateProvisionerService
  ) {}

  /**
   * Provision a certificate for a host (legacy signature discards result).
   */
  async provisionCertForHost(hostname: string): Promise<void> {
    await this.provisioner.provisionCertificate(hostname);
  }

  /**
   * Fetch metadata about a stored certificate.
   */
  async getCertificateInfo(hostname: string): Promise<StoredCertificateInfo> {
    return this.provisioner.getCertificateInfo(hostname);
  }

  /**
   * Renew and persist a new certificate.
   */
  async renewCertificate(hostname: string): Promise<void> {
    await this.provisioner.renewCertificate(hostname);
  }

  /**
   * Revoke an existing certificate.
   */
  async revokeCertificate(hostname: string): Promise<void> {
    await this.provisioner.revokeCertificate(hostname);
  }

  /**
   * List hostnames with certificates.
   */
  async listCertificates(): Promise<string[]> {
    return this.provisioner.listCertificates();
  }

  /**
   * Placeholder for legacy domain ownership validation.
   */
  async validateDomainOwnership(): Promise<boolean> {
    return true;
  }
}

export const certificateManagerService = new CertificateManagerService();

export async function provisionCertForHost(hostname: string): Promise<void> {
  await certificateManagerService.provisionCertForHost(hostname);
}

export type {
  CertificateDetails,
  StoredCertificateInfo
};
