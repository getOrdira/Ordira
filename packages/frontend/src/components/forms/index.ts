// src/components/forms/index.ts
// Centralized exports for all form components

// Form Elements
export * from './elements/field-error';
export * from './elements/field-help';
export * from './elements/field-label';
export * from './elements/field-wrapper';
export { FormActions as FormActionsElement, type FormActionsProps as FormActionsElementProps } from './elements/form-actions';
export * from './elements/form-grid';
export * from './elements/form-section';
export * from './elements/submit-button';

// Form Controls
export * from './controls/checkbox';
export * from './controls/radio-group';
export * from './controls/slider';
export * from './controls/switch';
export * from './controls/toggle-group';

// Form Inputs
export * from './inputs/color-picker';
export * from './inputs/date-picker';
export * from './inputs/file-upload';
export * from './inputs/image-upload';
export * from './inputs/number-field';
export * from './inputs/password-field';
export * from './inputs/rich-text-editor';
export * from './inputs/search-select';
export * from './inputs/select-field';
export * from './inputs/tag-input';
export * from './inputs/text-field';
export * from './inputs/textarea-field';
export * from './inputs/time-picker';

// Form Patterns
export * from './patterns/contact-form';
export * from './patterns/profile-form';
export * from './patterns/settings-form';
export * from './patterns/wizard-form';

// Form Validation
export * from './validation/form-validator';
export * from './validation/validation-message';

// React Hook Form Adapters
export * from './adapters/rhf/field';
export { FormActions as RHFFormActions, type FormActionsProps as RHFFormActionsProps } from './adapters/rhf/form';
export * from './adapters/rhf/resolver';
