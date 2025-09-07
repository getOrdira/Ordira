// src/models/location.model.ts
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ILocation extends Document {
  // Core location information
  name: string;
  description?: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode?: string;
  
  // Geographic coordinates
  coordinates: {
    lat: number;
    lng: number;
  };
  
  // Location type and capabilities
  locationType: 'factory' | 'warehouse' | 'distribution_center' | 'retail_store' | 'custom';
  capabilities: string[]; // e.g., ['manufacturing', 'quality_check', 'packaging']
  
  // Event types that can occur at this location
  allowedEventTypes: Array<'sourced' | 'manufactured' | 'quality_checked' | 'packaged' | 'shipped' | 'delivered'>;
  
  // Owner information
  manufacturer: Types.ObjectId;
  
  // Status and metadata
  isActive: boolean;
  contactInfo?: {
    phone?: string;
    email?: string;
    contactPerson?: string;
  };
  
  // Environmental conditions (for quality tracking)
  environmentalConditions?: {
    temperatureRange?: { min: number; max: number };
    humidityRange?: { min: number; max: number };
    specialRequirements?: string[];
  };
  
  // Analytics
  eventCount: number;
  lastEventAt?: Date;
  
  // Instance methods
  canHandleEventType(eventType: string): boolean;
  updateEventCount(): Promise<ILocation>;
  getDistanceFrom(otherLocation: ILocation): number; // in kilometers
  isWithinRadius(otherCoordinates: { lat: number; lng: number }, radiusKm: number): boolean;
}

