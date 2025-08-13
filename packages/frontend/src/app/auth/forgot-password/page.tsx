// src/app/auth/forgot-password/page.tsx
'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { authService } from '@/lib/auth/auth-service';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Client-side validation
    if (!email.trim()) {
      setError('Email address is required');
      setIsLoading(false);
      return;
    }

    if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
      setError('Please enter a valid email address');
      setIsLoading(false);
      return;
    }

    try {
      // Call the forgot password API endpoint that matches your backend
      await authService.forgotPassword(email);
      setIsSubmitted(true);
    } catch (error: any) {
      console.error('Forgot password error:', error);
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Failed to send reset email. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Success state
  if (isSubmitted) {
    return (
      <div className="relative h-screen flex items-center justify-center px-4 bg-gradient-to-br from-black via-accent/30 to-black">
        <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircleIcon className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-dark mb-4">Check Your Email</h2>
          <p className="text-gray-600 mb-2">
            We've sent a password reset link to:
          </p>
          <p className="font-semibold text-dark mb-6">{email}</p>
          <p className="text-sm text-gray-500 mb-6">
            If you don't see the email, check your spam folder or try again with a different email address.
          </p>
          <div className="space-y-3">
            <Link 
              href="/auth/login"
              className="block w-full px-6 py-3 bg-accent text-white rounded-lg font-medium hover:bg-accent-dark transition-colors"
            >
              Back to Login
            </Link>
            <button
              onClick={() => {
                setIsSubmitted(false);
                setEmail('');
                setError('');
              }}
              className="block w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Try Different Email
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen flex items-center justify-center px-4 bg-gradient-to-br from-black via-accent/30 to-black bg-[url('/noise.png')] bg-repeat">
      {/* Logo */}
      <div className="absolute top-4 left-4 text-white text-lg font-bold">
        LOGO
      </div>
      
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-8">
        {/* Back Button */}
        <Link 
          href="/auth/login"
          className="inline-flex items-center text-sm text-gray-600 hover:text-dark transition-colors mb-6 group"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
          Back to Login
        </Link>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-dark mb-2">Forgot Password?</h1>
          <p className="text-sm text-gray-600">
            No worries! Enter your email address and we'll send you reset instructions.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
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
                if (error) setError('');
              }}
              placeholder="Enter your email address"
              className={`w-full h-12 px-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent transition-colors ${
                error 
                  ? 'border-red-400 focus:ring-red-400' 
                  : 'border-gray-300 focus:border-accent'
              }`}
              disabled={isLoading}
              autoComplete="email"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              We'll send reset instructions to this email address
            </p>
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
                Sending Instructions...
              </>
            ) : (
              'Send Reset Instructions'
            )}
          </button>
        </form>

        {/* Footer Links */}
        <div className="mt-8 text-center space-y-4">
          <p className="text-sm text-gray-600">
            Remember your password?{' '}
            <Link 
              href="/auth/login"
              className="text-accent hover:text-accent-dark font-medium transition-colors"
            >
              Sign in here
            </Link>
          </p>
          
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