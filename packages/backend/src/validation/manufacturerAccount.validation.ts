// src/validation/manufacturerAccount.validation.ts
import Joi from 'joi';
import { commonSchemas } from '../middleware/validation.middleware';

/**
 * Enhanced manufacturer account validation with comprehensive business logic and verification
 */

// Main manufacturer account update schema
export const updateManufacturerAccountSchema = Joi.object({
  // Basic profile information
  profilePictureUrl: commonSchemas.url
    .custom((value, helpers) => {
      // Validate professional image requirements
      const imageFormats = ['.jpg', '.jpeg', '.png', '.webp'];
      const hasValidFormat = imageFormats.some(format => 
        value.toLowerCase().includes(format)
      );
      
      // Check for trusted hosting platforms
      const trustedHosts = [
        'amazonaws.com', 'cloudinary.com', 'imgix.com',
        'googleapis.com', 'github.com', 'linkedin.com'
      ];
      
      const isTrustedHost = trustedHosts.some(host => 
        value.toLowerCase().includes(host)
      );
      
      if (!hasValidFormat && !isTrustedHost) {
        return helpers.error('url.unprofessionalImage');
      }
      
      return value;
    })
    .messages({
      'url.unprofessionalImage': 'Profile picture must be a professional image from a trusted hosting service'
    })
    .optional(),

  // Enhanced description with quality validation
  description: commonSchemas.longText
    .min(50)
    .max(2000)
    .custom((value, helpers) => {
      // Check for minimum quality content
      const wordCount = value.trim().split(/\s+/).length;
      if (wordCount < 20) {
        return helpers.error('string.insufficientContent');
      }
      
      // Check for professional language patterns
      const professionalKeywords = [
        'experience', 'quality', 'manufacturing', 'production', 'certified',
        'ISO', 'standards', 'compliance', 'expertise', 'specialized',
        'custom', 'wholesale', 'bulk', 'factory', 'facility'
      ];
      
      const hasBusinessTerms = professionalKeywords.some(keyword => 
        value.toLowerCase().includes(keyword)
      );
      
      if (!hasBusinessTerms) {
        helpers.state.path.push('suggestBusinessTerms');
      }
      
      // Check for spam or unprofessional content
      const spamPatterns = [
        /(.)\1{5,}/g, // Repeated characters
        /\b(cheap|free|discount|sale|deal)\b.*\b(now|today|urgent)\b/i,
        /(guaranteed|100%|best price|lowest price)/i,
        /contact.*whatsapp|call.*now|click.*here/i
      ];
      
      if (spamPatterns.some(pattern => pattern.test(value))) {
        return helpers.error('string.unprofessionalContent');
      }
      
      return value;
    })
    .messages({
      'string.min': 'Description must be at least 50 characters to provide meaningful information',
      'string.insufficientContent': 'Description should contain at least 20 words',
      'string.unprofessionalContent': 'Description contains unprofessional or promotional language'
    })
    .optional(),

  // Comprehensive services offered validation
  servicesOffered: Joi.array()
    .items(
      Joi.string()
        .trim()
        .min(3)
        .max(100)
        .custom((value, helpers) => {
          // Validate against comprehensive manufacturing services list
          const validServices = [
            // Manufacturing Types
            'Custom Manufacturing', 'Contract Manufacturing', 'Private Label Manufacturing',
            'OEM Manufacturing', 'ODM Manufacturing', 'White Label Manufacturing',
            
            // Materials & Processes
            'Injection Molding', 'CNC Machining', '3D Printing', 'Die Casting',
            'Sheet Metal Fabrication', 'Welding', 'Assembly Services', 'Packaging',
            'Textile Manufacturing', 'Plastic Manufacturing', 'Metal Manufacturing',
            'Electronics Manufacturing', 'Food Manufacturing', 'Chemical Manufacturing',
            
            // Specialized Services
            'Quality Control', 'Product Testing', 'Certification Services', 'Design Services',
            'Prototyping', 'Tooling', 'Supply Chain Management', 'Logistics',
            'Inventory Management', 'Fulfillment Services', 'Drop Shipping',
            
            // Industry Specific
            'Automotive Parts', 'Medical Device Manufacturing', 'Pharmaceutical Manufacturing',
            'Cosmetics Manufacturing', 'Food & Beverage Production', 'Apparel Manufacturing',
            'Electronics Assembly', 'Furniture Manufacturing', 'Toy Manufacturing',
            
            // Additional Services
            'Custom Packaging', 'Label Printing', 'Product Photography', 'Sample Production',
            'Rush Orders', 'Small Batch Production', 'Large Volume Production'
          ];
          
          // Check if service matches predefined list (flexible matching)
          const isValidService = validServices.some(validService => 
            validService.toLowerCase().includes(value.toLowerCase()) ||
            value.toLowerCase().includes(validService.toLowerCase())
          );
          
          if (!isValidService) {
            // Allow custom services but flag for review
            helpers.state.path.push('customService');
          }
          
          return value;
        })
    )
    .min(1)
    .max(20)
    .unique()
    .messages({
      'array.min': 'At least one service must be specified',
      'array.max': 'Maximum 20 services can be listed',
      'array.unique': 'Duplicate services are not allowed'
    })
    .optional(),

  // Enhanced MOQ validation with business logic
  moq: Joi.number()
    .integer()
    .min(1)
    .max(1000000)
    .custom((value, helpers) => {
      // Business logic for MOQ validation
      if (value < 10) {
        helpers.state.path.push('veryLowMoq');
      } else if (value > 100000) {
        helpers.state.path.push('veryHighMoq');
      }
      
      return value;
    })
    .messages({
      'number.min': 'Minimum Order Quantity must be at least 1',
      'number.max': 'MOQ seems unusually high, please verify',
      'number.integer': 'MOQ must be a whole number'
    })
    .optional(),

  // Enhanced industry validation
  industry: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .valid(
      // Traditional Manufacturing
      'Automotive Manufacturing', 'Aerospace Manufacturing', 'Electronics Manufacturing',
      'Medical Device Manufacturing', 'Pharmaceutical Manufacturing', 'Chemical Manufacturing',
      'Food & Beverage Manufacturing', 'Textile Manufacturing', 'Apparel Manufacturing',
      'Furniture Manufacturing', 'Toy Manufacturing', 'Sporting Goods Manufacturing',
      
      // Materials & Components
      'Plastic Manufacturing', 'Metal Fabrication', 'Glass Manufacturing',
      'Ceramic Manufacturing', 'Rubber Manufacturing', 'Paper Manufacturing',
      'Packaging Manufacturing', 'Component Manufacturing', 'Hardware Manufacturing',
      
      // Specialized Industries
      'Cosmetics Manufacturing', 'Personal Care Manufacturing', 'Jewelry Manufacturing',
      'Optical Manufacturing', 'Musical Instrument Manufacturing', 'Art & Craft Manufacturing',
      'Industrial Equipment Manufacturing', 'Construction Materials', 'Energy Equipment',
      
      // Technology & Innovation
      ' 3D Printing Services', 'Prototype Manufacturing', 'Custom Fabrication',
      'Smart Device Manufacturing', 'IoT Device Manufacturing', 'Renewable Energy Manufacturing',
      
      // Services
      'Contract Manufacturing', 'Private Label Manufacturing', 'Assembly Services',
      'Quality Control Services', 'Testing Services', 'Logistics Services',
      
      // Other
      'Multi-Industry', 'Other'
    )
    .messages({
      'any.only': 'Please select a valid industry from the manufacturing categories'
    })
    .optional(),

  // Enhanced contact email validation
  contactEmail: commonSchemas.email
    .custom((value, helpers) => {
      // Business email validation for manufacturers
      const personalDomains = [
        'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 
        'aol.com', 'icloud.com', 'live.com', 'msn.com'
      ];
      
      const domain = value.split('@')[1]?.toLowerCase();
      
      if (personalDomains.includes(domain)) {
        helpers.state.path.push('personalEmailWarning');
      }
      
      // Check for manufacturer-specific email patterns
      const manufacturerKeywords = ['factory', 'manufacturing', 'production', 'supply'];
      const hasManufacturerContext = manufacturerKeywords.some(keyword => 
        value.toLowerCase().includes(keyword) || domain.includes(keyword)
      );
      
      if (hasManufacturerContext) {
        helpers.state.path.push('manufacturerEmail');
      }
      
      return value;
    })
    .optional(),

  // Enhanced social URLs with manufacturer focus
  socialUrls: Joi.array()
    .items(
      commonSchemas.url
        .custom((value, helpers) => {
          // Manufacturer-focused social platforms
          const businessPlatforms = [
            'linkedin.com', 'facebook.com', 'twitter.com', 'x.com',
            'youtube.com', 'instagram.com', 'alibaba.com', 'made-in-china.com',
            'globalsources.com', 'indiamart.com', 'thomasnet.com',
            'github.com', 'behance.net'
          ];
          
          const isBusinessPlatform = businessPlatforms.some(platform => 
            value.toLowerCase().includes(platform)
          );
          
          if (!isBusinessPlatform) {
            return helpers.error('url.nonBusinessPlatform');
          }
          
          return value;
        })
        .messages({
          'url.nonBusinessPlatform': 'Social URL must be from a recognized business platform'
        })
    )
    .max(10)
    .unique()
    .messages({
      'array.max': 'Maximum 10 social media URLs allowed',
      'array.unique': 'Duplicate social URLs are not allowed'
    })
    .optional(),

  // Business information and credentials
  businessInformation: Joi.object({
    establishedYear: Joi.number()
      .integer()
      .min(1900)
      .max(new Date().getFullYear())
      .custom((value, helpers) => {
        const currentYear = new Date().getFullYear();
        const age = currentYear - value;
        
        if (age < 1) {
          return helpers.error('number.tooNew');
        }
        
        if (age > 100) {
          helpers.state.path.push('veryEstablished');
        }
        
        return value;
      })
      .messages({
        'number.min': 'Establishment year cannot be before 1900',
        'number.max': 'Establishment year cannot be in the future',
        'number.tooNew': 'Business must be established for at least 1 year'
      })
      .optional(),

    employeeCount: Joi.string()
      .valid(
        '1-10', '11-50', '51-100', '101-200', '201-500', 
        '501-1000', '1001-5000', '5000+'
      )
      .optional(),

    annualRevenue: Joi.string()
      .valid(
        'Under $1M', '$1M-$5M', '$5M-$10M', '$10M-$50M', 
        '$50M-$100M', 'Over $100M', 'Prefer not to say'
      )
      .optional(),

    factorySize: Joi.string()
      .valid(
        'Under 1,000 sqft', '1,000-5,000 sqft', '5,000-10,000 sqft',
        '10,000-50,000 sqft', '50,000-100,000 sqft', 'Over 100,000 sqft'
      )
      .optional()
  }).optional(),

  // Certifications and compliance
  certifications: Joi.array()
    .items(
      Joi.string()
        .trim()
        .min(2)
        .max(200)
        .custom((value, helpers) => {
          // Common manufacturing certifications
          const recognizedCerts = [
            'ISO 9001', 'ISO 14001', 'ISO 45001', 'ISO 13485', 'ISO/TS 16949',
            'FDA Approved', 'CE Certified', 'UL Listed', 'RoHS Compliant',
            'REACH Compliant', 'FCC Certified', 'ETL Listed', 'CSA Certified',
            'GMP Certified', 'HACCP', 'SQF', 'BRC', 'Kosher', 'Halal',
            'Organic Certified', 'Fair Trade', 'BSCI', 'Sedex', 'WRAP'
          ];
          
          const isRecognized = recognizedCerts.some(cert => 
            value.toLowerCase().includes(cert.toLowerCase()) ||
            cert.toLowerCase().includes(value.toLowerCase())
          );
          
          if (!isRecognized) {
            helpers.state.path.push('customCertification');
          }
          
          return value;
        })
    )
    .max(20)
    .unique()
    .messages({
      'array.max': 'Maximum 20 certifications can be listed',
      'array.unique': 'Duplicate certifications are not allowed'
    })
    .optional(),

  // Production capabilities
  productionCapabilities: Joi.object({
    dailyCapacity: Joi.number()
      .integer()
      .min(1)
      .optional(),

    leadTime: Joi.object({
      minimum: Joi.number().integer().min(1).max(365).optional(),
      maximum: Joi.number().integer().min(1).max(365).optional(),
      unit: Joi.string().valid('days', 'weeks', 'months').default('days')
    }).optional(),

    customization: Joi.boolean().default(true).optional(),

    sampleAvailable: Joi.boolean().default(true).optional(),

    rushOrdersAccepted: Joi.boolean().default(false).optional()
  }).optional(),

  // Location and logistics
  headquarters: Joi.object({
    country: commonSchemas.shortText
      .pattern(/^[a-zA-Z\s\-']+$/)
      .optional(),
    
    city: commonSchemas.shortText
      .pattern(/^[a-zA-Z\s\-'\.]+$/)
      .optional(),
    
    address: commonSchemas.mediumText
      .min(10)
      .max(300)
      .optional(),

    timezone: Joi.string()
      .valid(
        'UTC', 'GMT', 'EST', 'PST', 'CST', 'MST',
        'Europe/London', 'Europe/Paris', 'Europe/Berlin',
        'Asia/Shanghai', 'Asia/Tokyo', 'Asia/Seoul',
        'Asia/Kolkata', 'Asia/Dubai', 'Australia/Sydney'
      )
      .optional(),

    shippingRegions: Joi.array()
      .items(Joi.string().valid(
        'North America', 'South America', 'Europe', 'Asia',
        'Africa', 'Oceania', 'Middle East', 'Worldwide'
      ))
      .max(8)
      .optional()
  }).optional(),

  // Communication preferences
  communicationPreferences: Joi.object({
    preferredMethod: Joi.string()
      .valid('email', 'phone', 'whatsapp', 'wechat', 'telegram', 'video_call')
      .default('email'),

    responseTime: Joi.string()
      .valid('Within 1 hour', 'Within 4 hours', 'Within 24 hours', 'Within 48 hours')
      .default('Within 24 hours'),

    availableHours: Joi.string()
      .valid('24/7', 'Business Hours', 'Extended Hours', 'Custom')
      .default('Business Hours'),

    languages: Joi.array()
      .items(Joi.string().valid(
        'English', 'Chinese', 'Spanish', 'French', 'German',
        'Japanese', 'Korean', 'Portuguese', 'Russian', 'Arabic'
      ))
      .min(1)
      .max(10)
      .default(['English'])
  }).optional(),

  // Quality and compliance
  qualityStandards: Joi.object({
    qualityControlProcess: Joi.boolean().default(true),
    inspectionReports: Joi.boolean().default(true),
    thirdPartyTesting: Joi.boolean().default(false),
    warrantyOffered: Joi.boolean().default(true),
    returnPolicy: Joi.boolean().default(true)
  }).optional()
});

// Simplified quick update schema
export const quickUpdateManufacturerSchema = Joi.object({
  profilePictureUrl: commonSchemas.optionalUrl,
  description: commonSchemas.optionalLongText.max(1000),
  contactEmail: commonSchemas.optionalEmail,
  moq: Joi.number().integer().min(1).optional()
});

// Manufacturer verification schema
export const manufacturerVerificationSchema = Joi.object({
  businessLicense: Joi.string().required(),
  taxCertificate: Joi.string().optional(),
  facilityPhotos: Joi.array()
    .items(commonSchemas.url)
    .min(1)
    .max(10)
    .required()
    .messages({
      'array.min': 'At least one facility photo is required',
      'array.max': 'Maximum 10 facility photos allowed'
    }),
  
  certificationDocuments: Joi.array()
    .items(commonSchemas.url)
    .max(20)
    .optional(),

  referenceContacts: Joi.array()
    .items(Joi.object({
      companyName: commonSchemas.shortText.required(),
      contactPerson: commonSchemas.shortText.required(),
      email: commonSchemas.email.required(),
      phone: commonSchemas.phone.optional(),
      relationship: Joi.string().valid('client', 'supplier', 'partner').required()
    }))
    .max(5)
    .optional(),

  additionalNotes: commonSchemas.optionalLongText.max(1000)
});

// Capability assessment schema
export const capabilityAssessmentSchema = Joi.object({
  servicesOffered: Joi.array()
    .items(Joi.string().max(100))
    .min(1)
    .max(20)
    .required(),

  minimumOrderQuantity: Joi.number().integer().min(1).required(),
  maximumOrderQuantity: Joi.number().integer().min(1).optional(),

  leadTimes: Joi.object({
    standard: Joi.number().integer().min(1).max(365).required(),
    rush: Joi.number().integer().min(1).max(180).optional()
  }).required(),

  qualityControls: Joi.array()
    .items(Joi.string().max(200))
    .min(1)
    .required(),

  productCategories: Joi.array()
    .items(Joi.string().max(100))
    .min(1)
    .max(20)
    .required()
});

// Export all schemas
export const manufacturerAccountValidationSchemas = {
  updateManufacturerAccount: updateManufacturerAccountSchema,
  quickUpdate: quickUpdateManufacturerSchema,
  verification: manufacturerVerificationSchema,
  capabilityAssessment: capabilityAssessmentSchema
};