const LocationSchema = new Schema<ILocation>({
  // Core location information
  name: {
    type: String,
    required: [true, 'Location name is required'],
    trim: true,
    maxlength: [200, 'Location name cannot exceed 200 characters'],
    index: true
  },
  
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true,
    maxlength: [500, 'Address cannot exceed 500 characters']
  },
  
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true,
    maxlength: [100, 'City cannot exceed 100 characters'],
    index: true
  },
  
  state: {
    type: String,
    required: [true, 'State is required'],
    trim: true,
    maxlength: [100, 'State cannot exceed 100 characters']
  },
  
  country: {
    type: String,
    required: [true, 'Country is required'],
    trim: true,
    maxlength: [100, 'Country cannot exceed 100 characters'],
    index: true
  },
  
  postalCode: {
    type: String,
    trim: true,
    maxlength: [20, 'Postal code cannot exceed 20 characters']
  },
  
  // Geographic coordinates
  coordinates: {
    lat: {
      type: Number,
      required: [true, 'Latitude is required'],
      min: [-90, 'Latitude must be between -90 and 90'],
      max: [90, 'Latitude must be between -90 and 90']
    },
    lng: {
      type: Number,
      required: [true, 'Longitude is required'],
      min: [-180, 'Longitude must be between -180 and 180'],
      max: [180, 'Longitude must be between -180 and 180']
    }
  },
  
  // Location type and capabilities
  locationType: {
    type: String,
    required: [true, 'Location type is required'],
    enum: {
      values: ['factory', 'warehouse', 'distribution_center', 'retail_store', 'custom'],
      message: 'Location type must be one of: factory, warehouse, distribution_center, retail_store, custom'
    },
    index: true
  },
  
  capabilities: [{
    type: String,
    trim: true,
    maxlength: [100, 'Capability name cannot exceed 100 characters']
  }],
  
  // Event types that can occur at this location
  allowedEventTypes: [{
    type: String,
    required: true,
    enum: ['sourced', 'manufactured', 'quality_checked', 'packaged', 'shipped', 'delivered']
  }],
  
  // Owner information
  manufacturer: {
    type: Schema.Types.ObjectId,
    ref: 'Manufacturer',
    required: [true, 'Manufacturer is required'],
    index: true
  },
  
  // Status and metadata
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  contactInfo: {
    phone: {
      type: String,
      trim: true,
      match: [/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format']
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format']
    },
    contactPerson: {
      type: String,
      trim: true,
      maxlength: [100, 'Contact person name cannot exceed 100 characters']
    }
  },
  
  // Environmental conditions
  environmentalConditions: {
    temperatureRange: {
      min: { type: Number },
      max: { type: Number }
    },
    humidityRange: {
      min: { type: Number, min: 0, max: 100 },
      max: { type: Number, min: 0, max: 100 }
    },
    specialRequirements: [{
      type: String,
      trim: true,
      maxlength: [200, 'Special requirement cannot exceed 200 characters']
    }]
  },
  
  // Analytics
  eventCount: {
    type: Number,
    default: 0,
    min: [0, 'Event count cannot be negative'],
    index: true
  },
  
  lastEventAt: {
    type: Date,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

// ====================
// INDEXES FOR PERFORMANCE
// ====================

// Primary indexes
LocationSchema.index({ manufacturer: 1, isActive: 1 });
LocationSchema.index({ manufacturer: 1, locationType: 1 });
LocationSchema.index({ manufacturer: 1, city: 1, country: 1 });

// Geographic indexes for location-based queries
LocationSchema.index({ 'coordinates.lat': 1, 'coordinates.lng': 1 });
LocationSchema.index({ country: 1, state: 1, city: 1 });

// Event type and capability indexes
LocationSchema.index({ allowedEventTypes: 1 });
LocationSchema.index({ capabilities: 1 });

// Analytics indexes
LocationSchema.index({ eventCount: -1 });
LocationSchema.index({ lastEventAt: -1 });

// ====================
// VALIDATION MIDDLEWARE
// ====================

// Pre-save: Data cleaning and validation
LocationSchema.pre('save', function(next) {
  // Ensure coordinates are valid
  if (this.coordinates.lat < -90 || this.coordinates.lat > 90) {
    return next(new Error('Invalid latitude: must be between -90 and 90'));
  }
  if (this.coordinates.lng < -180 || this.coordinates.lng > 180) {
    return next(new Error('Invalid longitude: must be between -180 and 180'));
  }
  
  // Clean up capabilities array
  if (this.capabilities && this.capabilities.length > 0) {
    this.capabilities = [...new Set(
      this.capabilities
        .filter(cap => cap && cap.trim())
        .map(cap => cap.toLowerCase().trim())
    )];
  }
  
  // Clean up special requirements
  if (this.environmentalConditions?.specialRequirements && this.environmentalConditions.specialRequirements.length > 0) {
    this.environmentalConditions.specialRequirements = [...new Set(
      this.environmentalConditions.specialRequirements
        .filter(req => req && req.trim())
        .map(req => req.trim())
    )];
  }
  
  // Validate temperature range
  if (this.environmentalConditions?.temperatureRange) {
    const { min, max } = this.environmentalConditions.temperatureRange;
    if (min !== undefined && max !== undefined && min > max) {
      return next(new Error('Temperature minimum cannot be greater than maximum'));
    }
  }
  
  // Validate humidity range
  if (this.environmentalConditions?.humidityRange) {
    const { min, max } = this.environmentalConditions.humidityRange;
    if (min !== undefined && max !== undefined && min > max) {
      return next(new Error('Humidity minimum cannot be greater than maximum'));
    }
  }
  
  next();
});

// ====================
// INSTANCE METHODS
// ====================

// Check if location can handle specific event type
LocationSchema.methods.canHandleEventType = function(eventType: string): boolean {
  return this.allowedEventTypes.includes(eventType);
};

// Update event count and last event timestamp
LocationSchema.methods.updateEventCount = function(): Promise<ILocation> {
  this.eventCount = (this.eventCount || 0) + 1;
  this.lastEventAt = new Date();
  return this.save();
};

// Calculate distance between two locations using Haversine formula
LocationSchema.methods.getDistanceFrom = function(otherLocation: ILocation): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = this.toRadians(otherLocation.coordinates.lat - this.coordinates.lat);
  const dLng = this.toRadians(otherLocation.coordinates.lng - this.coordinates.lng);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(this.toRadians(this.coordinates.lat)) * Math.cos(this.toRadians(otherLocation.coordinates.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Check if coordinates are within radius of this location
LocationSchema.methods.isWithinRadius = function(
  otherCoordinates: { lat: number; lng: number }, 
  radiusKm: number
): boolean {
  const distance = this.getDistanceFrom({ coordinates: otherCoordinates } as ILocation);
  return distance <= radiusKm;
};

// Helper method to convert degrees to radians
LocationSchema.methods.toRadians = function(degrees: number): number {
  return degrees * (Math.PI / 180);
};

// ====================
// STATIC METHODS
// ====================

// Find locations by manufacturer
LocationSchema.statics.findByManufacturer = function(manufacturerId: string) {
  return this.find({ manufacturer: manufacturerId, isActive: true }).sort({ name: 1 });
};

// Find locations that can handle specific event type
LocationSchema.statics.findByEventType = function(eventType: string, manufacturerId?: string) {
  const query: any = { 
    allowedEventTypes: eventType, 
    isActive: true 
  };
  if (manufacturerId) {
    query.manufacturer = manufacturerId;
  }
  return this.find(query).sort({ name: 1 });
};

// Find locations within radius of given coordinates
LocationSchema.statics.findWithinRadius = function(
  coordinates: { lat: number; lng: number },
  radiusKm: number,
  manufacturerId?: string
) {
  const query: any = { isActive: true };
  if (manufacturerId) {
    query.manufacturer = manufacturerId;
  }
  
  return this.find(query).then((locations) => {
    return locations.filter(location => 
      location.isWithinRadius(coordinates, radiusKm)
    );
  });
};

// Get location statistics for manufacturer
LocationSchema.statics.getLocationStats = function(manufacturerId: string) {
  return this.aggregate([
    { $match: { manufacturer: manufacturerId } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        active: { $sum: { $cond: ['$isActive', 1, 0] } },
        totalEvents: { $sum: '$eventCount' },
        byType: {
          $push: {
            type: '$locationType',
            eventCount: '$eventCount'
          }
        }
      }
    }
  ]);
};

export const Location = mongoose.model<ILocation>('Location', LocationSchema);
