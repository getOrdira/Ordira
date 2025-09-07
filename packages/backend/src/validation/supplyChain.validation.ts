// src/validation/supplyChain.validation.ts
import Joi from 'joi';

// ===== SUPPLY CHAIN VALIDATION SCHEMAS =====

export const contractDeploymentSchema = Joi.object({
  manufacturerName: Joi.string()
    .required()
    .min(2)
    .max(100)
    .pattern(/^[a-zA-Z0-9\s\-&.,()]+$/)
    .messages({
      'string.pattern.base': 'Manufacturer name contains invalid characters',
      'string.min': 'Manufacturer name must be at least 2 characters',
      'string.max': 'Manufacturer name cannot exceed 100 characters',
      'any.required': 'Manufacturer name is required'
    })
});

export const endpointSchema = Joi.object({
  name: Joi.string()
    .required()
    .min(2)
    .max(100)
    .messages({
      'string.min': 'Endpoint name must be at least 2 characters',
      'string.max': 'Endpoint name cannot exceed 100 characters',
      'any.required': 'Endpoint name is required'
    }),
  eventType: Joi.string()
    .valid('sourced', 'manufactured', 'quality_checked', 'packaged', 'shipped', 'delivered')
    .required()
    .messages({
      'any.only': 'Event type must be one of: sourced, manufactured, quality_checked, packaged, shipped, delivered',
      'any.required': 'Event type is required'
    }),
  location: Joi.string()
    .required()
    .min(2)
    .max(200)
    .messages({
      'string.min': 'Location must be at least 2 characters',
      'string.max': 'Location cannot exceed 200 characters',
      'any.required': 'Location is required'
    })
});

export const productSchema = Joi.object({
  productId: Joi.string()
    .required()
    .min(1)
    .max(50)
    .pattern(/^[a-zA-Z0-9\-_]+$/)
    .messages({
      'string.pattern.base': 'Product ID can only contain letters, numbers, hyphens, and underscores',
      'string.min': 'Product ID must be at least 1 character',
      'string.max': 'Product ID cannot exceed 50 characters',
      'any.required': 'Product ID is required'
    }),
  name: Joi.string()
    .required()
    .min(2)
    .max(100)
    .messages({
      'string.min': 'Product name must be at least 2 characters',
      'string.max': 'Product name cannot exceed 100 characters',
      'any.required': 'Product name is required'
    }),
  description: Joi.string()
    .optional()
    .max(500)
    .messages({
      'string.max': 'Product description cannot exceed 500 characters'
    })
});

export const eventSchema = Joi.object({
  productId: Joi.string()
    .required()
    .min(1)
    .max(50)
    .pattern(/^[a-zA-Z0-9\-_]+$/)
    .messages({
      'string.pattern.base': 'Product ID can only contain letters, numbers, hyphens, and underscores',
      'string.min': 'Product ID must be at least 1 character',
      'string.max': 'Product ID cannot exceed 50 characters',
      'any.required': 'Product ID is required'
    }),
  eventType: Joi.string()
    .valid('sourced', 'manufactured', 'quality_checked', 'packaged', 'shipped', 'delivered')
    .required()
    .messages({
      'any.only': 'Event type must be one of: sourced, manufactured, quality_checked, packaged, shipped, delivered',
      'any.required': 'Event type is required'
    }),
  eventData: Joi.object({
    location: Joi.string()
      .max(200)
      .messages({
        'string.max': 'Location cannot exceed 200 characters'
      }),
    coordinates: Joi.object({
      lat: Joi.number()
        .min(-90)
        .max(90)
        .messages({
          'number.min': 'Latitude must be between -90 and 90',
          'number.max': 'Latitude must be between -90 and 90'
        }),
      lng: Joi.number()
        .min(-180)
        .max(180)
        .messages({
          'number.min': 'Longitude must be between -180 and 180',
          'number.max': 'Longitude must be between -180 and 180'
        })
    }),
    temperature: Joi.number()
      .min(-50)
      .max(100)
      .messages({
        'number.min': 'Temperature must be between -50°C and 100°C',
        'number.max': 'Temperature must be between -50°C and 100°C'
      }),
    humidity: Joi.number()
      .min(0)
      .max(100)
      .messages({
        'number.min': 'Humidity must be between 0% and 100%',
        'number.max': 'Humidity must be between 0% and 100%'
      }),
    qualityMetrics: Joi.object(),
    notes: Joi.string()
      .max(1000)
      .messages({
        'string.max': 'Notes cannot exceed 1000 characters'
      })
  }).optional()
});

