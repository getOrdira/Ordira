// src/components/ui/navigation/button-link.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { Button, type ButtonProps } from '@/components/ui/primitives/button';
import { cn } from '@/lib/utils';

export interface ButtonLinkProps extends Omit<ButtonProps, 'asChild'> {
  href: string;
  external?: boolean;
  replace?: boolean;
  scroll?: boolean;
  prefetch?: boolean;
  target?: string;
  rel?: string;
}

const ButtonLink = React.forwardRef<HTMLAnchorElement, ButtonLinkProps>(
  ({ 
    href, 
    external = false, 
    replace = false,
    scroll = true,
    prefetch,
    target,
    rel,
    className,
    children,
    disabled,
    ...buttonProps 
  }, ref) => {
    // Determine if it's an external link
    const isExternal = external || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:');
    
    // Handle disabled state
    if (disabled) {
      return (
        <Button
          {...buttonProps}
          disabled={disabled}
          className={cn(className)}
          ref={ref as any}
        >
          {children}
        </Button>
      );
    }

    // External link
    if (isExternal) {
      return (
        <Button
          {...buttonProps}
          asChild
          className={cn(className)}
        >
          <a
            href={href}
            target={target || '_blank'}
            rel={rel || 'noopener noreferrer'}
            ref={ref}
          >
            {children}
          </a>
        </Button>
      );
    }

    // Internal link (Next.js Link)
    return (
      <Button
        {...buttonProps}
        asChild
        className={cn(className)}
      >
        <Link
          href={href}
          replace={replace}
          scroll={scroll}
          prefetch={prefetch}
          ref={ref}
        >
          {children}
        </Link>
      </Button>
    );
  }
);

ButtonLink.displayName = "ButtonLink";

// Convenience components for common variants
export const PrimaryButtonLink = React.forwardRef<HTMLAnchorElement, Omit<ButtonLinkProps, 'variant'>>(
  (props, ref) => <ButtonLink {...props} variant="primary" ref={ref} />
);
PrimaryButtonLink.displayName = "PrimaryButtonLink";

export const SecondaryButtonLink = React.forwardRef<HTMLAnchorElement, Omit<ButtonLinkProps, 'variant'>>(
  (props, ref) => <ButtonLink {...props} variant="secondary" ref={ref} />
);
SecondaryButtonLink.displayName = "SecondaryButtonLink";

export const OutlineButtonLink = React.forwardRef<HTMLAnchorElement, Omit<ButtonLinkProps, 'variant'>>(
  (props, ref) => <ButtonLink {...props} variant="outline" ref={ref} />
);
OutlineButtonLink.displayName = "OutlineButtonLink";

export const GhostButtonLink = React.forwardRef<HTMLAnchorElement, Omit<ButtonLinkProps, 'variant'>>(
  (props, ref) => <ButtonLink {...props} variant="ghost" ref={ref} />
);
GhostButtonLink.displayName = "GhostButtonLink";

export const DestructiveButtonLink = React.forwardRef<HTMLAnchorElement, Omit<ButtonLinkProps, 'variant'>>(
  (props, ref) => <ButtonLink {...props} variant="destructive" ref={ref} />
);
DestructiveButtonLink.displayName = "DestructiveButtonLink";

export { ButtonLink };
export default ButtonLink;
