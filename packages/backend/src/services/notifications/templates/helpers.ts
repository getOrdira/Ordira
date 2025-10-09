export interface TemplateParts {
  subject: string;
  text: string;
  html?: string;
}

export const formatCurrency = (amount: number, currency: string = 'USD') => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
};
