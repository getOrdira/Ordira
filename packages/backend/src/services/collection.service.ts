// src/services/collection.service.ts
import { Collection, ICollection } from '../models/collection.model';

export async function listCollections(businessId: string): Promise<ICollection[]> {
  return Collection.find({ business: businessId }).sort({ createdAt: -1 }).populate({ path: 'products', populate: 'media' });
}

export async function getCollection(collectionId: string, businessId: string): Promise<ICollection> {
  const coll = await Collection.findOne({ _id: collectionId, business: businessId }).populate({ path: 'products', populate: 'media' });
  if (!coll) throw { statusCode: 404, message: 'Collection not found.' };
  return coll;
}

export async function createCollection(
  data: { title: string; description?: string; products: string[] },
  businessId: string
): Promise<ICollection> {
  const coll = new Collection({ business: businessId, ...data });
  return coll.save();
}

export async function updateCollection(
  collectionId: string,
  data: { title: string; description?: string; products: string[] },
  businessId: string
): Promise<ICollection> {
  const coll = await Collection.findOneAndUpdate(
    { _id: collectionId, business: businessId },
    data,
    { new: true }
  );
  if (!coll) throw { statusCode: 404, message: 'Collection not found or unauthorized.' };
  return coll;
}

export async function deleteCollection(collectionId: string, businessId: string): Promise<void> {
  const res = await Collection.deleteOne({ _id: collectionId, business: businessId });
  if (res.deletedCount === 0) throw { statusCode: 404, message: 'Collection not found or unauthorized.' };
}