// src/app/auth/login/page.tsx
'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/solid';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ 
    email?: string; 
    password?: string; 
    general?: string 
  }>({});
  
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});
    
    // Client-side validation
    const newErrors: typeof errors = {};
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!password.trim()) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsLoading(false);
      return;
    }

    try {
      await login(email, password, rememberMe);
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Login failed. Please check your credentials and try again.';
      setErrors({ general: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative h-screen flex items-center justify-center px-4 bg-gradient-to-br from-black via-accent/30 to-black bg-[url('/noise.png')] bg-repeat">
      {/* Logo */}
      <div className="absolute top-4 left-4 text-white text-lg font-bold">
        LOGO
      </div>
      
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-dark mb-2">Welcome Back</h1>
          <p className="text-sm text-gray-600">
            Enter your email and password to access your account
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          {/* General Error */}
          {errors.general && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{errors.general}</p>
            </div>
          )}
          
          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) {
                  setErrors(prev => ({ ...prev, email: undefined }));
                }
              }}
              placeholder="Enter your email"
              className={`w-full h-12 px-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent transition-colors ${
                errors.email 
                  ? 'border-red-400 focus:ring-red-400' 
                  : 'border-gray-300 focus:border-accent'
              }`}
              disabled={isLoading}
              autoComplete="email"
              required
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) {
                    setErrors(prev => ({ ...prev, password: undefined }));
                  }
                }}
                placeholder="Enter your password"
                className={`w-full h-12 px-4 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent transition-colors ${
                  errors.password 
                    ? 'border-red-400 focus:ring-red-400' 
                    : 'border-gray-300 focus:border-accent'
                }`}
                disabled={isLoading}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeSlashIcon className="w-5 h-5" />
                ) : (
                  <EyeIcon className="w-5 h-5" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password}</p>
            )}
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent focus:ring-2 focus:ring-offset-0"
                disabled={isLoading}
              />
              <span className="ml-2 text-sm text-gray-700">Remember me</span>
            </label>
            <Link 
              href="/auth/forgot-password"
              className="text-sm text-accent hover:text-accent-dark transition-colors font-medium"
              tabIndex={isLoading ? -1 : 0}
            >
              Forgot password?
            </Link>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-dark text-accent rounded-lg font-medium hover:bg-accent hover:text-dark transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin mr-2" />
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Footer Links */}
        <div className="mt-8 text-center space-y-4">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link 
              href="/auth/register"
              className="text-accent hover:text-accent-dark font-medium transition-colors"
            >
              Sign up here
            </Link>
          </p>
          
          {/* Copyright */}
          <div className="text-xs text-gray-500 pt-4 border-t border-gray-200">
            'name' is a subsidiary of Despoke LLC Copyright 2025
          </div>
        </div>
      </div>
    </div>
  );
}