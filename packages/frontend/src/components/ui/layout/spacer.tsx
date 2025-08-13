// src/components/ui/layout/spacer.tsx
'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const spacerVariants = cva(
  // Base spacer styles
  "block",
  {
    variants: {
      size: {
        xs: "w-1 h-1",
        sm: "w-2 h-2",
        md: "w-4 h-4",
        lg: "w-6 h-6",
        xl: "w-8 h-8",
        "2xl": "w-12 h-12",
        "3xl": "w-16 h-16",
        auto: "flex-1"
      },
      axis: {
        both: "",
        x: "h-0",
        y: "w-0"
      }
    },
    compoundVariants: [
      // X-axis specific sizes
      {
        axis: "x",
        size: "xs",
        class: "w-1"
      },
      {
        axis: "x", 
        size: "sm",
        class: "w-2"
      },
      {
        axis: "x",
        size: "md", 
        class: "w-4"
      },
      {
        axis: "x",
        size: "lg",
        class: "w-6"
      },
      {
        axis: "x",
        size: "xl",
        class: "w-8"
      },
      {
        axis: "x",
        size: "2xl",
        class: "w-12"
      },
      {
        axis: "x",
        size: "3xl", 
        class: "w-16"
      },
      // Y-axis specific sizes
      {
        axis: "y",
        size: "xs",
        class: "h-1"
      },
      {
        axis: "y",
        size: "sm",
        class: "h-2"
      },
      {
        axis: "y",
        size: "md",
        class: "h-4"
      },
      {
        axis: "y",
        size: "lg", 
        class: "h-6"
      },
      {
        axis: "y",
        size: "xl",
        class: "h-8"
      },
      {
        axis: "y",
        size: "2xl",
        class: "h-12"
      },
      {
        axis: "y",
        size: "3xl",
        class: "h-16"
      }
    ],
    defaultVariants: {
      size: "md",
      axis: "both"
    }
  }
);

export interface SpacerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spacerVariants> {
  grow?: boolean;
  shrink?: boolean;
  width?: string | number;
  height?: string | number;
}

const Spacer = React.forwardRef<HTMLDivElement, SpacerProps>(
  ({ 
    className, 
    size, 
    axis, 
    grow = false, 
    shrink = true, 
    width, 
    height,
    style,
    ...props 
  }, ref) => {
    const spacerClassName = cn(
      spacerVariants({ size, axis }),
      grow && "flex-grow",
      shrink && "flex-shrink",
      !shrink && "flex-shrink-0",
      className
    );

    const spacerStyle = {
      ...style,
      ...(width !== undefined && { width: typeof width === 'number' ? `${width}px` : width }),
      ...(height !== undefined && { height: typeof height === 'number' ? `${height}px` : height })
    };

    return (
      <div
        ref={ref}
        className={spacerClassName}
        style={spacerStyle}
        aria-hidden="true"
        {...props}
      />
    );
  }
);

Spacer.displayName = "Spacer";

// Flexible Spacer - Grows to fill available space
export interface FlexSpacerProps extends Omit<SpacerProps, 'size' | 'grow'> {
  basis?: string | number;
}

const FlexSpacer = React.forwardRef<HTMLDivElement, FlexSpacerProps>(
  ({ basis, style, ...props }, ref) => {
    const flexStyle = {
      ...style,
      flex: '1 1 0%',
      ...(basis !== undefined && { 
        flexBasis: typeof basis === 'number' ? `${basis}px` : basis 
      })
    };

    return (
      <Spacer
        ref={ref}
        size="auto"
        grow={true}
        style={flexStyle}
        {...props}
      />
    );
  }
);

FlexSpacer.displayName = "FlexSpacer";

// Vertical Spacer - Specifically for vertical spacing
export interface VSpacerProps extends Omit<SpacerProps, 'axis'> {}

const VSpacer = React.forwardRef<HTMLDivElement, VSpacerProps>(
  (props, ref) => (
    <Spacer ref={ref} axis="y" {...props} />
  )
);

VSpacer.displayName = "VSpacer";

// Horizontal Spacer - Specifically for horizontal spacing
export interface HSpacerProps extends Omit<SpacerProps, 'axis'> {}

const HSpacer = React.forwardRef<HTMLDivElement, HSpacerProps>(
  (props, ref) => (
    <Spacer ref={ref} axis="x" {...props} />
  )
);

HSpacer.displayName = "HSpacer";

// Page Spacer - For consistent page-level spacing
export interface PageSpacerProps extends Omit<SpacerProps, 'size'> {
  section?: boolean;
  page?: boolean;
}

