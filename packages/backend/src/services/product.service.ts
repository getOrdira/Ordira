// src/services/product.service.ts
import { Product, IProduct } from '../models/product.model';

/**
 * Retrieve all products for a business
 */
export async function listProducts(businessId: string): Promise<IProduct[]> {
  return Product.find({ business: businessId }).sort({ createdAt: -1 }).populate('media');
}

/**
 * Get a single product by ID, scoped to the business
 */
export async function getProduct(productId: string, businessId: string): Promise<IProduct> {
  const product = await Product.findOne({ _id: productId, business: businessId }).populate('media');
  if (!product) throw { statusCode: 404, message: 'Product not found.' };
  return product;
}

/**
 * Create a new product for the business
 */
export async function createProduct(
  data: { title: string; description?: string; media: string[] },
  businessId: string
): Promise<IProduct> {
  const product = new Product({ business: businessId, ...data });
  return product.save();
}

/**
 * Update an existing product
 */
export async function updateProduct(
  productId: string,
  data: { title: string; description?: string; media: string[] },
  businessId: string
): Promise<IProduct> {
  const product = await Product.findOneAndUpdate(
    { _id: productId, business: businessId },
    data,
    { new: true }
  );
  if (!product) throw { statusCode: 404, message: 'Product not found or unauthorized.' };
  return product;
}

/**
 * Delete a product
 */
export async function deleteProduct(productId: string, businessId: string): Promise<void> {
  const res = await Product.deleteOne({ _id: productId, business: businessId });
  if (res.deletedCount === 0) throw { statusCode: 404, message: 'Product not found or unauthorized.' };
}