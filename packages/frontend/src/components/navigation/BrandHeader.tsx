// src/components/navigation/BrandHeader.tsx
'use client';

import React from 'react';
import { BrandUser } from '@/lib/typessss/user';
import { BaseHeader } from './baseHeader';

interface BrandHeaderProps {
  user: BrandUser;
}

export function BrandHeader({ user }: BrandHeaderProps) {
  return (
    <BaseHeader 
      user={user} 
      className="bg-[var(--card-bg)] border-b border-[var(--border)]" 
    />
  );
}
