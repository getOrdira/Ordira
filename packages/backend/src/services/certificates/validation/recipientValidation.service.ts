/**
 * Recipient Validation Service
 *
 * Handles recipient-specific validation for certificates including:
 * - Email validation
 * - Phone number validation
 * - Wallet address validation
 * - Contact method validation
 * - Batch recipient validation
 */

export type ContactMethod = 'email' | 'sms' | 'wallet';

export interface RecipientValidationResult {
  valid: boolean;
  error?: string;
  sanitized?: string;
}

export interface BatchRecipientValidationResult {
  valid: boolean;
  errors: Array<{
    index: number;
    recipient: string;
    error: string;
  }>;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): RecipientValidationResult {
  if (!email) {
    return { valid: false, error: 'Email is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const trimmedEmail = email.trim().toLowerCase();

  if (!emailRegex.test(trimmedEmail)) {
    return { valid: false, error: 'Invalid email format' };
  }

  // Additional validation rules
  if (trimmedEmail.length > 254) {
    return { valid: false, error: 'Email address is too long' };
  }

  const [localPart, domain] = trimmedEmail.split('@');
  if (localPart.length > 64) {
    return { valid: false, error: 'Email local part is too long' };
  }

  return { valid: true, sanitized: trimmedEmail };
}

/**
 * Validate phone number format (E.164 format)
 */
export function validatePhoneNumber(phone: string): RecipientValidationResult {
  if (!phone) {
    return { valid: false, error: 'Phone number is required' };
  }

  // Remove spaces and dashes for validation
  const cleanedPhone = phone.replace(/[\s\-()]/g, '');

  // E.164 format: +[country code][number]
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;

  if (!phoneRegex.test(cleanedPhone)) {
    return {
      valid: false,
      error: 'Invalid phone number format. Use E.164 format: +1234567890'
    };
  }

  // Ensure it starts with +
  const sanitized = cleanedPhone.startsWith('+')
    ? cleanedPhone
    : `+${cleanedPhone}`;

  return { valid: true, sanitized };
}

/**
 * Validate wallet address format (Ethereum)
 */
export function validateWalletAddress(
  address: string
): RecipientValidationResult {
  if (!address) {
    return { valid: false, error: 'Wallet address is required' };
  }

  const trimmedAddress = address.trim();
  const walletRegex = /^0x[a-fA-F0-9]{40}$/;

  if (!walletRegex.test(trimmedAddress)) {
    return {
      valid: false,
      error: 'Invalid wallet address format. Must be a 42-character Ethereum address starting with 0x'
    };
  }

  return { valid: true, sanitized: trimmedAddress };
}

/**
 * Validate recipient based on contact method
 */
export function validateRecipient(
  recipient: string,
  contactMethod: ContactMethod
): RecipientValidationResult {
  switch (contactMethod) {
    case 'email':
      return validateEmail(recipient);

    case 'sms':
      return validatePhoneNumber(recipient);

    case 'wallet':
      return validateWalletAddress(recipient);

    default:
      return {
        valid: false,
        error: `Invalid contact method: ${contactMethod}`
      };
  }
}

/**
 * Validate contact method
 */
export function validateContactMethod(
  method: string
): { valid: boolean; error?: string } {
  const validMethods: ContactMethod[] = ['email', 'sms', 'wallet'];

  if (!method) {
    return { valid: false, error: 'Contact method is required' };
  }

  if (!validMethods.includes(method as ContactMethod)) {
    return {
      valid: false,
      error: `Invalid contact method. Must be one of: ${validMethods.join(', ')}`
    };
  }

  return { valid: true };
}

/**
 * Validate batch recipients
 */
export function validateBatchRecipients(
  recipients: Array<{
    address: string;
    contactMethod: ContactMethod;
  }>
): BatchRecipientValidationResult {
  const errors: Array<{
    index: number;
    recipient: string;
    error: string;
  }> = [];

  recipients.forEach((recipient, index) => {
    // Validate contact method
    const methodValidation = validateContactMethod(recipient.contactMethod);
    if (!methodValidation.valid) {
      errors.push({
        index,
        recipient: recipient.address,
        error: methodValidation.error || 'Invalid contact method'
      });
      return;
    }

    // Validate recipient address
    const recipientValidation = validateRecipient(
      recipient.address,
      recipient.contactMethod
    );
    if (!recipientValidation.valid) {
      errors.push({
        index,
        recipient: recipient.address,
        error: recipientValidation.error || 'Invalid recipient'
      });
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Check for duplicate recipients in batch
 */
export function checkDuplicateRecipients(
  recipients: Array<{ address: string; contactMethod: ContactMethod }>
): {
  hasDuplicates: boolean;
  duplicates: Array<{ address: string; indices: number[] }>;
} {
  const recipientMap = new Map<
    string,
    { address: string; indices: number[] }
  >();

  recipients.forEach((recipient, index) => {
    const key = `${recipient.contactMethod}:${recipient.address.toLowerCase()}`;

    if (recipientMap.has(key)) {
      const entry = recipientMap.get(key)!;
      entry.indices.push(index);
    } else {
      recipientMap.set(key, {
        address: recipient.address,
        indices: [index]
      });
    }
  });

  const duplicates = Array.from(recipientMap.values()).filter(
    entry => entry.indices.length > 1
  );

  return {
    hasDuplicates: duplicates.length > 0,
    duplicates
  };
}

/**
 * Sanitize recipient address based on contact method
 */
export function sanitizeRecipient(
  recipient: string,
  contactMethod: ContactMethod
): string {
  const validation = validateRecipient(recipient, contactMethod);

  if (validation.valid && validation.sanitized) {
    return validation.sanitized;
  }

  // Return original if validation fails (let validation handle errors)
  return recipient;
}

/**
 * Validate recipient is not blacklisted
 */
export function validateRecipientNotBlacklisted(
  recipient: string,
  blacklist: string[]
): { valid: boolean; error?: string } {
  const normalizedRecipient = recipient.toLowerCase().trim();
  const normalizedBlacklist = blacklist.map(item => item.toLowerCase().trim());

  if (normalizedBlacklist.includes(normalizedRecipient)) {
    return {
      valid: false,
      error: 'Recipient is on the blacklist'
    };
  }

  return { valid: true };
}

/**
 * Validate recipient domain (for email)
 */
export function validateEmailDomain(
  email: string,
  allowedDomains?: string[]
): { valid: boolean; error?: string } {
  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    return emailValidation;
  }

  if (!allowedDomains || allowedDomains.length === 0) {
    return { valid: true };
  }

  const domain = email.split('@')[1].toLowerCase();

  if (!allowedDomains.map(d => d.toLowerCase()).includes(domain)) {
    return {
      valid: false,
      error: `Email domain not allowed. Allowed domains: ${allowedDomains.join(', ')}`
    };
  }

  return { valid: true };
}

/**
 * Get contact method from recipient format
 */
export function detectContactMethod(recipient: string): ContactMethod | null {
  // Try email pattern
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    return 'email';
  }

  // Try wallet pattern
  if (/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
    return 'wallet';
  }

  // Try phone pattern
  if (/^\+?[1-9]\d{1,14}$/.test(recipient.replace(/[\s\-()]/g, ''))) {
    return 'sms';
  }

  return null;
}

export class RecipientValidationService {
  validateEmail = validateEmail;
  validatePhoneNumber = validatePhoneNumber;
  validateWalletAddress = validateWalletAddress;
  validateRecipient = validateRecipient;
  validateContactMethod = validateContactMethod;
  validateBatchRecipients = validateBatchRecipients;
  checkDuplicateRecipients = checkDuplicateRecipients;
  sanitizeRecipient = sanitizeRecipient;
  validateRecipientNotBlacklisted = validateRecipientNotBlacklisted;
  validateEmailDomain = validateEmailDomain;
  detectContactMethod = detectContactMethod;
}

export const recipientValidationService = new RecipientValidationService();
