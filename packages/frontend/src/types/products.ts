// src/types/products.ts
export interface Product {
    id: string;
    name: string;
    description: string;
    imageUrl?: string;
    category?: string;
    sku?: string;
    price?: number;
    createdAt: string;
    updatedAt: string;
  }