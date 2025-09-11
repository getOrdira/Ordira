// src/app/sitemap.ts
import { MetadataRoute } from 'next';

/**
 * Helps search engines discover and index our pages for better SEO
 * 
 * This sitemap includes:
 * - Public marketing pages
 * - Authentication pages
 * - Documentation and help pages
 * - Dynamic routes are excluded as they require authentication
 */
export default function sitemap(): MetadataRoute.Sitemap {
  // Base URL from environment or fallback
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ordira.xyz';
  
  // Current date for lastModified
  const currentDate = new Date();
  
  return [
    // === ROOT & MARKETING PAGES ===
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    
    // === PUBLIC PAGES ===
    {
      url: `${baseUrl}/pricing`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    
    // === AUTHENTICATION PAGES ===
    {
      url: `${baseUrl}/auth/login`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/auth/register`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/auth/verify-email`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    
    // === CUSTOMER ENTRY POINTS ===
    {
      url: `${baseUrl}/gate`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/proposals`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/vote`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.6,
    },
    
    // === LEGAL & POLICY PAGES (if they exist) ===
    // Uncomment these when you add legal pages
    // {
    //   url: `${baseUrl}/privacy`,
    //   lastModified: currentDate,
    //   changeFrequency: 'yearly',
    //   priority: 0.3,
    // },
    // {
    //   url: `${baseUrl}/terms`,
    //   lastModified: currentDate,
    //   changeFrequency: 'yearly',
    //   priority: 0.3,
    // },
    // {
    //   url: `${baseUrl}/about`,
    //   lastModified: currentDate,
    //   changeFrequency: 'monthly',
    //   priority: 0.5,
    // },
    // {
    //   url: `${baseUrl}/contact`,
    //   lastModified: currentDate,
    //   changeFrequency: 'monthly',
    //   priority: 0.4,
    // },
    
    // === HELP & DOCUMENTATION ===
    // Uncomment these when you add help pages
    // {
    //   url: `${baseUrl}/help`,
    //   lastModified: currentDate,
    //   changeFrequency: 'monthly',
    //   priority: 0.4,
    // },
    // {
    //   url: `${baseUrl}/docs`,
    //   lastModified: currentDate,
    //   changeFrequency: 'weekly',
    //   priority: 0.5,
    // },
    
    // === BLOG/NEWS (if implemented) ===
    // {
    //   url: `${baseUrl}/blog`,
    //   lastModified: currentDate,
    //   changeFrequency: 'weekly',
    //   priority: 0.6,
    // },
    
    // === API DOCUMENTATION (if public) ===
    // {
    //   url: `${baseUrl}/api-docs`,
    //   lastModified: currentDate,
    //   changeFrequency: 'monthly',
    //   priority: 0.4,
    // },
  ];
}

