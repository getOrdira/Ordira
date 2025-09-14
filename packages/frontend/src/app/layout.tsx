// src/app/layout.tsx
import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { AppProvider } from '@/providers/app-provider';
import { cn } from '@/lib/utils';
import '@/styles/globals.css';

// Font configuration
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

/**
 * Root metadata for the application.
 * This information is used for SEO, social sharing, and browser display.
 */
export const metadata: Metadata = {
  title: {
    default: 'Ordira - Decentralized Manufacturing Platform',
    template: '%s | Ordira'
  },
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
  authors: [{ name: 'Ordira Team' }],
  creator: 'Ordira',
  publisher: 'Ordira',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://app.ordira.xyz'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    title: 'Ordira - Decentralized Manufacturing Platform',
    description: 'A unified collaboration layer for decentralized on-demand manufacturing. Align production with actual demand.',
    siteName: 'Ordira',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Ordira - Decentralized Manufacturing Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ordira - Decentralized Manufacturing Platform',
    description: 'A unified collaboration layer for decentralized on-demand manufacturing.',
    images: ['/og-image.png'],
    creator: '@ordira',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
  },
  manifest: '/site.webmanifest',
};

/**
 * Viewport configuration for responsive design and mobile optimization
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#171717' },
  ],
};

/**
 * Root layout component for the entire application.
 * 
 * This component:
 * - Sets up the HTML structure with proper language and fonts
 * - Provides global providers (Auth, Query, etc.)
 * - Configures accessibility and performance optimizations
 * - Handles font loading and CSS variable setup
 * 
 * @param children - The child components to be rendered
 * @returns The root layout structure with providers and global setup
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html 
      lang="en" 
      className={cn(
        inter.variable,
        jetbrainsMono.variable,
        // CSS variables for consistent font usage throughout app
        'font-sans antialiased'
      )}
      suppressHydrationWarning
    >
      <head>
        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* DNS prefetch for common external resources */}
        <link rel="dns-prefetch" href="https://api.ordira.com" />
        
        {/* Security headers via meta tags */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
        <meta httpEquiv="Permissions-Policy" content="camera=(), microphone=(), geolocation=()" />
      </head>
      <body 
        className={cn(
          // Base body styles
          "min-h-screen bg-background font-sans antialiased",
          // Prevent horizontal scroll
          "overflow-x-hidden",
          // Smooth scrolling
          "scroll-smooth",
          inter.className
        )}
      >
        {/* Skip to main content link for accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2"
        >
          Skip to main content
        </a>

        {/* Global providers wrapper */}
        <AppProvider>
          {/* Main content wrapper */}
          <div 
            id="main-content" 
            className="relative flex min-h-screen flex-col"
          >
            {children}
          </div>
          
          {/* Global loading indicator portal */}
          <div id="global-loading-portal" />
          
          {/* Toast notifications portal */}
          <div id="toast-portal" />
          
          {/* Modal portal */}
          <div id="modal-portal" />
        </AppProvider>

        {/* Development tools in development mode */}
        {process.env.NODE_ENV === 'development' && (
          <>
            {/* React Query Devtools will be injected here by QueryProvider */}
          </>
        )}

        {/* Analytics and monitoring scripts */}
        {process.env.NODE_ENV === 'production' && (
          <>
            {/* Add your analytics scripts here */}
            {process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID && (
              <>
                <script
                  async
                  src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID}`}
                />
                <script
                  dangerouslySetInnerHTML={{
                    __html: `
                      window.dataLayer = window.dataLayer || [];
                      function gtag(){dataLayer.push(arguments);}
                      gtag('js', new Date());
                      gtag('config', '${process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID}', {
                        page_title: document.title,
                        page_location: window.location.href,
                      });
                    `,
                  }}
                />
              </>
            )}
          </>
        )}

        {/* Service worker registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(registration) {
                    console.log('SW registered: ', registration);
                  }).catch(function(registrationError) {
                    console.log('SW registration failed: ', registrationError);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}