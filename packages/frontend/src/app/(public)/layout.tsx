// src/app/(public)/layout.tsx
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ordira - Decentralized Manufacturing Platform',
  description: 'Connect brands with verified manufacturers through blockchain technology.',
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}
