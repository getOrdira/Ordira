// src/lib/utils/metadata.ts
import type { Metadata } from 'next';

/**
 * Metadata generation utilities for Ordira platform
 * 
 * These utilities help generate consistent, SEO-optimized metadata
 * across all pages in the application.
 */

interface MetadataOptions {
  title?: string;
  description?: string;
  keywords?: string[];
  image?: string;
  noIndex?: boolean;
  canonical?: string;
  type?: 'website' | 'article' | 'product';
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  section?: string;
}

const DEFAULT_METADATA = {
  title: 'Ordira - Decentralized Manufacturing Platform',
  description: 'A unified collaboration layer for decentralized on-demand manufacturing. Align production with actual demand through transparent voting and blockchain certificates.',
  keywords: [
    'manufacturing',
    'decentralized',
    'on-demand',
    'blockchain',
    'collaboration',
    'supply chain',
    'transparency',
    'voting',
    'certificates'
  ],
  image: '/og-image.png',
  url: process.env.NEXT_PUBLIC_APP_URL || 'https://ordira.xyz',
  siteName: 'Ordira',
  locale: 'en_US',
  twitterHandle: '@ordiraxyz',
};

/**
 * Generate metadata for a page
 */
export function generateMetadata(options: MetadataOptions = {}): Metadata {
  const {
    title,
    description = DEFAULT_METADATA.description,
    keywords = [],
    image = DEFAULT_METADATA.image,
    noIndex = false,
    canonical,
    type = 'website',
    publishedTime,
    modifiedTime,
    author,
    section,
  } = options;

  // Create full title
  const fullTitle = title 
    ? `${title} | ${DEFAULT_METADATA.siteName}`
    : DEFAULT_METADATA.title;

  // Combine keywords
  const allKeywords = [...DEFAULT_METADATA.keywords, ...keywords];

  // Build metadata object
  const metadata: Metadata = {
    title: fullTitle,
    description,
    keywords: allKeywords,
    authors: author ? [{ name: author }] : [{ name: 'Ordira Team' }],
    creator: 'Ordira',
    publisher: 'Ordira',
    
    // Robots
    robots: {
      index: !noIndex,
      follow: !noIndex,
      googleBot: {
        index: !noIndex,
        follow: !noIndex,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },

    // Open Graph
    openGraph: {
      type: type === 'product' ? 'website' : type,
      locale: DEFAULT_METADATA.locale,
      url: canonical || DEFAULT_METADATA.url,
      title: fullTitle,
      description,
      siteName: DEFAULT_METADATA.siteName,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: fullTitle,
        },
      ],
      ...(publishedTime && { publishedTime }),
      ...(modifiedTime && { modifiedTime }),
      ...(section && { section }),
    } as any,

    // Twitter
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [image],
      creator: DEFAULT_METADATA.twitterHandle,
      site: DEFAULT_METADATA.twitterHandle,
    },

    // Canonical URL
    ...(canonical && {
      alternates: {
        canonical,
      },
    }),

    // Additional metadata
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
  };

  return metadata;
}

/**
 * Generate metadata for brand pages
 */
export function generateBrandMetadata(options: MetadataOptions & {
  brandName?: string;
}): Metadata {
  const { brandName, ...rest } = options;
  
  return generateMetadata({
    ...rest,
    title: brandName ? `${brandName} Dashboard` : 'Brand Dashboard',
    description: rest.description || `Manage your manufacturing brand, products, and analytics with Ordira's decentralized platform.`,
    keywords: [...(rest.keywords || []), 'brand dashboard', 'manufacturing management', 'product analytics'],
    noIndex: true, // Brand dashboards should not be indexed
  });
}

/**
 * Generate metadata for manufacturer pages
 */
export function generateManufacturerMetadata(options: MetadataOptions & {
  manufacturerName?: string;
}): Metadata {
  const { manufacturerName, ...rest } = options;
  
  return generateMetadata({
    ...rest,
    title: manufacturerName ? `${manufacturerName} Dashboard` : 'Manufacturer Dashboard',
    description: rest.description || `Access your manufacturing dashboard, manage products, and collaborate with brands on Ordira.`,
    keywords: [...(rest.keywords || []), 'manufacturer dashboard', 'production management', 'manufacturing analytics'],
    noIndex: true, // Manufacturer dashboards should not be indexed
  });
}

/**
 * Generate metadata for customer pages
 */
export function generateCustomerMetadata(options: MetadataOptions & {
  brandName?: string;
}): Metadata {
  const { brandName, ...rest } = options;
  
  return generateMetadata({
    ...rest,
    title: brandName ? `${brandName} Products` : 'Manufacturing Products',
    description: rest.description || `Discover and vote on manufacturing products. Participate in decentralized production decisions.`,
    keywords: [...(rest.keywords || []), 'product voting', 'manufacturing marketplace', 'decentralized products'],
  });
}

