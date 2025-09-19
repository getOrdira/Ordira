// src/services/business/invitation.service.ts
import { Invitation, IInvitation } from '../../models/invitation.model';
import { BrandSettings } from '../../models/brandSettings.model';
import { Manufacturer } from '../../models/manufacturer.model';
import { NotificationsService } from '../external/notifications.service';

export interface InvitationSummary {
  id: string;
  brandId: string;
  manufacturerId: string;
  brandName?: string;
  manufacturerName?: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled' | 'disconnected'; // Updated to match model
  createdAt: Date;
  respondedAt?: Date;
}

type ExtendedInvitation = IInvitation & {
  manufacturer?: { _id: { toString(): string }; name?: string };
  brand?: { toString(): string; business?: { businessName?: string } };
};

export interface ConnectionStats {
  totalConnections: number;
  pendingInvitations: number;
  acceptedInvitations: number;
  declinedInvitations: number;
}

export class InvitationService {
  private notificationsService = new NotificationsService();

  async sendInvite(brandId: string, manufacturerId: string): Promise<IInvitation> {
    // Prevent duplicate pending invites
    const exists = await Invitation.findOne({
      brand: brandId,
      manufacturer: manufacturerId,
      status: 'pending'
    });
    if (exists) {
      throw { statusCode: 409, message: 'Invitation already pending.' };
    }

    // Check if already connected
    const alreadyConnected = await this.areConnected(brandId, manufacturerId);
    if (alreadyConnected) {
      throw { statusCode: 409, message: 'Brand and manufacturer are already connected.' };
    }

    // Create new invitation
    const invite = await Invitation.create({
      brand: brandId,
      manufacturer: manufacturerId,
      status: 'pending'
    });

    // Notify the manufacturer
    await this.notificationsService.notifyManufacturerOfInvite(brandId, manufacturerId);

    return invite;
  }

  async listInvitesForBrand(brandId: string): Promise<InvitationSummary[]> {
    const invites = await Invitation.find({ brand: brandId })
      .populate('manufacturer', 'name email')
      .sort({ createdAt: -1 })
      .exec();

    return invites.map(invite => ({
      id: invite._id.toString(),
      brandId: invite.brand.toString(),
      manufacturerId: invite.manufacturer._id.toString(),
      manufacturerName: (invite as ExtendedInvitation).manufacturer?.name,
      status: invite.status,
      createdAt: invite.createdAt,
      respondedAt: invite.respondedAt
    }));
  }

  async listInvitesForManufacturer(manufacturerId: string): Promise<InvitationSummary[]> {
    const invites = await Invitation.find({ manufacturer: manufacturerId })
      .populate({
        path: 'brand',
        populate: {
          path: 'business',
          select: 'businessName'
        }
      })
      .sort({ createdAt: -1 })
      .exec();

    return invites.map(invite => ({
      id: invite._id.toString(),
      brandId: invite.brand.toString(),
      manufacturerId: invite.manufacturer.toString(),
      brandName: (invite as ExtendedInvitation).brand?.business?.businessName,
      status: invite.status,
      createdAt: invite.createdAt,
      respondedAt: invite.respondedAt
    }));
  }

  async getPendingInvitesForBrand(brandId: string): Promise<InvitationSummary[]> {
    const invites = await this.listInvitesForBrand(brandId);
    return invites.filter(invite => invite.status === 'pending');
  }

  async getPendingInvitesForManufacturer(manufacturerId: string): Promise<InvitationSummary[]> {
    const invites = await this.listInvitesForManufacturer(manufacturerId);
    return invites.filter(invite => invite.status === 'pending');
  }

  async respondInvite(
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
    if (invite.status !== 'pending') {
      throw { statusCode: 400, message: 'Invitation has already been responded to.' };
    }

    invite.status = accept ? 'accepted' : 'declined';
    invite.respondedAt = new Date();
    await invite.save();

    if (accept) {
      // Link the two parties
      await BrandSettings.findOneAndUpdate(
        { business: invite.brand },
        { $addToSet: { manufacturers: manufacturerId } }
      );
      await Manufacturer.findByIdAndUpdate(
        manufacturerId,
        { $addToSet: { brands: invite.brand } }
      );

      // Notify the brand that their invite was accepted
      await this.notificationsService.notifyBrandOfInviteAccepted(manufacturerId, invite.brand.toString());
    }

    return invite;
  }