export const qrScanSchema = Joi.object({
  qrCodeData: Joi.string()
    .required()
    .min(10)
    .messages({
      'string.min': 'QR code data must be at least 10 characters',
      'any.required': 'QR code data is required'
    }),
  eventType: Joi.string()
    .valid('sourced', 'manufactured', 'quality_checked', 'packaged', 'shipped', 'delivered')
    .required()
    .messages({
      'any.only': 'Event type must be one of: sourced, manufactured, quality_checked, packaged, shipped, delivered',
      'any.required': 'Event type is required'
    }),
  eventData: Joi.object({
    location: Joi.string()
      .max(200)
      .messages({
        'string.max': 'Location cannot exceed 200 characters'
      }),
    coordinates: Joi.object({
      lat: Joi.number()
        .min(-90)
        .max(90)
        .messages({
          'number.min': 'Latitude must be between -90 and 90',
          'number.max': 'Latitude must be between -90 and 90'
        }),
      lng: Joi.number()
        .min(-180)
        .max(180)
        .messages({
          'number.min': 'Longitude must be between -180 and 180',
          'number.max': 'Longitude must be between -180 and 180'
        })
    }),
    temperature: Joi.number()
      .min(-50)
      .max(100)
      .messages({
        'number.min': 'Temperature must be between -50°C and 100°C',
        'number.max': 'Temperature must be between -50°C and 100°C'
      }),
    humidity: Joi.number()
      .min(0)
      .max(100)
      .messages({
        'number.min': 'Humidity must be between 0% and 100%',
        'number.max': 'Humidity must be between 0% and 100%'
      }),
    qualityMetrics: Joi.object(),
    notes: Joi.string()
      .max(1000)
      .messages({
        'string.max': 'Notes cannot exceed 1000 characters'
      })
  }).optional()
});

export const locationSchema = Joi.object({
  name: Joi.string()
    .required()
    .min(2)
    .max(100)
    .messages({
      'string.min': 'Location name must be at least 2 characters',
      'string.max': 'Location name cannot exceed 100 characters',
      'any.required': 'Location name is required'
    }),
  description: Joi.string()
    .optional()
    .max(500)
    .messages({
      'string.max': 'Location description cannot exceed 500 characters'
    }),
  address: Joi.string()
    .required()
    .min(5)
    .max(200)
    .messages({
      'string.min': 'Address must be at least 5 characters',
      'string.max': 'Address cannot exceed 200 characters',
      'any.required': 'Address is required'
    }),
  city: Joi.string()
    .required()
    .min(2)
    .max(100)
    .messages({
      'string.min': 'City must be at least 2 characters',
      'string.max': 'City cannot exceed 100 characters',
      'any.required': 'City is required'
    }),
  state: Joi.string()
    .required()
    .min(2)
    .max(100)
    .messages({
      'string.min': 'State must be at least 2 characters',
      'string.max': 'State cannot exceed 100 characters',
      'any.required': 'State is required'
    }),
  country: Joi.string()
    .required()
    .min(2)
    .max(100)
    .messages({
      'string.min': 'Country must be at least 2 characters',
      'string.max': 'Country cannot exceed 100 characters',
      'any.required': 'Country is required'
    }),
  postalCode: Joi.string()
    .optional()
    .max(20)
    .messages({
      'string.max': 'Postal code cannot exceed 20 characters'
    }),
  coordinates: Joi.object({
    lat: Joi.number()
      .required()
      .min(-90)
      .max(90)
      .messages({
        'number.min': 'Latitude must be between -90 and 90',
        'number.max': 'Latitude must be between -90 and 90',
        'any.required': 'Latitude is required'
      }),
    lng: Joi.number()
      .required()
      .min(-180)
      .max(180)
      .messages({
        'number.min': 'Longitude must be between -180 and 180',
        'number.max': 'Longitude must be between -180 and 180',
        'any.required': 'Longitude is required'
      })
  }).required(),
  locationType: Joi.string()
    .valid('factory', 'warehouse', 'distribution_center', 'retail_store', 'custom')
    .required()
    .messages({
      'any.only': 'Location type must be one of: factory, warehouse, distribution_center, retail_store, custom',
      'any.required': 'Location type is required'
    }),
  capabilities: Joi.array()
    .items(Joi.string())
    .optional(),
  allowedEventTypes: Joi.array()
    .items(Joi.string().valid('sourced', 'manufactured', 'quality_checked', 'packaged', 'shipped', 'delivered'))
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one allowed event type is required',
      'any.required': 'Allowed event types are required'
    }),
  contactInfo: Joi.object({
    phone: Joi.string()
      .optional()
      .pattern(/^\+?[1-9]\d{1,14}$/)
      .messages({
        'string.pattern.base': 'Invalid phone number format'
      }),
    email: Joi.string()
      .optional()
      .email()
      .messages({
        'string.email': 'Invalid email format'
      }),
    contactPerson: Joi.string()
      .optional()
      .max(100)
      .messages({
        'string.max': 'Contact person name cannot exceed 100 characters'
      })
  }).optional(),
  environmentalConditions: Joi.object({
    temperatureRange: Joi.object({
      min: Joi.number()
        .min(-50)
        .max(100)
        .messages({
          'number.min': 'Minimum temperature must be between -50°C and 100°C',
          'number.max': 'Minimum temperature must be between -50°C and 100°C'
        }),
      max: Joi.number()
        .min(-50)
        .max(100)
        .messages({
          'number.min': 'Maximum temperature must be between -50°C and 100°C',
          'number.max': 'Maximum temperature must be between -50°C and 100°C'
        })
    }).optional(),
    humidityRange: Joi.object({
      min: Joi.number()
        .min(0)
        .max(100)
        .messages({
          'number.min': 'Minimum humidity must be between 0% and 100%',
          'number.max': 'Minimum humidity must be between 0% and 100%'
        }),
      max: Joi.number()
        .min(0)
        .max(100)
        .messages({
          'number.min': 'Maximum humidity must be between 0% and 100%',
          'number.max': 'Maximum humidity must be between 0% and 100%'
        })
    }).optional(),
    specialRequirements: Joi.array()
      .items(Joi.string())
      .optional()
  }).optional()
});

