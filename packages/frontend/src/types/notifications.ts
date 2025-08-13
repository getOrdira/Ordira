export interface Notification {
    id: string;
    text: string;
    isNew: boolean;
    createdAt: string;
    type: 'vote' | 'certificate' | 'product' | 'system';
  }