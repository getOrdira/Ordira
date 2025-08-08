// src/services/business/certificate.service.ts
import { Certificate, ICertificate } from '../../models/certificate.model';
import { NftService } from '../blockchain/nft.service';
import { NotificationsService } from '../external/notifications.service';

type CreateCertInput = {
  productId: string;
  recipient: string;
  contactMethod: 'email' | 'sms';
};

export class CertificateService {
  private nftService = new NftService();
  private notificationsService = new NotificationsService();

  async createCertificate(businessId: string, input: CreateCertInput): Promise<ICertificate> {
    
    // 1️⃣ Mint the NFT via your NFT service
    const { tokenId, txHash } = await this.nftService.mintNft(
      businessId,
      {
        productId: input.productId,
        recipient: input.recipient
      }
    );

    // 2️⃣ Persist certificate record in Mongo
    const cert = await Certificate.create({
      business: businessId,
      product: input.productId,
      recipient: input.recipient,
      tokenId,
      txHash
    });

    // 3️⃣ Notify the customer via their chosen method
    const link = `https://your-app.com/view-certificate/${cert._id}`;
    const subject = 'Your NFT Certificate is Ready';
    const message = `Hello! Your certificate has been minted. You can view it here:\n\n${link}`;

    if (input.contactMethod === 'email') {
      await this.notificationsService.sendEmail(input.recipient, subject, message);
    }
    // TODO: Add SMS support for 'sms' contactMethod

    // 4️⃣ Notify the brand owner that a new certificate was minted
    await this.notificationsService.notifyBrandOfCertificateMinted(businessId, cert._id.toString());

    return cert;
  }

  async listCertificates(businessId: string) {
    return Certificate.find({ business: businessId })
      .populate('product')
      .sort({ createdAt: -1 });
  }

  async getCertificate(certificateId: string, businessId?: string): Promise<ICertificate> {
    const query: any = { _id: certificateId };
    if (businessId) {
      query.business = businessId;
    }

    const cert = await Certificate.findOne(query).populate('product');
    if (!cert) {
      throw { statusCode: 404, message: 'Certificate not found' };
    }
    return cert;
  }

  async getCertificateByTokenId(tokenId: string): Promise<ICertificate> {
    const cert = await Certificate.findOne({ tokenId }).populate('product');
    if (!cert) {
      throw { statusCode: 404, message: 'Certificate not found' };
    }
    return cert;
  }

  async revokeCertificate(certificateId: string, businessId: string): Promise<ICertificate> {
    const cert = await Certificate.findOneAndUpdate(
      { _id: certificateId, business: businessId },
      { revoked: true, revokedAt: new Date() },
      { new: true }
    );
    
    if (!cert) {
      throw { statusCode: 404, message: 'Certificate not found' };
    }

    // TODO: Consider burning/transferring the NFT when revoking
    return cert;
  }

  async getCertificateStats(businessId: string): Promise<{
    total: number;
    thisMonth: number;
    revoked: number;
  }> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [total, thisMonth, revoked] = await Promise.all([
      Certificate.countDocuments({ business: businessId }),
      Certificate.countDocuments({ 
        business: businessId, 
        createdAt: { $gte: startOfMonth } 
      }),
      Certificate.countDocuments({ 
        business: businessId, 
        revoked: true 
      })
    ]);

    return { total, thisMonth, revoked };
  }

  async resendCertificateNotification(certificateId: string, businessId: string): Promise<void> {
    const cert = await this.getCertificate(certificateId, businessId);
    
    const link = `https://your-app.com/view-certificate/${cert._id}`;
    const subject = 'Your NFT Certificate is Ready';
    const message = `Hello! Your certificate has been minted. You can view it here:\n\n${link}`;

    await this.notificationsService.sendEmail(cert.recipient, subject, message);
  }
}
