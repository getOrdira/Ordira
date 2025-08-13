// src/lib/utils/format.ts
export function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
  
  export function formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  
  export function formatTxHash(hash: string): string {
    if (!hash) return '—';
    return hash.length > 14 ? `${hash.slice(0, 8)}…${hash.slice(-6)}` : hash;
  }
  
  export function formatNumber(num: number): string {
    return num.toLocaleString();
  }
  
  export function formatCurrency(amount: number, currency = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  }
  
  export function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '…';
  }