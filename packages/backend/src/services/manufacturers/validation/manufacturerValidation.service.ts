/**
 * Manufacturer Validation Service
 *
 * Comprehensive business logic validation for manufacturer data,
 * including registration, profile updates, and business information
 */

import { UtilsService } from '../../utils/utils.service';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class ManufacturerValidationService {
  // Industry categories
  private readonly VALID_INDUSTRIES = [
    // Traditional Manufacturing
    'Automotive Manufacturing',
    'Aerospace Manufacturing',
    'Electronics Manufacturing',
    'Medical Device Manufacturing',
    'Pharmaceutical Manufacturing',
    'Chemical Manufacturing',
    'Food & Beverage Manufacturing',
    'Textile Manufacturing',
    'Apparel Manufacturing',
    'Furniture Manufacturing',
    'Toy Manufacturing',
    'Sporting Goods Manufacturing',

    // Materials & Components
    'Plastic Manufacturing',
    'Metal Fabrication',
    'Glass Manufacturing',
    'Ceramic Manufacturing',
    'Rubber Manufacturing',
    'Paper Manufacturing',
    'Packaging Manufacturing',
    'Component Manufacturing',
    'Hardware Manufacturing',

    // Specialized Industries
    'Cosmetics Manufacturing',
    'Personal Care Manufacturing',
    'Jewelry Manufacturing',
    'Optical Manufacturing',
    'Musical Instrument Manufacturing',
    'Art & Craft Manufacturing',
    'Industrial Equipment Manufacturing',
    'Construction Materials',
    'Energy Equipment',

    // Technology & Innovation
    '3D Printing Services',
    'Prototype Manufacturing',
    'Custom Fabrication',
    'Smart Device Manufacturing',
    'IoT Device Manufacturing',
    'Renewable Energy Manufacturing',

    // Services
    'Contract Manufacturing',
    'Private Label Manufacturing',
    'Assembly Services',
    'Quality Control Services',
    'Testing Services',
    'Logistics Services',

    // Other
    'Multi-Industry',
    'Other'
  ];

  // Common manufacturing services
  private readonly VALID_SERVICES = [
    // Manufacturing Types
    'Custom Manufacturing',
    'Contract Manufacturing',
    'Private Label Manufacturing',
    'OEM Manufacturing',
    'ODM Manufacturing',
    'White Label Manufacturing',

    // Materials & Processes
    'Injection Molding',
    'CNC Machining',
    '3D Printing',
    'Die Casting',
    'Sheet Metal Fabrication',
    'Welding',
    'Assembly Services',
    'Packaging',
    'Textile Manufacturing',
    'Plastic Manufacturing',
    'Metal Manufacturing',
    'Electronics Manufacturing',
    'Food Manufacturing',
    'Chemical Manufacturing',

    // Specialized Services
    'Quality Control',
    'Product Testing',
    'Certification Services',
    'Design Services',
    'Prototyping',
    'Tooling',
    'Supply Chain Management',
    'Logistics',
    'Inventory Management',
    'Fulfillment Services',
    'Drop Shipping',

    // Industry Specific
    'Automotive Parts',
    'Medical Device Manufacturing',
    'Pharmaceutical Manufacturing',
    'Cosmetics Manufacturing',
    'Food & Beverage Production',
    'Apparel Manufacturing',
    'Electronics Assembly',
    'Furniture Manufacturing',
    'Toy Manufacturing',

    // Additional Services
    'Custom Packaging',
    'Label Printing',
    'Product Photography',
    'Sample Production',
    'Rush Orders',
    'Small Batch Production',
    'Large Volume Production'
  ];

  // Recognized certifications
  private readonly RECOGNIZED_CERTIFICATIONS = [
    'ISO 9001',
    'ISO 14001',
    'ISO 45001',
    'ISO 13485',
    'ISO/TS 16949',
    'FDA Approved',
    'CE Certified',
    'UL Listed',
    'RoHS Compliant',
    'REACH Compliant',
    'FCC Certified',
    'ETL Listed',
    'CSA Certified',
    'GMP Certified',
    'HACCP',
    'SQF',
    'BRC',
    'Kosher',
    'Halal',
    'Organic Certified',
    'Fair Trade',
    'BSCI',
    'Sedex',
    'WRAP'
  ];

  private readonly PERSONAL_EMAIL_DOMAINS = [
    'gmail.com',
    'yahoo.com',
    'hotmail.com',
    'outlook.com',
    'aol.com',
    'icloud.com',
    'live.com',
    'msn.com'
  ];

  /**
   * Validate manufacturer registration data
   */
  validateRegistration(data: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Name validation
    if (!data.name || data.name.trim().length < 2) {
      errors.push('Manufacturer name must be at least 2 characters long');
    } else if (data.name.length > 100) {
      errors.push('Manufacturer name cannot exceed 100 characters');
    }

    // Email validation
    if (!data.email) {
      errors.push('Email is required');
    } else if (!UtilsService.isValidEmail(data.email)) {
      errors.push('Invalid email format');
    } else {
      const emailDomain = data.email.split('@')[1]?.toLowerCase();
      if (this.PERSONAL_EMAIL_DOMAINS.includes(emailDomain)) {
        warnings.push('Consider using a business email address instead of a personal email');
      }
    }

    // Password validation
    if (!data.password) {
      errors.push('Password is required');
    } else if (data.password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(data.password)) {
      errors.push('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');
    }

    // Industry validation
    if (data.industry && !this.VALID_INDUSTRIES.includes(data.industry)) {
      errors.push('Invalid industry selection');
    }

    // Contact email validation
    if (data.contactEmail && !UtilsService.isValidEmail(data.contactEmail)) {
      errors.push('Invalid contact email format');
    }

    // Description validation
    if (data.description && data.description.length > 2000) {
      errors.push('Description cannot exceed 2000 characters');
    }

    // Services validation
    if (data.servicesOffered) {
      const servicesValidation = this.validateServices(data.servicesOffered);
      errors.push(...servicesValidation.errors);
      warnings.push(...servicesValidation.warnings);
    }

    // MOQ validation
    if (data.moq !== undefined) {
      const moqValidation = this.validateMOQ(data.moq);
      errors.push(...moqValidation.errors);
      warnings.push(...moqValidation.warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate manufacturer profile update
   */
  validateProfileUpdate(data: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Name validation (if provided)
    if (data.name !== undefined) {
      if (data.name.trim().length < 2) {
        errors.push('Manufacturer name must be at least 2 characters long');
      } else if (data.name.length > 100) {
        errors.push('Manufacturer name cannot exceed 100 characters');
      }
    }

    // Description validation with quality checks
    if (data.description !== undefined) {
      const descValidation = this.validateDescription(data.description);
      errors.push(...descValidation.errors);
      warnings.push(...descValidation.warnings);
    }

    // Contact email validation
    if (data.contactEmail !== undefined && !UtilsService.isValidEmail(data.contactEmail)) {
      errors.push('Invalid contact email format');
    }

    // Industry validation
    if (data.industry !== undefined && !this.VALID_INDUSTRIES.includes(data.industry)) {
      errors.push('Invalid industry selection');
    }

    // Services validation
    if (data.servicesOffered !== undefined) {
      const servicesValidation = this.validateServices(data.servicesOffered);
      errors.push(...servicesValidation.errors);
      warnings.push(...servicesValidation.warnings);
    }

    // MOQ validation
    if (data.moq !== undefined) {
      const moqValidation = this.validateMOQ(data.moq);
      errors.push(...moqValidation.errors);
      warnings.push(...moqValidation.warnings);
    }

    // Certifications validation
    if (data.certifications !== undefined) {
      const certsValidation = this.validateCertifications(data.certifications);
      errors.push(...certsValidation.errors);
      warnings.push(...certsValidation.warnings);
    }

    // Headquarters validation
    if (data.headquarters !== undefined) {
      const hqValidation = this.validateHeadquarters(data.headquarters);
      errors.push(...hqValidation.errors);
      warnings.push(...hqValidation.warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate description quality
   */
  validateDescription(description: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (description.length < 50) {
      warnings.push('Description should be at least 50 characters for better visibility');
    }

    if (description.length > 2000) {
      errors.push('Description cannot exceed 2000 characters');
    }

    const wordCount = description.trim().split(/\s+/).length;
    if (wordCount < 20) {
      warnings.push('Description should contain at least 20 words for meaningful content');
    }

    // Check for spam patterns
    const spamPatterns = [
      /(.)\1{5,}/g, // Repeated characters
      /\b(cheap|free|discount|sale|deal)\b.*\b(now|today|urgent)\b/i,
      /(guaranteed|100%|best price|lowest price)/i,
      /contact.*whatsapp|call.*now|click.*here/i
    ];

    if (spamPatterns.some(pattern => pattern.test(description))) {
      errors.push('Description contains unprofessional or promotional language');
    }

    // Check for professional business terms
    const professionalKeywords = [
      'experience',
      'quality',
      'manufacturing',
      'production',
      'certified',
      'ISO',
      'standards',
      'compliance',
      'expertise',
      'specialized'
    ];

    const hasBusinessTerms = professionalKeywords.some(keyword =>
      description.toLowerCase().includes(keyword)
    );

    if (!hasBusinessTerms && description.length > 100) {
      warnings.push('Consider including professional manufacturing terms to improve credibility');
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate services offered
   */
  validateServices(services: string[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!Array.isArray(services)) {
      errors.push('Services must be an array');
      return { isValid: false, errors, warnings };
    }

    if (services.length === 0) {
      warnings.push('Consider adding at least one service for better visibility');
    }

    if (services.length > 20) {
      errors.push('Cannot offer more than 20 services');
    }

    // Check for duplicates
    const uniqueServices = new Set(services.map(s => s.toLowerCase()));
    if (uniqueServices.size < services.length) {
      errors.push('Duplicate services are not allowed');
    }

    // Validate each service
    services.forEach((service, index) => {
      if (typeof service !== 'string') {
        errors.push(`Service at position ${index + 1} must be a string`);
        return;
      }

      if (service.trim().length < 3) {
        errors.push(`Service at position ${index + 1} must be at least 3 characters`);
      }

      if (service.length > 100) {
        errors.push(`Service at position ${index + 1} cannot exceed 100 characters`);
      }

      // Check if service is recognized (warning only)
      const isRecognized = this.VALID_SERVICES.some(validService =>
        validService.toLowerCase().includes(service.toLowerCase()) ||
        service.toLowerCase().includes(validService.toLowerCase())
      );

      if (!isRecognized) {
        warnings.push(`Service "${service}" is not in our standard list - please ensure it's accurate`);
      }
    });

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate MOQ (Minimum Order Quantity)
   */
  validateMOQ(moq: number): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (typeof moq !== 'number') {
      errors.push('MOQ must be a number');
      return { isValid: false, errors, warnings };
    }

    if (!Number.isInteger(moq)) {
      errors.push('MOQ must be a whole number');
    }

    if (moq < 1) {
      errors.push('MOQ must be at least 1');
    }

    if (moq > 1000000) {
      errors.push('MOQ seems unusually high, please verify');
    }

    // Business logic warnings
    if (moq < 10) {
      warnings.push('Very low MOQ - ensure this is accurate for your business model');
    } else if (moq > 100000) {
      warnings.push('Very high MOQ - this may limit potential customers');
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate certifications
   */
  validateCertifications(certifications: any[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!Array.isArray(certifications)) {
      errors.push('Certifications must be an array');
      return { isValid: false, errors, warnings };
    }

    if (certifications.length > 20) {
      errors.push('Cannot have more than 20 certifications');
    }

    certifications.forEach((cert, index) => {
      if (typeof cert === 'string') {
        // Simple string certification
        if (cert.trim().length < 2) {
          errors.push(`Certification at position ${index + 1} is too short`);
        }
        if (cert.length > 200) {
          errors.push(`Certification at position ${index + 1} exceeds 200 characters`);
        }

        // Check if recognized
        const isRecognized = this.RECOGNIZED_CERTIFICATIONS.some(recognized =>
          cert.toLowerCase().includes(recognized.toLowerCase())
        );
        if (!isRecognized) {
          warnings.push(`Certification "${cert}" is not widely recognized - ensure it's accurate`);
        }
      } else if (typeof cert === 'object' && cert !== null) {
        // Detailed certification object
        if (!cert.name || cert.name.trim().length < 2) {
          errors.push(`Certification at position ${index + 1} must have a valid name`);
        }
        if (cert.expiryDate && new Date(cert.expiryDate) < new Date()) {
          warnings.push(`Certification "${cert.name}" appears to be expired`);
        }
      } else {
        errors.push(`Certification at position ${index + 1} has invalid format`);
      }
    });

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate headquarters information
   */
  validateHeadquarters(headquarters: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (typeof headquarters !== 'object' || headquarters === null) {
      errors.push('Headquarters must be an object');
      return { isValid: false, errors, warnings };
    }

    if (headquarters.country && headquarters.country.length > 100) {
      errors.push('Country name cannot exceed 100 characters');
    }

    if (headquarters.city && headquarters.city.length > 100) {
      errors.push('City name cannot exceed 100 characters');
    }

    if (headquarters.address) {
      if (headquarters.address.length < 10) {
        warnings.push('Address seems too short - consider providing a complete address');
      }
      if (headquarters.address.length > 500) {
        errors.push('Address cannot exceed 500 characters');
      }
    }

    if (headquarters.coordinates) {
      const { latitude, longitude } = headquarters.coordinates;
      if (latitude !== undefined && (latitude < -90 || latitude > 90)) {
        errors.push('Latitude must be between -90 and 90');
      }
      if (longitude !== undefined && (longitude < -180 || longitude > 180)) {
        errors.push('Longitude must be between -180 and 180');
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate business information
   */
  validateBusinessInformation(businessInfo: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (typeof businessInfo !== 'object' || businessInfo === null) {
      errors.push('Business information must be an object');
      return { isValid: false, errors, warnings };
    }

    // Established year validation
    if (businessInfo.establishedYear !== undefined) {
      const currentYear = new Date().getFullYear();
      const year = Number(businessInfo.establishedYear);

      if (year < 1900) {
        errors.push('Establishment year cannot be before 1900');
      }
      if (year > currentYear) {
        errors.push('Establishment year cannot be in the future');
      }

      const age = currentYear - year;
      if (age < 1) {
        errors.push('Business must be established for at least 1 year');
      }
      if (age > 100) {
        warnings.push('Very established business - please verify the year is correct');
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Check if industry is valid
   */
  isValidIndustry(industry: string): boolean {
    return this.VALID_INDUSTRIES.includes(industry);
  }

  /**
   * Check if service is recognized
   */
  isRecognizedService(service: string): boolean {
    return this.VALID_SERVICES.some(validService =>
      validService.toLowerCase().includes(service.toLowerCase()) ||
      service.toLowerCase().includes(validService.toLowerCase())
    );
  }

  /**
   * Check if certification is recognized
   */
  isRecognizedCertification(certification: string): boolean {
    return this.RECOGNIZED_CERTIFICATIONS.some(recognized =>
      certification.toLowerCase().includes(recognized.toLowerCase())
    );
  }

  /**
   * Get list of valid industries
   */
  getValidIndustries(): string[] {
    return [...this.VALID_INDUSTRIES];
  }

  /**
   * Get list of valid services
   */
  getValidServices(): string[] {
    return [...this.VALID_SERVICES];
  }

  /**
   * Get list of recognized certifications
   */
  getRecognizedCertifications(): string[] {
    return [...this.RECOGNIZED_CERTIFICATIONS];
  }
}

export const manufacturerValidationService = new ManufacturerValidationService();
