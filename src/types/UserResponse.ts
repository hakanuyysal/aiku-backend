export interface UserResponse {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  title?: string;
  location?: string;
  profileInfo?: string;
  profilePhoto?: string;
  linkedin?: string;
  instagram?: string;
  facebook?: string;
  twitter?: string;
  emailVerified?: boolean;
  locale?: {
    country: string;
    language: string;
  };
  createdAt: Date;
  updatedAt: Date;
  subscriptionStatus?: 'active' | 'pending' | 'trial' | 'cancelled' | 'expired';
  subscriptionStartDate?: Date;
  trialEndsAt?: Date;
  subscriptionPlan?: 'startup' | 'business' | 'investor' | undefined;
  subscriptionPeriod?: 'monthly' | 'yearly';
  subscriptionAmount?: number;
  autoRenewal?: boolean;
  paymentMethod?: 'creditCard' | 'bankTransfer' | 'other';
  savedCardId?: string;
  lastPaymentDate?: Date;
  nextPaymentDate?: Date;
  billingAddress?: string;
  vatNumber?: string;
  isSubscriptionActive?: boolean;
} 