// src/services/certificate.service.ts
import { Certificate, ICertificate } from '../models/certificate.model';
import * as nftService from './nfts.service';
import { notifyBrandOfCertificateMinted } from './notification.service';
import { sendEmail } from './notification.service';

type CreateCertInput = {
  productId:     string;
  recipient:     string;
  contactMethod: 'email' | 'sms';
};

export async function createCertificate(
  businessId: string,
  input: CreateCertInput
): Promise<ICertificate> {
  
  // 1️⃣ Mint the NFT via your NFT service
  const { tokenId, txHash } = await nftService.mintNft(
    businessId,
    {
      productId: input.productId,
      recipient: input.recipient
    }
  );

  // 2️⃣ Persist certificate record in Mongo
  const cert = await Certificate.create({
    business:  businessId,
    product:   input.productId,
    recipient: input.recipient,
    tokenId,
    txHash
  });

  // 3️⃣ Notify the customer via their chosen method

const link    = `https://your-app.com/view-certificate/${cert._id}`;
const subject = 'Your NFT Certificate is Ready';
const message = `Hello! Your certificate has been minted. You can view it here:\n\n${link}`;

if (input.contactMethod === 'email') {
  await sendEmail(input.recipient, subject, message);
}

  // 4️⃣ Notify the brand owner that a new certificate was minted
  await notifyBrandOfCertificateMinted(businessId, cert._id.toString());

  return cert;
}

export async function listCertificates(businessId: string) {
  return Certificate.find({ business: businessId })
    .populate('product')
    .sort({ createdAt: -1 });
}

