// src/components/forms/patterns/wizard-form/index.tsx
'use client';

import React, { useState, useCallback, createContext, useContext } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/primitives/button';
import { WizardProgress } from './progress';
import { WizardStep } from './step';

export interface WizardStepData {
  id: string;
  title: string;
  description?: string;
  isOptional?: boolean;
  isCompleted?: boolean;
  isValid?: boolean;
}

export interface WizardContextType {
  currentStep: number;
  steps: WizardStepData[];
  formData: Record<string, any>;
  isFirstStep: boolean;
  isLastStep: boolean;
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (stepIndex: number) => void;
  updateFormData: (data: Record<string, any>) => void;
  updateStepStatus: (stepId: string, status: Partial<Pick<WizardStepData, 'isCompleted' | 'isValid'>>) => void;
  validateCurrentStep: () => boolean;
}

const WizardContext = createContext<WizardContextType | null>(null);

export const useWizard = () => {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error('useWizard must be used within a WizardForm');
  }
  return context;
};

export interface WizardFormProps {
  children: React.ReactNode;
  steps: WizardStepData[];
  initialData?: Record<string, any>;
  onStepChange?: (step: number, data: Record<string, any>) => void;
  onComplete?: (data: Record<string, any>) => void | Promise<void>;
  onCancel?: () => void;
  validateStep?: (stepId: string, data: Record<string, any>) => boolean | Promise<boolean>;
  persistData?: boolean;
  persistKey?: string;
  showProgress?: boolean;
  allowSkipOptional?: boolean;
  className?: string;
}

export const WizardForm: React.FC<WizardFormProps> = ({
  children,
  steps,
  initialData = {},
  onStepChange,
  onComplete,
  onCancel,
  validateStep,
  persistData = false,
  persistKey = 'wizard-form',
  showProgress = true,
  allowSkipOptional = true,
  className
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [stepsData, setStepsData] = useState<WizardStepData[]>(steps);
  const [formData, setFormData] = useState<Record<string, any>>(() => {
    if (persistData && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`wizard_${persistKey}`);
        return stored ? { ...initialData, ...JSON.parse(stored) } : initialData;
      } catch {
        return initialData;
      }
    }
    return initialData;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Persist data to localStorage when enabled
  const persistFormData = useCallback((data: Record<string, any>) => {
    if (persistData && typeof window !== 'undefined') {
      try {
        localStorage.setItem(`wizard_${persistKey}`, JSON.stringify(data));
      } catch (error) {
        console.warn('Failed to persist wizard form data:', error);
      }
    }
  }, [persistData, persistKey]);

  const updateFormData = useCallback((data: Record<string, any>) => {
    const newFormData = { ...formData, ...data };
    setFormData(newFormData);
    persistFormData(newFormData);
    onStepChange?.(currentStep, newFormData);
  }, [formData, currentStep, onStepChange, persistFormData]);

  const updateStepStatus = useCallback((stepId: string, status: Partial<Pick<WizardStepData, 'isCompleted' | 'isValid'>>) => {
    setStepsData(prev => prev.map(step => 
      step.id === stepId ? { ...step, ...status } : step
    ));
  }, []);

  const validateCurrentStep = useCallback(async (): Promise<boolean> => {
    const currentStepData = stepsData[currentStep];
    if (!currentStepData) return false;

    // Allow skipping optional steps if enabled
    if (allowSkipOptional && currentStepData.isOptional) {
      return true;
    }

    // Use custom validation if provided
    if (validateStep) {
      try {
        const isValid = await validateStep(currentStepData.id, formData);
        updateStepStatus(currentStepData.id, { isValid });
        return isValid;
      } catch (error) {
        console.error('Step validation error:', error);
        updateStepStatus(currentStepData.id, { isValid: false });
        return false;
      }
    }

    // Default validation - check if step is marked as valid
    return currentStepData.isValid !== false;
  }, [currentStep, stepsData, formData, validateStep, allowSkipOptional, updateStepStatus]);

  const nextStep = useCallback(async () => {
    const isValid = await validateCurrentStep();
    if (!isValid) return;

    const currentStepData = stepsData[currentStep];
    updateStepStatus(currentStepData.id, { isCompleted: true });

    if (currentStep < stepsData.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Final step - submit form
      if (onComplete) {
        setIsSubmitting(true);
        try {
          await onComplete(formData);
          // Clear persisted data on successful completion
          if (persistData && typeof window !== 'undefined') {
            localStorage.removeItem(`wizard_${persistKey}`);
          }
        } catch (error) {
          console.error('Form submission error:', error);
        } finally {
          setIsSubmitting(false);
        }
      }
    }
  }, [currentStep, stepsData, formData, onComplete, validateCurrentStep, updateStepStatus, persistData, persistKey]);

  const previousStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const goToStep = useCallback((stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < stepsData.length) {
      // Only allow going to completed steps or the next step
      const canGoTo = stepIndex <= currentStep || 
        stepsData.slice(0, stepIndex).every(step => step.isCompleted || step.isOptional);
      
      if (canGoTo) {
        setCurrentStep(stepIndex);
      }
    }
  }, [currentStep, stepsData]);

  const contextValue: WizardContextType = {
    currentStep,
    steps: stepsData,
    formData,
    isFirstStep: currentStep === 0,
    isLastStep: currentStep === stepsData.length - 1,
    nextStep,
    previousStep,
    goToStep,
    updateFormData,
    updateStepStatus,
    validateCurrentStep
  };

  return (
    <WizardContext.Provider value={contextValue}>
      <div className={cn("space-y-8", className)}>
        {/* Progress Indicator */}
        {showProgress && (
          <WizardProgress 
            steps={stepsData}
            currentStep={currentStep}
            onStepClick={goToStep}
          />
        )}

        {/* Step Content */}
        <div className="min-h-[400px]">
          {children}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-6 border-t border-[var(--border)]">
          <div>
            {!contextValue.isFirstStep && (
              <Button
                variant="outline"
                onClick={previousStep}
                disabled={isSubmitting}
              >
                Back
              </Button>
            )}
          </div>

          <div className="flex items-center space-x-3">
            {onCancel && (
              <Button
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}
            
            <Button
              onClick={nextStep}
              disabled={isSubmitting}
              variant={contextValue.isLastStep ? "primary" : "outline"}
            >
              {isSubmitting ? (
                <div className="flex items-center space-x-2">
                  <div className="loading-spinner w-4 h-4" />
                  <span>Processing...</span>
                </div>
              ) : contextValue.isLastStep ? (
                'Complete'
              ) : (
                'Next'
              )}
            </Button>
          </div>
        </div>
      </div>
    </WizardContext.Provider>
  );
};

// Export components
export { WizardStep } from './step';
export { WizardProgress } from './progress';