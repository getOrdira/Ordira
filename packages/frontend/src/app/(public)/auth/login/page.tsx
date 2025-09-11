// src/app/(public)/auth/login/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'next/navigation';
import * as z from 'zod';
import { useAuth } from '@/providers/auth-provider';
import { authHelpers } from '@/lib/api/auth';
import { Eye, EyeOff, ArrowRight, CheckCircle, AlertCircle, Building2, Factory } from 'lucide-react';
import Link from 'next/link';

// Validation schemas aligned with backend validation
const loginSchema = z.object({
  email: z.string()
    .email('Please enter a valid email address')
    .min(1, 'Email is required'),
  password: z.string()
    .min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

const registerBusinessSchema = z.object({
  businessName: z.string()
    .min(2, 'Business name must be at least 2 characters')
    .max(100, 'Business name cannot exceed 100 characters'),
  businessEmail: z.string()
    .email('Please enter a valid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
  contactName: z.string()
    .min(2, 'Contact name is required'),
  industry: z.string().optional(),
  country: z.string().optional(),
  planType: z.enum(['foundation', 'growth', 'premium', 'enterprise']).default('foundation'),
});

const registerManufacturerSchema = z.object({
  name: z.string()
    .min(2, 'Company name must be at least 2 characters')
    .max(100, 'Company name cannot exceed 100 characters'),
  email: z.string()
    .email('Please enter a valid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
  industry: z.string().optional(),
  description: z.string().optional(),
  country: z.string().optional(),
  establishedYear: z.number().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterBusinessFormValues = z.infer<typeof registerBusinessSchema>;
type RegisterManufacturerFormValues = z.infer<typeof registerManufacturerSchema>;

export default function AuthPage() {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [userType, setUserType] = useState<'brand' | 'manufacturer'>('brand');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  
  const { login } = useAuth();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams?.get('redirect');
  const errorParam = searchParams?.get('error');

  // Handle URL parameters
  useEffect(() => {
    if (errorParam === 'unauthorized') {
      setError('You need to log in to access that page');
    } else if (errorParam === 'authentication_required') {
      setError('Please log in to continue');
    }
  }, [errorParam]);

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      rememberMe: false,
    },
  });

  // Business registration form
  const businessForm = useForm<RegisterBusinessFormValues>({
    resolver: zodResolver(registerBusinessSchema),
    defaultValues: {
      planType: 'foundation',
    },
  });

  // Manufacturer registration form
  const manufacturerForm = useForm<RegisterManufacturerFormValues>({
    resolver: zodResolver(registerManufacturerSchema),
  });

  const onLogin = async (data: LoginFormValues) => {
    setError(null);
    setIsLoading(true);
    
    try {
      // Add device fingerprint for security
      const credentials = {
        ...data,
        deviceFingerprint: authHelpers.generateDeviceFingerprint(),
      };
      
      await login(credentials);
      // AuthProvider will handle redirect based on user role
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const onRegisterBusiness = async (data: RegisterBusinessFormValues) => {
    setError(null);
    setIsLoading(true);
    
    try {
      const registrationData = {
        ...data,
        deviceFingerprint: authHelpers.generateDeviceFingerprint(),
      };
      
      await authHelpers.smartRegister(registrationData);
      setSuccess('Account created! Please check your email to verify your account.');
      
      // Switch to login mode after successful registration
      setTimeout(() => {
        setAuthMode('login');
        setSuccess(null);
        loginForm.setValue('email', data.businessEmail);
      }, 2000);
      
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const onRegisterManufacturer = async (data: RegisterManufacturerFormValues) => {
    setError(null);
    setIsLoading(true);
    
    try {
      const registrationData = {
        ...data,
        deviceFingerprint: authHelpers.generateDeviceFingerprint(),
      };
      
      await authHelpers.smartRegister(registrationData);
      setSuccess('Account created! Please check your email to verify your account.');
      
      // Switch to login mode after successful registration
      setTimeout(() => {
        setAuthMode('login');
        setSuccess(null);
        loginForm.setValue('email', data.email);
      }, 2000);
      
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForms = () => {
    setError(null);
    setSuccess(null);
    loginForm.reset();
    businessForm.reset();
    manufacturerForm.reset();
  };

  const handleModeSwitch = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    resetForms();
  };

  const handleUserTypeSwitch = (type: 'brand' | 'manufacturer') => {
    setUserType(type);
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%239C92AC%22%20fill-opacity%3D%220.05%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20" />
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob" />
        <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000" />
      </div>

      {/* Auth Card */}
      <div className="relative z-10 w-full max-w-lg mx-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
          {/* Header */}
          <div className="px-8 pt-8 pb-4">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold text-white mb-2">
                {authMode === 'login' ? 'Welcome Back' : 'Join Ordira'}
              </h1>
              <p className="text-gray-300 text-sm">
                {authMode === 'login' 
                  ? 'Sign in to your account to continue' 
                  : 'Create your account and start collaborating'}
              </p>
            </div>

            {/* Mode Toggle */}
            <div className="relative flex bg-gray-800/50 rounded-full p-1 mb-6">
              <button
                onClick={() => handleModeSwitch('login')}
                className={`flex-1 py-3 px-6 text-sm font-semibold rounded-full transition-all duration-300 ${
                  authMode === 'login' 
                    ? 'text-white bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => handleModeSwitch('register')}
                className={`flex-1 py-3 px-6 text-sm font-semibold rounded-full transition-all duration-300 ${
                  authMode === 'register' 
                    ? 'text-white bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Sign Up
              </button>
            </div>
          </div>

          {/* Forms Container */}
          <div className="px-8 pb-8">
            {/* Success/Error Messages */}
            {success && (
              <div className="mb-4 p-4 rounded-lg bg-green-600/20 border border-green-600/30 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                <p className="text-green-300 text-sm">{success}</p>
              </div>
            )}
            
            {error && (
              <div className="mb-4 p-4 rounded-lg bg-red-600/20 border border-red-600/30 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            {authMode === 'login' ? (
              /* Login Form */
              <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    {...loginForm.register('email')}
                    className="w-full px-4 py-3 text-white bg-gray-800/50 border border-gray-600/50 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
                    placeholder="Enter your email"
                  />
                  {loginForm.formState.errors.email && (
                    <p className="mt-2 text-xs text-red-400">
                      {loginForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      {...loginForm.register('password')}
                      className="w-full px-4 py-3 text-white bg-gray-800/50 border border-gray-600/50 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 placeholder-gray-400 pr-12"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {loginForm.formState.errors.password && (
                    <p className="mt-2 text-xs text-red-400">
                      {loginForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      {...loginForm.register('rememberMe')}
                      className="w-4 h-4 text-purple-600 bg-gray-800/50 border-gray-600/50 rounded focus:ring-purple-500 focus:ring-2"
                    />
                    <span className="ml-2 text-sm text-gray-300">Remember me</span>
                  </label>
                  <Link href="/auth/forgot-password" className="text-sm text-purple-400 hover:text-purple-300 transition-colors">
                    Forgot password?
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-6 text-white font-semibold bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl hover:from-purple-700 hover:to-blue-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* Registration Form */
              <div className="space-y-6">
                {/* User Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    I am registering as a:
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleUserTypeSwitch('brand')}
                      className={`p-4 rounded-xl border transition-all duration-200 ${
                        userType === 'brand'
                          ? 'border-purple-500 bg-purple-600/20 text-white'
                          : 'border-gray-600/50 bg-gray-800/30 text-gray-300 hover:border-gray-500'
                      }`}
                    >
                      <Building2 className="w-6 h-6 mx-auto mb-2" />
                      <div className="text-sm font-medium">Brand</div>
                      <div className="text-xs text-gray-400 mt-1">Businesses & Companies</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUserTypeSwitch('manufacturer')}
                      className={`p-4 rounded-xl border transition-all duration-200 ${
                        userType === 'manufacturer'
                          ? 'border-purple-500 bg-purple-600/20 text-white'
                          : 'border-gray-600/50 bg-gray-800/30 text-gray-300 hover:border-gray-500'
                      }`}
                    >
                      <Factory className="w-6 h-6 mx-auto mb-2" />
                      <div className="text-sm font-medium">Manufacturer</div>
                      <div className="text-xs text-gray-400 mt-1">Production Partners</div>
                    </button>
                  </div>
                </div>

                {/* Dynamic Registration Form */}
                {userType === 'brand' ? (
                  <form onSubmit={businessForm.handleSubmit(onRegisterBusiness)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Business Name *
                        </label>
                        <input
                          type="text"
                          {...businessForm.register('businessName')}
                          className="w-full px-4 py-3 text-white bg-gray-800/50 border border-gray-600/50 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
                          placeholder="Company name"
                        />
                        {businessForm.formState.errors.businessName && (
                          <p className="mt-1 text-xs text-red-400">
                            {businessForm.formState.errors.businessName.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Contact Name *
                        </label>
                        <input
                          type="text"
                          {...businessForm.register('contactName')}
                          className="w-full px-4 py-3 text-white bg-gray-800/50 border border-gray-600/50 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
                          placeholder="Your full name"
                        />
                        {businessForm.formState.errors.contactName && (
                          <p className="mt-1 text-xs text-red-400">
                            {businessForm.formState.errors.contactName.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Business Email *
                      </label>
                      <input
                        type="email"
                        {...businessForm.register('businessEmail')}
                        className="w-full px-4 py-3 text-white bg-gray-800/50 border border-gray-600/50 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
                        placeholder="business@company.com"
                      />
                      {businessForm.formState.errors.businessEmail && (
                        <p className="mt-1 text-xs text-red-400">
                          {businessForm.formState.errors.businessEmail.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Password *
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          {...businessForm.register('password')}
                          className="w-full px-4 py-3 text-white bg-gray-800/50 border border-gray-600/50 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 placeholder-gray-400 pr-12"
                          placeholder="Create a strong password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-gray-400">
                        Must contain uppercase, lowercase, and number
                      </p>
                      {businessForm.formState.errors.password && (
                        <p className="mt-1 text-xs text-red-400">
                          {businessForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Industry
                        </label>
                        <input
                          type="text"
                          {...businessForm.register('industry')}
                          className="w-full px-4 py-3 text-white bg-gray-800/50 border border-gray-600/50 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
                          placeholder="e.g., Technology"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Country
                        </label>
                        <input
                          type="text"
                          {...businessForm.register('country')}
                          className="w-full px-4 py-3 text-white bg-gray-800/50 border border-gray-600/50 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
                          placeholder="Country"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3 px-6 text-white font-semibold bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl hover:from-purple-700 hover:to-blue-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          Create Brand Account
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={manufacturerForm.handleSubmit(onRegisterManufacturer)} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Company Name *
                      </label>
                      <input
                        type="text"
                        {...manufacturerForm.register('name')}
                        className="w-full px-4 py-3 text-white bg-gray-800/50 border border-gray-600/50 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
                        placeholder="Manufacturing company name"
                      />
                      {manufacturerForm.formState.errors.name && (
                        <p className="mt-1 text-xs text-red-400">
                          {manufacturerForm.formState.errors.name.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        {...manufacturerForm.register('email')}
                        className="w-full px-4 py-3 text-white bg-gray-800/50 border border-gray-600/50 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
                        placeholder="your@company.com"
                      />
                      {manufacturerForm.formState.errors.email && (
                        <p className="mt-1 text-xs text-red-400">
                          {manufacturerForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Password *
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          {...manufacturerForm.register('password')}
                          className="w-full px-4 py-3 text-white bg-gray-800/50 border border-gray-600/50 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 placeholder-gray-400 pr-12"
                          placeholder="Create a strong password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-gray-400">
                        Must contain uppercase, lowercase, and number
                      </p>
                      {manufacturerForm.formState.errors.password && (
                        <p className="mt-1 text-xs text-red-400">
                          {manufacturerForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Description
                      </label>
                      <textarea
                        {...manufacturerForm.register('description')}
                        rows={3}
                        className="w-full px-4 py-3 text-white bg-gray-800/50 border border-gray-600/50 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 placeholder-gray-400 resize-none"
                        placeholder="Brief description of your manufacturing capabilities..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Industry
                        </label>
                        <input
                          type="text"
                          {...manufacturerForm.register('industry')}
                          className="w-full px-4 py-3 text-white bg-gray-800/50 border border-gray-600/50 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
                          placeholder="e.g., Electronics"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Country
                        </label>
                        <input
                          type="text"
                          {...manufacturerForm.register('country')}
                          className="w-full px-4 py-3 text-white bg-gray-800/50 border border-gray-600/50 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
                          placeholder="Country"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3 px-6 text-white font-semibold bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl hover:from-purple-700 hover:to-blue-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          Create Manufacturer Account
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-gray-700/50 text-center">
              <p className="text-xs text-gray-400">
                By continuing, you agree to our{' '}
                <Link href="/terms" className="text-purple-400 hover:text-purple-300 transition-colors">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-purple-400 hover:text-purple-300 transition-colors">
                  Privacy Policy
                </Link>
              </p>
            </div>
          </div>
        </div>
        
        {/* Additional Info */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-400">
            Need help?{' '}
            <Link href="/support" className="text-purple-400 hover:text-purple-300 transition-colors">
              Contact Support
            </Link>
          </p>
        </div>
      </div>
      
      {/* Custom Styles */}
      <style jsx>{`
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