  async cancelInvite(inviteId: string, brandId: string): Promise<void> {
    const invite = await Invitation.findById(inviteId);
    if (!invite) {
      throw { statusCode: 404, message: 'Invitation not found.' };
    }
    if (invite.brand.toString() !== brandId) {
      throw { statusCode: 403, message: 'Not authorized to cancel this invite.' };
    }
    if (invite.status !== 'pending') {
      throw { statusCode: 400, message: 'Can only cancel pending invitations.' };
    }

    invite.status = 'cancelled';
    await invite.save();
  }

  async getConnectionStats(brandId: string): Promise<ConnectionStats> {
    const [total, pending, accepted, declined] = await Promise.all([
      Invitation.countDocuments({ brand: brandId }),
      Invitation.countDocuments({ brand: brandId, status: 'pending' }),
      Invitation.countDocuments({ brand: brandId, status: 'accepted' }),
      Invitation.countDocuments({ brand: brandId, status: 'declined' })
    ]);

    return {
      totalConnections: total,
      pendingInvitations: pending,
      acceptedInvitations: accepted,
      declinedInvitations: declined
    };
  }

 async getManufacturerConnectionStats(manufacturerId: string): Promise<ConnectionStats> {
  const [total, pending, accepted, declined] = await Promise.all([
    Invitation.countDocuments({ manufacturer: manufacturerId }),
    Invitation.countDocuments({ manufacturer: manufacturerId, status: 'pending' }),
    Invitation.countDocuments({ manufacturer: manufacturerId, status: 'accepted' }),
    // Include all "declined" type statuses
    Invitation.countDocuments({ 
      manufacturer: manufacturerId, 
      status: { $in: ['declined', 'cancelled', 'expired', 'disconnected'] }
    })
  ]);

  return {
    totalConnections: total,
    pendingInvitations: pending,
    acceptedInvitations: accepted,
    declinedInvitations: declined
  };
}

async getConnectedManufacturers(brandId: string): Promise<string[]> {
  // Get accepted invitations to find connected manufacturers
  const acceptedInvitations = await Invitation.find({
    brand: brandId,
    status: 'accepted'
  }).select('manufacturer');

  return acceptedInvitations.map(invitation => invitation.manufacturer.toString());
}

async getConnectedBrands(manufacturerId: string): Promise<string[]> {
  // Get accepted invitations to find connected brands
  const acceptedInvitations = await Invitation.find({
    manufacturer: manufacturerId,
    status: 'accepted'
  }).select('brand');

  return acceptedInvitations.map(invitation => invitation.brand.toString());
}

async areConnected(brandId: string, manufacturerId: string): Promise<boolean> {
  const connection = await Invitation.findOne({
    brand: brandId,
    manufacturer: manufacturerId,
    status: 'accepted'
  });
  return !!connection;
}

  async removeConnection(brandId: string, manufacturerId: string): Promise<void> {
    // Remove from both sides
    await Promise.all([
      BrandSettings.findOneAndUpdate(
        { business: brandId },
        { $pull: { manufacturers: manufacturerId } }
      ),
      Manufacturer.findByIdAndUpdate(
        manufacturerId,
        { $pull: { brands: brandId } }
      )
    ]);

    // Update invitation status if exists
    await Invitation.findOneAndUpdate(
      { brand: brandId, manufacturer: manufacturerId, status: 'accepted' },
      { status: 'disconnected', respondedAt: new Date() }
    );
  }

  async getInvitationById(inviteId: string): Promise<IInvitation | null> {
    return Invitation.findById(inviteId)
      .populate('manufacturer', 'name email')
      .populate({
        path: 'brand',
        populate: {
          path: 'business',
          select: 'businessName'
        }
      })
      .exec();
  }

  async bulkInvite(brandId: string, manufacturerIds: string[]): Promise<{
    successful: string[];
    failed: Array<{ manufacturerId: string; error: string }>;
  }> {
    const successful: string[] = [];
    const failed: Array<{ manufacturerId: string; error: string }> = [];

    for (const manufacturerId of manufacturerIds) {
      try {
        await this.sendInvite(brandId, manufacturerId);
        successful.push(manufacturerId);
      } catch (error) {
        failed.push({
          manufacturerId,
          error: error.message || 'Unknown error'
        });
      }
    }

    return { successful, failed };
  }

  async getRecentActivity(brandId: string, limit: number = 10): Promise<InvitationSummary[]> {
    const invites = await this.listInvitesForBrand(brandId);
    return invites
      .sort((a, b) => {
        const aDate = a.respondedAt || a.createdAt;
        const bDate = b.respondedAt || b.createdAt;
        return bDate.getTime() - aDate.getTime();
      })
      .slice(0, limit);
  }
}

