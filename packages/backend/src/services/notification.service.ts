// src/services/notification.service.ts
import nodemailer from 'nodemailer';
import { Business } from '../models/business.model';
import { Manufacturer } from '../models/manufacturer.model';
import { BrandSettings } from '../models/brandSettings.model';
import { Notification, INotification } from '../models/notification.model';
import { PlanKey } from '../constants/plans';
import { Types } from 'mongoose';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

/**
 * List notifications for either a brand or manufacturer.
 * @param userId – 24-hex string
 */
export async function listNotifications(
  userId: string
): Promise<INotification[]> {
  const objectId = new Types.ObjectId(userId);
  return Notification.find({
    $or: [{ business: objectId }, { manufacturer: objectId }]
  })
    .sort({ createdAt: -1 })
    .lean();
}

/**
 * Mark one notification as read, scoped to the same user.
 * @param userId – 24-hex string
 * @param notificationId – 24-hex string
 */
export async function markAsRead(
  userId: string,
  notificationId: string
): Promise<INotification> {
  const objectId = new Types.ObjectId(userId);
  const notif = await Notification.findOneAndUpdate(
    {
      _id: notificationId,
      $or: [{ business: objectId }, { manufacturer: objectId }]
    },
    { read: true },
    { new: true }
  );

  if (!notif) {
    throw { statusCode: 404, message: 'Notification not found' };
  }
  return notif;
}


/** Send a generic email */
export async function sendEmail(to: string, subject: string, text: string) {
  await transporter.sendMail({ from: process.env.SMTP_USER, to, subject, text });
}


/** Sends a one-time verification code to a user’s email */
export const sendEmailCode = async (email: string, code: string) => {
  const subject = 'Your verification code';
  const text    = `Your verification code is: ${code}`;
  await sendEmail(email, subject, text);
};


/** 1️⃣ New invite sent by Brand → notify Manufacturer */
export async function notifyManufacturerOfInvite(
  brandId: string,
  manufacturerId: string
) {
  const [brand, mfg] = await Promise.all([
    Business.findById(brandId).select('businessName email phone'),
    Manufacturer.findById(manufacturerId).select('name email phone')
  ]);
  if (!brand || !mfg) return;

  const message = `${brand.businessName} has invited you to connect on Despoke. Log in to accept or decline.`;
  const subject = `New connection request from ${brand.businessName}`;

  if (mfg.email) await sendEmail(mfg.email, subject, message);

  // Persist in-app notification
  await Notification.create({
    manufacturer: manufacturerId,
    type:        'invite',
    message,
    data:        { brandId },
    read:        false
  });
}

/** 2️⃣ Invite accepted → notify Brand */
export async function notifyBrandOfInviteAccepted(
  manufacturerId: string,
  brandId: string
) {
  const [mfg, biz] = await Promise.all([
    Manufacturer.findById(manufacturerId).select('name email phone'),
    Business.findById(brandId).select('businessName email phone')
  ]);
  if (!mfg || !biz) return;

  const message = `${mfg.name} is now connected and can receive your vote results.`;
  const subject = `${mfg.name} accepted your connection request`;

  if (biz.email) await sendEmail(biz.email, subject, message);
  

  // Persist in-app notification
  await Notification.create({
    business: brandId,
    type:     'invite_accepted',
    message,
    data:     { manufacturerId },
    read:     false
  });
}

/** 3️⃣ New vote received → notify Brand */
export async function notifyBrandOfNewVote(
  businessId: string,
  proposalId: string
) {
  const biz = await Business.findById(businessId).select('businessName email phone');
  if (!biz) return;

  const message = `Your customer just cast a vote on proposal ${proposalId}. Check your dashboard for details.`;
  const subject = `New vote on proposal ${proposalId}`;

  if (biz.email) await sendEmail(biz.email, subject, message);
  

  // Persist in-app notification
  await Notification.create({
    business: businessId,
    type:     'vote',
    message,
    data:     { proposalId },
    read:     false
  });
}

/** 4️⃣ Certificate minted → notify Brand */
export async function notifyBrandOfCertificateMinted(
  businessId: string,
  certificateId: string
) {
  const biz = await Business.findById(businessId).select('businessName email phone');
  if (!biz) return;

  const message = `Your NFT certificate ${certificateId} has been minted successfully.`;
  const subject = `NFT Certificate ${certificateId} Minted`;

  if (biz.email) await sendEmail(biz.email, subject, message);
  

  // Persist in-app notification
  await Notification.create({
    business: businessId,
    type:     'certificate',
    message,
    data:     { certificateId },
    read:     false
  });
}

/** 5️⃣ Plan renewal processed → notify Brand */
export async function notifyBrandOfRenewal(
  subscriptionId: string
) {
  const settings = await BrandSettings.findOne({ stripeSubscriptionId: subscriptionId })
    .populate<{ business: any }>('business', 'businessName email phone plan');
  if (!settings) return;

  const biz  = settings.business;
  const plan = settings.plan as PlanKey;
  const message = `Your ${plan} subscription has been successfully renewed.`;
  const subject = `Your ${plan} plan has been renewed`;

  if (biz.email) await sendEmail(biz.email, subject, message);
  

  // Persist in-app notification
  await Notification.create({
    business: biz._id.toString(),
    type:     'billing_renewal',
    message,
    data:     { plan, subscriptionId },
    read:     false
  });
}



