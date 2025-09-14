// src/app/(public)/page.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/primitives/button';
import { ArrowRightIcon, CubeIcon } from '@heroicons/react/24/outline';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="relative z-10">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
                <CubeIcon className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-white">Ordira</span>
            </div>
            
            {/* Navigation */}
            <nav className="flex items-center space-x-6">
              <Link href="/auth/login" className="text-gray-300 hover:text-white transition-colors">
                Sign In
              </Link>
              <Link href="https://ordira.xyz" className="text-gray-300 hover:text-white transition-colors">
                Learn More
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10">
        <div className="mx-auto max-w-4xl text-center py-20">
          <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight mb-6">
            Welcome to
            <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              {' '}Ordira
            </span>
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Your gateway to decentralized manufacturing. Sign in to access your dashboard and continue collaborating.
          </p>
          
          <div className="space-y-4">
            <Link href="/auth/login">
              <Button 
                size="lg" 
                className="min-w-[200px] bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0"
              >
                Sign In to Your Account
                <ArrowRightIcon className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            
            <div className="text-center">
              <p className="text-gray-400 text-sm">
                New to Ordira?{' '}
                <Link href="https://ordira.xyz" className="text-purple-400 hover:text-purple-300">
                  Learn more about our platform
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-8">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <p className="text-gray-400 text-sm">
            © 2024 Ordira. All rights reserved. | 
            <Link href="https://ordira.xyz" className="text-purple-400 hover:text-purple-300 ml-1">
              Visit our website
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
