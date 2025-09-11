/// <reference types="next" />
/// <reference types="next/image-types/global" />


// Extend global types for better TypeScript support
declare global {
  // Environment variables
  namespace NodeJS {
    interface ProcessEnv {
      // API Configuration
      NEXT_PUBLIC_API_URL: string;
      NEXT_PUBLIC_FRONTEND_URL: string;
      
      // Authentication
      NEXTAUTH_SECRET: string;
      NEXTAUTH_URL: string;
      
      // Blockchain/Web3
      NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: string;
      NEXT_PUBLIC_BASE_RPC_URL: string;
      NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL: string;
      NEXT_PUBLIC_ETHEREUM_RPC_URL: string;
      NEXT_PUBLIC_POLYGON_RPC_URL: string;
      
      // External Services
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: string;
      NEXT_PUBLIC_GOOGLE_ANALYTICS_ID: string;
      
      // Feature Flags
      NEXT_PUBLIC_ENABLE_WEB3: string;
      NEXT_PUBLIC_ENABLE_ANALYTICS: string;
      NEXT_PUBLIC_ENABLE_NOTIFICATIONS: string;
      
      // Environment
      NODE_ENV: 'development' | 'production' | 'test';
      VERCEL_ENV?: 'development' | 'preview' | 'production';
    }
  }

  // CSS Custom Properties for theme consistency
  interface CSSStyleDeclaration {
    // Ordira Theme Variables
    '--primary': string;
    '--primary-dark': string;
    '--secondary': string;
    '--secondary-dark': string;
    '--accent': string;
    '--ordira-accent': string;
    '--ordira-black': string;
    
    // Semantic Colors
    '--success': string;
    '--success-dark': string;
    '--warning': string;
    '--warning-dark': string;
    '--error': string;
    '--error-dark': string;
    '--info': string;
    '--info-dark': string;
    
    // UI Colors
    '--background': string;
    '--background-secondary': string;
    '--background-tertiary': string;
    '--foreground': string;
    '--foreground-secondary': string;
    '--muted': string;
    '--muted-foreground': string;
    
    // Interactive States
    '--hover-overlay': string;
    '--focus-ring': string;
    '--border': string;
    '--border-dark': string;
    
    // Typography
    '--heading-color': string;
    '--body-color': string;
    '--caption-color': string;
    '--input-placeholder': string;
    
    // Components
    '--card-bg': string;
    '--card-border': string;
    '--card-shadow': string;
    '--card-shadow-lg': string;
  }

  // Window extensions for Web3 providers
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      isCoinbaseWallet?: boolean;
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, handler: (...args: any[]) => void) => void;
      removeListener: (event: string, handler: (...args: any[]) => void) => void;
    };
    
    // Analytics
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
    
    // Feature detection
    __ORDIRA_APP__?: boolean;
  }

  // Extend React types for better component typing
  namespace React {
    interface CSSProperties {
      // CSS custom properties
      [key: `--${string}`]: string | number | undefined;
    }
  }
}

// Module declarations for assets and special imports
declare module '*.svg' {
  import React from 'react';
  const content: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.jpeg' {
  const content: string;
  export default content;
}

declare module '*.gif' {
  const content: string;
  export default content;
}

declare module '*.webp' {
  const content: string;
  export default content;
}

declare module '*.ico' {
  const content: string;
  export default content;
}

declare module '*.bmp' {
  const content: string;
  export default content;
}

// Font declarations for Satoshi font family
declare module '*.woff' {
  const content: string;
  export default content;
}

declare module '*.woff2' {
  const content: string;
  export default content;
}

declare module '*.ttf' {
  const content: string;
  export default content;
}

declare module '*.otf' {
  const content: string;
  export default content;
}

// CSS Modules
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module '*.module.scss' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module '*.module.sass' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

// JSON files
declare module '*.json' {
  const content: any;
  export default content;
}

// Markdown files
declare module '*.md' {
  const content: string;
  export default content;
}

declare module '*.mdx' {
  const content: string;
  export default content;
}

// Web Workers
declare module '*?worker' {
  class WebpackWorker extends Worker {
    constructor();
  }
  export default WebpackWorker;
}

// URL imports
declare module '*?url' {
  const content: string;
  export default content;
}

// Raw imports
declare module '*?raw' {
  const content: string;
  export default content;
}

// Inline imports
declare module '*?inline' {
  const content: string;
  export default content;
}

export {};
