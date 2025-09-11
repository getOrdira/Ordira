// src/components/forms/patterns/wizard-form/progress.tsx
'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { CheckIcon } from '@heroicons/react/24/solid';
import type { WizardStepData } from './index';

export interface WizardProgressProps {
  steps: WizardStepData[];
  currentStep: number;
  onStepClick?: (stepIndex: number) => void;
  className?: string;
  variant?: 'default' | 'compact';
  showLabels?: boolean;
}

export const WizardProgress: React.FC<WizardProgressProps> = ({
  steps,
  currentStep,
  onStepClick,
  className,
  variant = 'default',
  showLabels = true
}) => {
  const getStepStatus = (stepIndex: number) => {
    const step = steps[stepIndex];
    if (!step) return 'upcoming';
    
    if (step.isCompleted) return 'completed';
    if (stepIndex === currentStep) return 'current';
    if (stepIndex < currentStep) return 'completed';
    return 'upcoming';
  };

  const canClickStep = (stepIndex: number) => {
    if (!onStepClick) return false;
    // Allow clicking on completed steps or the current step
    return stepIndex <= currentStep || steps[stepIndex]?.isCompleted;
  };

  if (variant === 'compact') {
    return (
      <div className={cn("flex items-center justify-center space-x-2", className)}>
        <span className="text-sm font-satoshi-medium text-[var(--caption-color)]">
          Step {currentStep + 1} of {steps.length}
        </span>
        <div className="w-32 h-2 bg-[var(--background-secondary)] rounded-full overflow-hidden">
          <div 
            className="h-full bg-[var(--primary)] transition-all duration-300 ease-out"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <nav className={cn("w-full", className)} aria-label="Progress">
      <ol className="flex items-center justify-between">
        {steps.map((step, stepIndex) => {
          const status = getStepStatus(stepIndex);
          const isClickable = canClickStep(stepIndex);
          
          return (
            <li key={step.id} className="flex-1 last:flex-initial">
              <div className="flex items-center">
                {/* Step Circle */}
                <button
                  type="button"
                  onClick={() => isClickable && onStepClick?.(stepIndex)}
                  disabled={!isClickable}
                  className={cn(
                    "relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200 font-satoshi-medium",
                    // Status styles
                    status === 'completed' && [
                      "bg-[var(--primary)] border-[var(--primary)] text-white",
                      isClickable && "hover:bg-[var(--primary-dark)] hover:scale-105 cursor-pointer"
                    ],
                    status === 'current' && [
                      "bg-white border-[var(--primary)] text-[var(--primary)] ring-4 ring-[var(--primary)]/20",
                      isClickable && "hover:bg-[var(--primary)]/5 cursor-pointer"
                    ],
                    status === 'upcoming' && [
                      "bg-white border-[var(--border)] text-[var(--muted)]",
                      step.isOptional && "border-dashed"
                    ],
                    !isClickable && "cursor-default"
                  )}
                  aria-current={status === 'current' ? 'step' : undefined}
                >
                  {status === 'completed' ? (
                    <CheckIcon className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-satoshi-bold">
                      {stepIndex + 1}
                    </span>
                  )}
                  
                  {/* Optional indicator */}
                  {step.isOptional && status === 'upcoming' && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-[var(--warning)] rounded-full border-2 border-white" />
                  )}
                </button>

                {/* Step Labels */}
                {showLabels && (
                  <div className="ml-4 min-w-0 flex-1">
                    <p className={cn(
                      "text-sm font-satoshi-medium",
                      status === 'current' && "text-[var(--primary)]",
                      status === 'completed' && "text-[var(--heading-color)]",
                      status === 'upcoming' && "text-[var(--muted)]"
                    )}>
                      {step.title}
                      {step.isOptional && (
                        <span className="ml-1 text-xs text-[var(--caption-color)]">(Optional)</span>
                      )}
                    </p>
                    {step.description && (
                      <p className="text-xs text-[var(--caption-color)] mt-1">
                        {step.description}
                      </p>
                    )}
                  </div>
                )}

                {/* Connector Line */}
                {stepIndex < steps.length - 1 && (
                  <div className={cn(
                    "flex-1 h-0.5 mx-4 transition-colors duration-200",
                    stepIndex < currentStep || steps[stepIndex + 1]?.isCompleted
                      ? "bg-[var(--primary)]"
                      : "bg-[var(--border)]"
                  )} />
                )}
              </div>
            </li>
          );
        })}
      </ol>
      
      {/* Current Step Info */}
      <div className="mt-6 text-center">
        <h2 className="text-lg font-satoshi-bold text-[var(--heading-color)]">
          {steps[currentStep]?.title}
        </h2>
        {steps[currentStep]?.description && (
          <p className="text-sm text-[var(--caption-color)] mt-1">
            {steps[currentStep].description}
          </p>
        )}
      </div>
    </nav>
  );
};