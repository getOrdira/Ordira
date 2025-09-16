import React from 'react';

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
  requirements: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
  };
}

export function PasswordStrengthIndicator({ password, className = '' }: PasswordStrengthIndicatorProps) {
  const calculateStrength = (password: string): PasswordStrength => {
    if (!password) {
      return {
        score: 0,
        label: '',
        color: '#e5e7eb',
        requirements: {
          minLength: false,
          hasUppercase: false,
          hasLowercase: false,
          hasNumber: false,
          hasSpecialChar: false,
        }
      };
    }

    const requirements = {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[@$!%*?&]/.test(password),
    };

    let score = 0;
    let label = '';
    let color = '';

    // Calculate score based on requirements
    if (requirements.minLength) score += 20;
    if (requirements.hasUppercase) score += 20;
    if (requirements.hasLowercase) score += 20;
    if (requirements.hasNumber) score += 20;
    if (requirements.hasSpecialChar) score += 20;

    // Additional scoring for complexity
    if (password.length >= 12) score += 10;
    if (/(.)\1{2,}/.test(password)) score -= 10; // Repeated characters
    if (/^(.+)\1+$/.test(password)) score -= 20; // Pattern repetition

    // Ensure score is between 0 and 100
    score = Math.max(0, Math.min(100, score));

    // Determine label and color based on score
    if (score < 20) {
      label = 'Very Weak';
      color = '#ef4444'; // Red
    } else if (score < 40) {
      label = 'Weak';
      color = '#f97316'; // Orange
    } else if (score < 60) {
      label = 'Fair';
      color = '#eab308'; // Yellow
    } else if (score < 80) {
      label = 'Good';
      color = '#22c55e'; // Green
    } else {
      label = 'Strong';
      color = '#16a34a'; // Dark Green
    }

    return {
      score,
      label,
      color,
      requirements
    };
  };

  const strength = calculateStrength(password);

  if (!password) {
    return null;
  }

  return (
    <div 
      className={className}
      style={{ 
        paddingLeft: '8px',
        paddingBottom: '8px'
      }}
    >
      <span 
        className="text-xs font-medium"
        style={{ color: strength.color }}
      >
        {strength.label}
      </span>
    </div>
  );
}