const PageSpacer = React.forwardRef<HTMLDivElement, PageSpacerProps>(
  ({ section = false, page = false, ...props }, ref) => {
    let size: VariantProps<typeof spacerVariants>['size'] = 'lg';
    
    if (section) size = 'xl';
    if (page) size = '3xl';

    return (
      <Spacer ref={ref} size={size} axis="y" {...props} />
    );
  }
);

PageSpacer.displayName = "PageSpacer";

// Responsive Spacer - Different sizes at different breakpoints
export interface ResponsiveSpacerProps extends Omit<SpacerProps, 'size'> {
  sm?: VariantProps<typeof spacerVariants>['size'];
  md?: VariantProps<typeof spacerVariants>['size'];
  lg?: VariantProps<typeof spacerVariants>['size'];
  xl?: VariantProps<typeof spacerVariants>['size'];
}

const ResponsiveSpacer = React.forwardRef<HTMLDivElement, ResponsiveSpacerProps>(
  ({ sm, md, lg, xl, className, axis = 'y', ...props }, ref) => {
    const responsiveClasses = cn(
      // Default size (mobile)
      sm === 'xs' && (axis === 'y' ? 'h-1' : axis === 'x' ? 'w-1' : 'w-1 h-1'),
      sm === 'sm' && (axis === 'y' ? 'h-2' : axis === 'x' ? 'w-2' : 'w-2 h-2'),
      sm === 'md' && (axis === 'y' ? 'h-4' : axis === 'x' ? 'w-4' : 'w-4 h-4'),
      sm === 'lg' && (axis === 'y' ? 'h-6' : axis === 'x' ? 'w-6' : 'w-6 h-6'),
      sm === 'xl' && (axis === 'y' ? 'h-8' : axis === 'x' ? 'w-8' : 'w-8 h-8'),
      
      // SM breakpoint
      md === 'xs' && (axis === 'y' ? 'sm:h-1' : axis === 'x' ? 'sm:w-1' : 'sm:w-1 sm:h-1'),
      md === 'sm' && (axis === 'y' ? 'sm:h-2' : axis === 'x' ? 'sm:w-2' : 'sm:w-2 sm:h-2'),
      md === 'md' && (axis === 'y' ? 'sm:h-4' : axis === 'x' ? 'sm:w-4' : 'sm:w-4 sm:h-4'),
      md === 'lg' && (axis === 'y' ? 'sm:h-6' : axis === 'x' ? 'sm:w-6' : 'sm:w-6 sm:h-6'),
      md === 'xl' && (axis === 'y' ? 'sm:h-8' : axis === 'x' ? 'sm:w-8' : 'sm:w-8 sm:h-8'),
      
      // MD breakpoint
      lg === 'xs' && (axis === 'y' ? 'md:h-1' : axis === 'x' ? 'md:w-1' : 'md:w-1 md:h-1'),
      lg === 'sm' && (axis === 'y' ? 'md:h-2' : axis === 'x' ? 'md:w-2' : 'md:w-2 md:h-2'),
      lg === 'md' && (axis === 'y' ? 'md:h-4' : axis === 'x' ? 'md:w-4' : 'md:w-4 md:h-4'),
      lg === 'lg' && (axis === 'y' ? 'md:h-6' : axis === 'x' ? 'md:w-6' : 'md:w-6 md:h-6'),
      lg === 'xl' && (axis === 'y' ? 'md:h-8' : axis === 'x' ? 'md:w-8' : 'md:w-8 md:h-8'),
      
      // LG breakpoint
      xl === 'xs' && (axis === 'y' ? 'lg:h-1' : axis === 'x' ? 'lg:w-1' : 'lg:w-1 lg:h-1'),
      xl === 'sm' && (axis === 'y' ? 'lg:h-2' : axis === 'x' ? 'lg:w-2' : 'lg:w-2 lg:h-2'),
      xl === 'md' && (axis === 'y' ? 'lg:h-4' : axis === 'x' ? 'lg:w-4' : 'lg:w-4 lg:h-4'),
      xl === 'lg' && (axis === 'y' ? 'lg:h-6' : axis === 'x' ? 'lg:w-6' : 'lg:w-6 lg:h-6'),
      xl === 'xl' && (axis === 'y' ? 'lg:h-8' : axis === 'x' ? 'lg:w-8' : 'lg:w-8 lg:h-8')
    );

    return (
      <div
        ref={ref}
        className={cn(
          "block",
          axis === 'x' && "h-0",
          axis === 'y' && "w-0",
          responsiveClasses,
          className
        )}
        aria-hidden="true"
        {...props}
      />
    );
  }
);

ResponsiveSpacer.displayName = "ResponsiveSpacer";

// Between Spacer - For spacing between specific elements
export interface BetweenSpacerProps extends Omit<SpacerProps, 'size'> {
  elements?: 'cards' | 'sections' | 'components' | 'text';
}

