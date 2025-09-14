// src/app/robots.ts
import { MetadataRoute } from 'next';

/**
 * Controls how web crawlers and search engines interact with our site
 * 
 * This configuration:
 * - Allows all bots to index public content
 * - Blocks access to private/sensitive areas
 * - References our sitemap for better crawling
 * - Sets crawl delay for responsible bot behavior
 */
export default function robots(): MetadataRoute.Robots {
  // Base URL from environment or fallback
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.ordira.xyz';
  
  return {
    rules: [
      // === DEFAULT RULES FOR ALL BOTS ===
      {
        userAgent: '*',
        allow: [
          '/',                    // Homepage
          '/pricing',             // Pricing page
          '/auth/login',          // Login page
          '/auth/register',       // Registration page
          '/gate',                // Customer entry point
          
        ],
        disallow: [
          // === PRIVATE/AUTHENTICATED AREAS ===
          '/brand/',              // Brand dashboard (private)
          '/manufacturer/',       // Manufacturer dashboard (private)
          
          // === SENSITIVE ROUTES ===
          '/api/',                // API endpoints
          '/auth/logout',         // Logout endpoint
          '/auth/verify-email',   // Email verification (sensitive)
          
          // === SYSTEM/ADMIN AREAS ===
          '/_next/',              // Next.js internal files
          '/admin/',              // Admin panel (if exists)
          
          // === TEMPORARY/CACHE FILES ===
          '*.json',               // JSON files
          '/tmp/',                // Temporary files
          '/cache/',              // Cache files
          
          // === USER GENERATED CONTENT (PRIVATE) ===
          '/certificate/*',       // Private certificates
          
          // === DEVELOPMENT/DEBUG ===
          '/debug/',              // Debug routes (if any)
          '/test/',               // Test routes (if any)
          
          // === SEARCH/FILTER PARAMETERS ===
          '/*?*',                 // Pages with query parameters (avoid duplicate indexing)
          
          // === COMMON SENSITIVE PATTERNS ===
          '/*?utm_*',             // UTM tracking parameters
          '/*?ref=*',             // Referral parameters
          '/*?source=*',          // Source tracking
        ],
        crawlDelay: 1,            // 1 second delay between requests
      },
      
      // === SPECIFIC RULES FOR MAJOR SEARCH ENGINES ===
      
      // Google Bot - More permissive for better indexing
      {
        userAgent: 'Googlebot',
        allow: [
          '/',
          '/pricing',
          '/auth/login',
          '/auth/register',
          '/gate',
        ],
        disallow: [
          '/brand/',
          '/manufacturer/',
          '/api/',
          '/certificate/*',
          '/_next/',
        ],
        crawlDelay: 0.5,          // Faster crawling for Google
      },
      
      // Bing Bot
      {
        userAgent: 'Bingbot',
        allow: [
          '/',
          '/pricing',
          '/auth/login',
          '/auth/register',
          '/gate',
        ],
        disallow: [
          '/brand/',
          '/manufacturer/',
          '/api/',
          '/certificate/*',
        ],
        crawlDelay: 1,
      },
      
      // === SOCIAL MEDIA BOTS (for link previews) ===
      
      // Facebook/Meta crawler
      {
        userAgent: 'facebookexternalhit',
        allow: [
          '/',
          '/pricing',
          '/gate',
        ],
        disallow: [
          '/brand/',
          '/manufacturer/',
          '/api/',
        ],
      },
      
      // Twitter crawler
      {
        userAgent: 'Twitterbot',
        allow: [
          '/',
          '/pricing',
          '/gate',
        ],
        disallow: [
          '/brand/',
          '/manufacturer/',
          '/api/',
        ],
      },
      
      // LinkedIn crawler
      {
        userAgent: 'LinkedInBot',
        allow: [
          '/',
          '/pricing',
        ],
        disallow: [
          '/brand/',
          '/manufacturer/',
          '/api/',
          '/auth/',
        ],
      },
      
      // === AGGRESSIVE/PROBLEMATIC BOTS ===
      
      // Block aggressive scrapers
      {
        userAgent: [
          'AhrefsBot',
          'MJ12bot',
          'DotBot',
          'SemrushBot',
          'PetalBot',
          'YandexBot',
          'BLEXBot',
        ],
        disallow: ['/'],          // Block entirely
      },
    ],
    
    // === SITEMAP REFERENCE ===
    sitemap: `${baseUrl}/sitemap.xml`,
    
    // === ADDITIONAL DIRECTIVES ===
    host: baseUrl.replace(/^https?:\/\//, ''), // Clean host without protocol
  };
}

/**
 * Security Notes:
 * 
 * 1. Private Routes: All authenticated areas (/brand/, /manufacturer/) are blocked
 * 2. API Protection: All /api/ routes are blocked to prevent scraping
 * 3. User Data: Certificate and user-specific routes are protected
 * 4. Rate Limiting: Crawl delays prevent server overload
 * 5. Bot Filtering: Aggressive scrapers are blocked entirely
 * 
 * SEO Benefits:
 * 
 * 1. Clear sitemap reference helps search engines find all public content
 * 2. Selective allowlisting ensures only valuable content is indexed
 * 3. Social media bots can access pages for rich link previews
 * 4. Major search engines get optimized crawl rules
 */
