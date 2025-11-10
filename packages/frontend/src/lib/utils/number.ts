// src/lib/utils/number.ts
// Number and currency formatting helpers.

export const formatNumber = (value: number | string, locale: string = 'en-US'): string => {
  const numericValue = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(numericValue)) {
    return '';
  }

  return new Intl.NumberFormat(locale).format(numericValue);
};

export const formatCurrency = (
  amount: number | string,
  currency: string = 'USD',
  locale: string = 'en-US'
): string => {
  const numericAmount = typeof amount === 'string' ? Number(amount) : amount;
  if (!Number.isFinite(numericAmount)) {
    return '';
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: numericAmount % 1 === 0 ? 0 : 2
  }).format(numericAmount);
};

export const formatPercentage = (
  value: number | string,
  decimals: number = 1
): string => {
  const numericValue = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(numericValue)) {
    return '';
  }

  return `${numericValue.toFixed(decimals)}%`;
};

export const formatFileSize = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return '';
  }

  if (bytes === 0) {
    return '0 B';
  }

  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, index);

  return `${value.toFixed(index === 0 ? 0 : 1)} ${sizes[index]}`;
};


