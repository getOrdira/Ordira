// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
      appDir: true,
    },
    images: {
      domains: ['localhost', 'your-domain.com'],
    },
    env: {
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
    },
  }
  
  module.exports = nextConfig
  
  // tailwind.config.js
  /** @type {import('tailwindcss').Config} */
  module.exports = {
    content: [
      './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
      './src/components/**/*.{js,ts,jsx,tsx,mdx}',
      './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
      extend: {
        colors: {
          background: '#ffffff',
          foreground: '#171717',
          accent: '#3B82F6',
          'accent-dark': '#2563EB',
          dark: '#171717',
          muted: '#6B7280',
        },
      },
    },
    plugins: [],
  }
  