const BetweenSpacer = React.forwardRef<HTMLDivElement, BetweenSpacerProps>(
  ({ elements = 'components', ...props }, ref) => {
    let size: VariantProps<typeof spacerVariants>['size'] = 'md';
    
    switch (elements) {
      case 'cards':
        size = 'lg';
        break;
      case 'sections':
        size = 'xl';
        break;
      case 'components':
        size = 'md';
        break;
      case 'text':
        size = 'sm';
        break;
    }

    return (
      <Spacer ref={ref} size={size} axis="y" {...props} />
    );
  }
);

BetweenSpacer.displayName = "BetweenSpacer";

// Stack Spacer - For consistent spacing in stacks
export interface StackSpacerProps extends Omit<SpacerProps, 'axis'> {
  direction?: 'vertical' | 'horizontal';
}

const StackSpacer = React.forwardRef<HTMLDivElement, StackSpacerProps>(
  ({ direction = 'vertical', ...props }, ref) => (
    <Spacer 
      ref={ref} 
      axis={direction === 'vertical' ? 'y' : 'x'} 
      {...props} 
    />
  )
);

StackSpacer.displayName = "StackSpacer";

// Gutter - Consistent spacing for grid gutters
export interface GutterProps extends Omit<SpacerProps, 'size' | 'axis'> {
  gutter?: 'tight' | 'normal' | 'wide' | 'loose';
  orientation?: 'horizontal' | 'vertical' | 'both';
}

const Gutter = React.forwardRef<HTMLDivElement, GutterProps>(
  ({ gutter = 'normal', orientation = 'both', ...props }, ref) => {
    let size: VariantProps<typeof spacerVariants>['size'] = 'md';
    
    switch (gutter) {
      case 'tight':
        size = 'sm';
        break;
      case 'normal':
        size = 'md';
        break;
      case 'wide':
        size = 'lg';
        break;
      case 'loose':
        size = 'xl';
        break;
    }

    let axis: VariantProps<typeof spacerVariants>['axis'] = 'both';
    
    switch (orientation) {
      case 'horizontal':
        axis = 'x';
        break;
      case 'vertical':
        axis = 'y';
        break;
      case 'both':
        axis = 'both';
        break;
    }

    return (
      <Spacer ref={ref} size={size} axis={axis} {...props} />
    );
  }
);

Gutter.displayName = "Gutter";

// Margin Spacer - For consistent margin-like spacing
export interface MarginSpacerProps extends Omit<SpacerProps, 'size'> {
  margin?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

const MarginSpacer = React.forwardRef<HTMLDivElement, MarginSpacerProps>(
  ({ margin = 'md', ...props }, ref) => (
    <Spacer ref={ref} size={margin as any} {...props} />
  )
);

MarginSpacer.displayName = "MarginSpacer";

// Padding Spacer - For consistent padding-like spacing
export interface PaddingSpacerProps extends Omit<SpacerProps, 'size'> {
  padding?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

const PaddingSpacer = React.forwardRef<HTMLDivElement, PaddingSpacerProps>(
  ({ padding = 'md', ...props }, ref) => (
    <Spacer ref={ref} size={padding as any} {...props} />
  )
);

PaddingSpacer.displayName = "PaddingSpacer";

// Custom Spacer - For precise custom spacing
export interface CustomSpacerProps extends Omit<SpacerProps, 'size'> {
  space: string | number;
  unit?: 'px' | 'rem' | 'em' | '%' | 'vh' | 'vw';
}

const CustomSpacer = React.forwardRef<HTMLDivElement, CustomSpacerProps>(
  ({ space, unit = 'px', axis = 'y', style, ...props }, ref) => {
    const customStyle = {
      ...style,
      [axis === 'x' ? 'width' : axis === 'y' ? 'height' : 'width']: 
        typeof space === 'number' ? `${space}${unit}` : space,
      ...(axis === 'both' && typeof space === 'number' && {
        height: `${space}${unit}`
      })
    };

    return (
      <div
        ref={ref}
        className={cn(
          "block",
          axis === 'x' && "h-0",
          axis === 'y' && "w-0"
        )}
        style={customStyle}
        aria-hidden="true"
        {...props}
      />
    );
  }
);

CustomSpacer.displayName = "CustomSpacer";

export { 
  Spacer, 
  FlexSpacer, 
  VSpacer, 
  HSpacer, 
  PageSpacer, 
  ResponsiveSpacer, 
  BetweenSpacer, 
  StackSpacer, 
  Gutter, 
  MarginSpacer, 
  PaddingSpacer, 
  CustomSpacer,
  spacerVariants 
};