// ============================================================
// types.ts - Core type definitions
// ============================================================

export type Channel = 'email' | 'sms' | 'push';

export type NotificationType = 'otp' | 'alert' | 'marketing' | 'receipt';

export type Language = 'es' | 'en';

export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'retried';

export interface NotificationPayload {
  to: string;           // email / phone / device token
  channel: Channel;
  type: NotificationType;
  language?: Language;  // defaults to 'en'
  variables: Record<string, string>; // template variable substitution
  metadata?: Record<string, unknown>;
}

export interface NotificationLog {
  id: string;
  createdAt: string;
  updatedAt: string;
  channel: Channel;
  type: NotificationType;
  language: Language;
  to: string;
  subject?: string;
  body: string;
  status: NotificationStatus;
  attempts: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface NotificationProvider {
  channel: Channel;
  send(log: NotificationLog): Promise<SendResult>;
}

export interface Template {
  subject?: string; // only for email
  body: string;
}