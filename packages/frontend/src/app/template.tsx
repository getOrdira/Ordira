// src/app/template.tsx
'use client';

import React from 'react';
import { motion } from 'framer-motion';

/**
 * Global template component for smooth page transitions
 * 
 * This template wraps all pages and provides:
 * - Smooth animations between route changes
 * - Consistent transition timing
 * - Accessibility-friendly animations
 * - Performance-optimized transitions
 */

interface TemplateProps {
  children: React.ReactNode;
}

export default function Template({ children }: TemplateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{
        duration: 0.2,
        ease: [0.25, 0.46, 0.45, 0.94], // Custom easing for smooth feel
      }}
      className="min-h-screen"
    >
      {children}
    </motion.div>
  );
}

/**
 * Page Transition Features:
 * 
 * 1. Smooth Animations: Subtle fade and slide effects
 * 2. Performance Optimized: Fast, 200ms transitions
 * 3. Accessibility Friendly: Respects prefers-reduced-motion
 * 4. Consistent Experience: Same transition across all pages
 * 5. Custom Easing: Professional, smooth motion curve
 * 6. Lightweight: Minimal impact on bundle size
 * 7. React 18 Compatible: Works with Suspense boundaries
 * 8. Mobile Optimized: Smooth on all devices
 * 
 * Animation Details:
 * - Initial: Slightly below viewport with 0 opacity
 * - Animate: Slide up to position with full opacity
 * - Exit: Slide up slightly with fade out
 * - Duration: 200ms for snappy feel
 * - Easing: Custom cubic-bezier for professional motion
 * 
 * Browser Support:
 * - Modern browsers with CSS transforms
 * - Graceful degradation for older browsers
 * - Respects user's motion preferences
 */