// ===== BATCH OPERATION SCHEMAS =====

export const batchQrCodeSchema = Joi.object({
  productIds: Joi.array()
    .items(Joi.string().pattern(/^[a-zA-Z0-9\-_]+$/))
    .min(1)
    .max(50)
    .required()
    .messages({
      'array.min': 'At least one product ID is required',
      'array.max': 'Cannot generate more than 50 QR codes at once',
      'any.required': 'Product IDs array is required'
    }),
  batchName: Joi.string()
    .optional()
    .min(2)
    .max(100)
    .messages({
      'string.min': 'Batch name must be at least 2 characters',
      'string.max': 'Batch name cannot exceed 100 characters'
    }),
  batchDescription: Joi.string()
    .optional()
    .max(500)
    .messages({
      'string.max': 'Batch description cannot exceed 500 characters'
    }),
  batchMetadata: Joi.object({
    batchSize: Joi.number()
      .integer()
      .min(1)
      .max(1000)
      .optional()
      .messages({
        'number.integer': 'Batch size must be an integer',
        'number.min': 'Batch size must be at least 1',
        'number.max': 'Batch size cannot exceed 1000'
      }),
    productionDate: Joi.date()
      .iso()
      .optional()
      .messages({
        'date.format': 'Production date must be in ISO format'
      }),
    qualityGrade: Joi.string()
      .valid('A', 'B', 'C', 'Premium', 'Standard', 'Economy')
      .optional()
      .messages({
        'any.only': 'Quality grade must be one of: A, B, C, Premium, Standard, Economy'
      }),
    shippingMethod: Joi.string()
      .optional()
      .max(50)
      .messages({
        'string.max': 'Shipping method cannot exceed 50 characters'
      }),
    destination: Joi.string()
      .optional()
      .max(100)
      .messages({
        'string.max': 'Destination cannot exceed 100 characters'
      }),
    specialInstructions: Joi.string()
      .optional()
      .max(1000)
      .messages({
        'string.max': 'Special instructions cannot exceed 1000 characters'
      })
  }).optional()
});

// ===== QUERY PARAMETER SCHEMAS =====

export const supplyChainQuerySchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.base': 'Page must be a number',
      'number.integer': 'Page must be an integer',
      'number.min': 'Page must be at least 1'
    }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .messages({
      'number.base': 'Limit must be a number',
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    }),
  eventType: Joi.string()
    .valid('sourced', 'manufactured', 'quality_checked', 'packaged', 'shipped', 'delivered')
    .optional(),
  productId: Joi.string()
    .pattern(/^[a-zA-Z0-9\-_]+$/)
    .optional(),
  startDate: Joi.date()
    .iso()
    .optional(),
  endDate: Joi.date()
    .iso()
    .min(Joi.ref('startDate'))
    .optional()
    .messages({
      'date.min': 'End date must be after start date'
    })
});

// ===== CUSTOM VALIDATION FUNCTIONS =====

export const validateCoordinates = (coordinates: { lat: number; lng: number }): boolean => {
  return coordinates.lat >= -90 && coordinates.lat <= 90 && 
         coordinates.lng >= -180 && coordinates.lng <= 180;
};

export const validateTemperature = (temperature: number): boolean => {
  return temperature >= -50 && temperature <= 100;
};

export const validateHumidity = (humidity: number): boolean => {
  return humidity >= 0 && humidity <= 100;
};

export const validateProductId = (productId: string): boolean => {
  return /^[a-zA-Z0-9\-_]+$/.test(productId) && productId.length >= 1 && productId.length <= 50;
};

export const validateEventType = (eventType: string): boolean => {
  const validTypes = ['sourced', 'manufactured', 'quality_checked', 'packaged', 'shipped', 'delivered'];
  return validTypes.includes(eventType);
};
