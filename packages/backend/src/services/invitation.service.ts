// src/services/invitation.service.ts
import { Invitation, IInvitation } from '../models/invitation.model';
import { BrandSettings }           from '../models/brandSettings.model';
import { Manufacturer }            from '../models/manufacturer.model';
import {
  notifyManufacturerOfInvite,
  notifyBrandOfInviteAccepted
} from './notification.service';

export async function sendInvite(
  brandId: string,
  manufacturerId: string
): Promise<IInvitation> {
  // Prevent duplicate pending invites
  const exists = await Invitation.findOne({
    brand:        brandId,
    manufacturer: manufacturerId,
    status:       'pending'
  });
  if (exists) {
    throw { statusCode: 409, message: 'Invitation already pending.' };
  }

  // Create new invitation
  const invite = await Invitation.create({
    brand:        brandId,
    manufacturer: manufacturerId,
    status:       'pending'
  });

  // Notify the manufacturer
  await notifyManufacturerOfInvite(brandId, manufacturerId);

  return invite;
}

export async function listInvitesForBrand(
  brandId: string
): Promise<IInvitation[]> {
  return Invitation.find({ brand: brandId, status: 'pending' })
    .populate('manufacturer', 'name email')
    .exec();
}

export async function listInvitesForManufacturer(
  manufacturerId: string
): Promise<IInvitation[]> {
  return Invitation.find({ manufacturer: manufacturerId, status: 'pending' })
    .populate('brand', 'business')
    .exec();
}

export async function respondInvite(
  inviteId: string,
  accept: boolean,
  manufacturerId: string
): Promise<IInvitation> {
  const invite = await Invitation.findById(inviteId);
  if (!invite) {
    throw { statusCode: 404, message: 'Invitation not found.' };
  }
  if (invite.manufacturer.toString() !== manufacturerId) {
    throw { statusCode: 403, message: 'Not authorized to respond to this invite.' };
  }

  invite.status = accept ? 'accepted' : 'declined';
  await invite.save();

  if (accept) {
    // Link the two parties
    await BrandSettings.findOneAndUpdate(
      { _id: invite.brand },
      { $addToSet: { manufacturers: manufacturerId } }
    );
    await Manufacturer.findByIdAndUpdate(
      manufacturerId,
      { $addToSet: { brands: invite.brand } }
    );

    // Notify the brand that their invite was accepted
    await notifyBrandOfInviteAccepted(manufacturerId, invite.brand.toString());
  }

  return invite;
}

