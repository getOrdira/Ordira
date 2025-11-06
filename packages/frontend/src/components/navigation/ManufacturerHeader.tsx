// src/components/navigation/ManufacturerHeader.tsx
'use client';

import React from 'react';
import { ManufacturerUser } from '@/lib/typessss/user';
import { BaseHeader } from './baseHeader';

interface ManufacturerHeaderProps {
  user: ManufacturerUser;
}

export function ManufacturerHeader({ user }: ManufacturerHeaderProps) {
  return (
    <BaseHeader 
      user={user} 
      className="bg-[var(--card-bg)] border-b border-[var(--border)]" 
    />
  );
}
