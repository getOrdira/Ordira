// src/validation/auth.validation.ts
import Joi from 'joi';

export const registerBusinessSchema = Joi.object({
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  dateOfBirth: Joi.date().required(),
  email: Joi.string().email().required(),
  phone: Joi.string().required(),
  businessName: Joi.string().required(),
  regNumber: Joi.string().optional(),
  taxId: Joi.string().optional(),
  address: Joi.string().required(),
  password: Joi.string().min(8).required(),
});

export const verifyBusinessSchema = Joi.object({
  businessId: Joi.string().required(),
  emailCode: Joi.string().length(6).required(),
  phoneCode: Joi.string().length(6).required(),
});

export const loginBusinessSchema = Joi.object({
  emailOrPhone: Joi.string().required(),
  password: Joi.string().required(),
});

// User schemas
export const registerUserSchema = Joi.object({
    email:    Joi.string().email().required(),
    password: Joi.string().min(8).required()
  });
  
  export const verifyUserSchema = Joi.object({
    email:    Joi.string().email().required(),
    emailCode: Joi.string().required()
  });
  
  export const loginUserSchema = Joi.object({
    email:    Joi.string().email().required(),
    password: Joi.string().required()
  });
  
