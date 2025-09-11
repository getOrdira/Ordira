// src/app/(lang)/layout.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

/**
 * Language layout wrapper for internationalization
 * 
 * This layout handles:
 * - Language detection and routing
 * - Locale-specific formatting
 * - RTL/LTR text direction
 * - Currency and date formatting
 * 
 * Currently configured for English (en-US) with expansion capability
 */

interface LangLayoutProps {
  children: React.ReactNode;
}

// Supported languages configuration
const SUPPORTED_LOCALES = {
  'en': {
    code: 'en-US',
    name: 'English',
    dir: 'ltr',
    currency: 'USD',
    dateFormat: 'MM/dd/yyyy',
  },
  'es': {
     code: 'es-ES',
     name: 'Español',
     dir: 'ltr',
     currency: 'EUR',
     dateFormat: 'dd/MM/yyyy',
  },
  'fr': {
     code: 'fr-FR',
     name: 'Français',
     dir: 'ltr',
     currency: 'EUR',
     dateFormat: 'dd/MM/yyyy',
  },
} as const;

type SupportedLocale = keyof typeof SUPPORTED_LOCALES;

export default function LangLayout({ children }: LangLayoutProps) {
  const [locale, setLocale] = useState<SupportedLocale>('en');
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Detect language from various sources
    const detectLanguage = (): SupportedLocale => {
      // 1. Check URL parameter
      const urlParams = new URLSearchParams(window.location.search);
      const urlLang = urlParams.get('lang') as SupportedLocale;
      if (urlLang && SUPPORTED_LOCALES[urlLang]) {
        return urlLang;
      }

      // 2. Check localStorage
      const storedLang = localStorage.getItem('ordira-language') as SupportedLocale;
      if (storedLang && SUPPORTED_LOCALES[storedLang]) {
        return storedLang;
      }

      // 3. Check browser language
      const browserLang = navigator.language.split('-')[0] as SupportedLocale;
      if (browserLang && SUPPORTED_LOCALES[browserLang]) {
        return browserLang;
      }

      // 4. Default to English
      return 'en';
    };

    const detectedLocale = detectLanguage();
    setLocale(detectedLocale);
    
    // Store preference
    localStorage.setItem('ordira-language', detectedLocale);
    
    // Set document attributes
    const localeConfig = SUPPORTED_LOCALES[detectedLocale];
    document.documentElement.lang = localeConfig.code;
    document.documentElement.dir = localeConfig.dir;
    
    setIsLoading(false);
  }, []);

  // Update locale and persist preference
  const updateLocale = (newLocale: SupportedLocale) => {
    setLocale(newLocale);
    localStorage.setItem('ordira-language', newLocale);
    
    const localeConfig = SUPPORTED_LOCALES[newLocale];
    document.documentElement.lang = localeConfig.code;
    document.documentElement.dir = localeConfig.dir;

    // Update URL if needed
    const url = new URL(window.location.href);
    url.searchParams.set('lang', newLocale);
    router.replace(url.pathname + url.search);
  };

  // Show loading state briefly while detecting language
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-6 h-6 mx-auto mb-3 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-[var(--muted)] font-satoshi">Initializing...</p>
        </div>
      </div>
    );
  }

  const currentLocaleConfig = SUPPORTED_LOCALES[locale];

  return (
    <div 
      className="min-h-screen"
      data-locale={locale}
      data-currency={currentLocaleConfig.currency}
      data-date-format={currentLocaleConfig.dateFormat}
    >
      {/* Language Context Provider would go here in the future */}
      {children}
      
      {/* Language Selector (hidden for now, can be enabled later) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 z-50">
          <select
            value={locale}
            onChange={(e) => updateLocale(e.target.value as SupportedLocale)}
            className="px-3 py-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg text-sm font-satoshi focus:outline-none focus:border-[var(--primary)]"
          >
            {Object.entries(SUPPORTED_LOCALES).map(([code, config]) => (
              <option key={code} value={code}>
                {config.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

/**
 * Future Internationalization Features:
 * 
 * 1. Translation System: Integrate with next-intl or similar
 * 2. Dynamic Imports: Load language files on demand
 * 3. Currency Formatting: Locale-specific currency display
 * 4. Date Formatting: Regional date/time formats
 * 5. Number Formatting: Locale-specific number formats
 * 6. RTL Support: Right-to-left languages
 * 7. Pluralization: Complex plural rules
 * 8. Context-aware Translations: Gender, formality levels
 * 
 * Current Status:
 * - Basic language detection and persistence
 * - Document attribute management
 * - Foundation for future i18n implementation
 * - Development-only language selector
 */
