import type { NotificationLog, NotificationProvider, SendResult } from '../types';

// ─── Email Provider ────────────────────────────────────────────────────────

export class EmailProvider implements NotificationProvider {
  channel = 'email' as const;

  async send(log: NotificationLog): Promise<SendResult> {
    if (process.env.RESEND_API_KEY) {
      return this.sendWithResend(log);
    }
    return this.simulate(log);
  }

  private async sendWithResend(log: NotificationLog): Promise<SendResult> {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM ?? 'onboarding@resend.dev',
          to: [log.to],
          subject: log.subject ?? '(no subject)',
          text: log.body,
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        return { success: false, error: `Resend error ${res.status}: ${err}` };
      }
      const data = await res.json();
      return { success: true, messageId: data.id };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }

  private simulate(log: NotificationLog): SendResult {
    const fail = Math.random() < 0.1;
    console.log(`[EMAIL SIMULATED] to=${log.to} subject="${log.subject}" fail=${fail}`);
    if (fail) return { success: false, error: 'Simulated SMTP timeout' };
    return { success: true, messageId: `sim_email_${Date.now()}` };
  }
}

// ─── SMS Provider (Twilio) ─────────────────────────────────────────────────

export class SmsProvider implements NotificationProvider {
  channel = 'sms' as const;

  async send(log: NotificationLog): Promise<SendResult> {
    const sid   = process.env.TWILIO_SID;
    const token = process.env.TWILIO_TOKEN;
    const from  = process.env.TWILIO_FROM;

    if (!sid || !token || !from) {
      console.log(`[SMS SIMULATED] to=${log.to} body="${log.body.slice(0, 60)}"`);
      return { success: true, messageId: `sim_sms_${Date.now()}` };
    }

    try {
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ To: log.to, From: from, Body: log.body }),
        }
      );
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.message };
      return { success: true, messageId: data.sid };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }
}

// ─── Push Provider (Simulado) ──────────────────────────────────────────────

export class PushProvider implements NotificationProvider {
  channel = 'push' as const;

  async send(log: NotificationLog): Promise<SendResult> {
    const fail = Math.random() < 0.1;
    console.log(`[PUSH SIMULATED] token=${log.to.slice(0, 20)}... body="${log.body.slice(0, 60)}" fail=${fail}`);
    if (fail) return { success: false, error: 'Simulated FCM error' };
    return { success: true, messageId: `sim_push_${Date.now()}` };
  }
}

// ─── Registry ─────────────────────────────────────────────────────────────

const registry: Record<string, NotificationProvider> = {
  email: new EmailProvider(),
  sms:   new SmsProvider(),
  push:  new PushProvider(),
};

export function getProvider(channel: string): NotificationProvider {
  const provider = registry[channel];
  if (!provider) throw new Error(`No provider registered for channel: ${channel}`);
  return provider;
}