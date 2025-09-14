'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import Image from 'next/image';

// Login form validation schema
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function MobileLoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // TODO: Replace with actual API call
      console.log('Login data:', data);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccess('Login successful!');
    } catch (err) {
      setError('Login failed. Please check your credentials and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white p-4">
      {/* Mobile Header with Logo */}
      <div className="flex justify-center mb-8 pt-8">
        <Image 
          src="/ordira-logo.svg" 
          alt="Ordira Logo" 
          width={120}
          height={48}
          className="h-10 w-auto"
        />
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto">
        {/* Welcome Text */}
        <div className="text-center mb-8">
          <h2 className="font-serif font-bold text-3xl mb-2" style={{ 
            color: 'black', 
            lineHeight: '1.2'
          }}>Welcome</h2>
          <p className="text-sm text-gray-600" style={{ color: 'gray' }}>
            Enter your email and password to access your account
          </p>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-3">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 flex items-center gap-3">
            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
            <p className="text-green-700 text-sm">{success}</p>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={loginForm.handleSubmit(onSubmit)} className="space-y-6">
          {/* Email Field */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-black">
              Email
            </label>
            <input
              type="email"
              placeholder="Enter your email"
              {...loginForm.register('email')}
              style={{
                backgroundColor: '#f5f5f5',
                height: '48px',
                borderRadius: '12px',
                padding: '14px 18px',
                fontSize: '16px',
                border: 'none',
                color: '#000000',
                width: '100%',
                outline: 'none'
              }}
            />
            {loginForm.formState.errors.email && (
              <p className="text-sm text-red-600">{loginForm.formState.errors.email.message}</p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-black">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                {...loginForm.register('password')}
                style={{
                  backgroundColor: '#f5f5f5',
                  height: '48px',
                  borderRadius: '12px',
                  padding: '14px 50px 14px 18px',
                  fontSize: '16px',
                  border: 'none',
                  color: '#000000',
                  width: '100%',
                  outline: 'none'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '16px',
                  top: '12px',
                  width: '24px',
                  height: '24px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10
                }}
              >
                {showPassword ? (
                  <Eye className="w-5 h-5 text-orange-500" />
                ) : (
                  <EyeOff className="w-5 h-5 text-gray-400" />
                )}
              </button>
            </div>
            {loginForm.formState.errors.password && (
              <p className="text-sm text-red-600">{loginForm.formState.errors.password.message}</p>
            )}
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                {...loginForm.register('rememberMe')}
                style={{
                  width: '16px',
                  height: '16px',
                  accentColor: '#FF6900',
                  marginRight: '8px'
                }}
              />
              <span className="text-sm text-gray-600">Remember me</span>
            </label>
            <a 
              href="/auth/forgot-password" 
              className="text-sm font-medium hover:underline"
              style={{ color: '#FF6900' }}
            >
              Forgot password?
            </a>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              height: '48px',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              backgroundColor: isLoading ? '#CC5500' : '#FF6900',
              color: 'white',
              border: 'none',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.backgroundColor = '#CC5500';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.currentTarget.style.backgroundColor = '#FF6900';
              }
            }}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>

          {/* Sign Up Link */}
          <div className="text-center pt-4">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <a 
                href="/auth/register" 
                className="font-medium hover:underline"
                style={{ color: '#FF6900' }}
              >
                Sign up
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
