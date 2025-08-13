/ src/app/layout.tsx
import './globals.css';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { Providers } from '@/components/providers';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

const mono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
});

export const metadata = {
  title: 'B2B Platform',
  description: 'Brand and Manufacturer Collaboration Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${mono.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