/**
 * Generate metadata for product pages
 */
export function generateProductMetadata(options: MetadataOptions & {
  productName?: string;
  price?: number;
  currency?: string;
  availability?: string;
}): Metadata {
  const { productName, price, currency = 'USD', availability, ...rest } = options;
  
  const metadata = generateMetadata({
    ...rest,
    type: 'product',
    title: productName || 'Manufacturing Product',
    description: rest.description || `High-quality manufacturing product available through Ordira's decentralized platform.`,
    keywords: [...(rest.keywords || []), 'manufacturing product', 'blockchain certificate', 'quality assured'],
  });

  // Add product-specific Open Graph data
  if (metadata.openGraph) {
    metadata.openGraph = {
      ...metadata.openGraph,
      type: 'product' as any,
      ...(price && {
        // @ts-ignore - product specific OG tags
        'product:price:amount': price,
        'product:price:currency': currency,
      }),
      ...(availability && {
        // @ts-ignore - product specific OG tags
        'product:availability': availability,
      }),
    } as any;
  }

  return metadata;
}

/**
 * Generate metadata for authentication pages
 */
export function generateAuthMetadata(options: MetadataOptions & {
  authType?: 'login' | 'register' | 'verify' | 'reset';
}): Metadata {
  const { authType = 'login', ...rest } = options;
  
  const titles = {
    login: 'Sign In',
    register: 'Create Account',
    verify: 'Verify Email',
    reset: 'Reset Password',
  };

  const descriptions = {
    login: 'Sign in to your Ordira account to access your manufacturing dashboard.',
    register: 'Join Ordira\'s decentralized manufacturing platform. Create your account today.',
    verify: 'Verify your email address to complete your Ordira account setup.',
    reset: 'Reset your Ordira account password to regain access to your dashboard.',
  };

  return generateMetadata({
    ...rest,
    title: titles[authType],
    description: rest.description || descriptions[authType],
    keywords: [...(rest.keywords || []), 'authentication', 'account', 'manufacturing platform'],
    noIndex: true, // Auth pages should not be indexed
  });
}

/**
 * Generate JSON-LD structured data
 */
export function generateStructuredData(type: 'Organization' | 'WebSite' | 'Product', data: any) {
  const baseUrl = DEFAULT_METADATA.url;
  
  const schemas = {
    Organization: {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: DEFAULT_METADATA.siteName,
      url: baseUrl,
      logo: `${baseUrl}/logo.png`,
      description: DEFAULT_METADATA.description,
      sameAs: [
        'https://twitter.com/ordira',
        'https://linkedin.com/company/ordira',
      ],
      ...data,
    },
    
    WebSite: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: DEFAULT_METADATA.siteName,
      url: baseUrl,
      description: DEFAULT_METADATA.description,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${baseUrl}/search?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
      ...data,
    },
    
    Product: {
      '@context': 'https://schema.org',
      '@type': 'Product',
      ...data,
    },
  };

  return schemas[type];
}

/**
 * Default metadata for different page types
 */
export const PAGE_METADATA = {
  home: generateMetadata(),
  pricing: generateMetadata({
    title: 'Pricing Plans',
    description: 'Choose the perfect plan for your manufacturing needs. Transparent pricing with no hidden fees.',
    keywords: ['pricing', 'plans', 'manufacturing costs', 'subscription'],
  }),
  about: generateMetadata({
    title: 'About Ordira',
    description: 'Learn about Ordira\'s mission to revolutionize manufacturing through decentralized collaboration.',
    keywords: ['about', 'company', 'mission', 'manufacturing innovation'],
  }),
  contact: generateMetadata({
    title: 'Contact Us',
    description: 'Get in touch with Ordira\'s team. We\'re here to help with your manufacturing needs.',
    keywords: ['contact', 'support', 'help', 'customer service'],
  }),
  docs: generateMetadata({
    title: 'Documentation',
    description: 'Comprehensive documentation for Ordira\'s decentralized manufacturing platform.',
    keywords: ['documentation', 'API', 'guides', 'tutorials'],
  }),
};

/**
 * Utility to extract metadata from content
 */
export function extractMetadataFromContent(content: string, options: Partial<MetadataOptions> = {}) {
  // Extract title from first h1 tag
  const titleMatch = content.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  const title = titleMatch ? titleMatch[1] : options.title;

  // Extract description from first paragraph
  const descMatch = content.match(/<p[^>]*>([^<]+)<\/p>/i);
  const description = descMatch ? descMatch[1].substring(0, 160) : options.description;

  // Extract keywords from meta tags or content
  const keywordMatch = content.match(/keywords?["\s]*[:=]["\s]*([^"'\n]+)/i);
  const keywords = keywordMatch ? keywordMatch[1].split(',').map(k => k.trim()) : options.keywords || [];

  return generateMetadata({
    ...options,
    title,
    description,
    keywords,
  });
}
