// src/components/forms/patterns/wizard-form/step.tsx
'use client';

import React, { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useWizard } from './index';

export interface WizardStepProps {
  stepId: string;
  children: React.ReactNode;
  className?: string;
  onEnter?: () => void;
  onExit?: () => void;
  onValidate?: () => boolean | Promise<boolean>;
}

export const WizardStep: React.FC<WizardStepProps> = ({
  stepId,
  children,
  className,
  onEnter,
  onExit,
  onValidate
}) => {
  const { currentStep, steps, updateStepStatus } = useWizard();
  
  // Find the step index for this stepId
  const stepIndex = steps.findIndex(step => step.id === stepId);
  const isCurrentStep = stepIndex === currentStep;
  const step = steps[stepIndex];

  // Handle step enter/exit effects
  useEffect(() => {
    if (isCurrentStep) {
      onEnter?.();
      return () => {
        onExit?.();
      };
    }
  }, [isCurrentStep, onEnter, onExit]);

  // Handle validation when step becomes current
  useEffect(() => {
    if (isCurrentStep && onValidate) {
      const validateStep = async () => {
        try {
          const isValid = await onValidate();
          updateStepStatus(stepId, { isValid });
        } catch (error) {
          console.error(`Validation error for step ${stepId}:`, error);
          updateStepStatus(stepId, { isValid: false });
        }
      };
      
      validateStep();
    }
  }, [isCurrentStep, onValidate, stepId, updateStepStatus]);

  // Don't render if this step doesn't exist or isn't current
  if (stepIndex === -1 || !isCurrentStep) {
    return null;
  }

  return (
    <div 
      className={cn(
        "space-y-6 animate-in fade-in slide-in-from-right-4 duration-300",
        className
      )}
      role="tabpanel"
      aria-labelledby={`step-${stepIndex + 1}-heading`}
      tabIndex={0}
    >
      {children}
    </div>
  );
};