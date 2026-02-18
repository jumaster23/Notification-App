import type { NotificationLog, NotificationProvider, SendResult } from '../types';

// ─── Email Provider (Real with Resend, simulated as fallback) ──────────────

export class EmailProvider implements NotificationProvider {
  channel = 'email' as const;

  async send(log: NotificationLog): Promise<SendResult> {
    // If RESEND_API_KEY is configured, use Resend (real email)
    if (process.env.RESEND_API_KEY) {
      return this.sendWithResend(log);
    }
    // Otherwise simulate
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
          from: process.env.EMAIL_FROM ?? 'notifications@yourdomain.com',
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
    // Simulate 10% failure rate for testing retries
    const fail = Math.random() < 0.1;
    console.log(`[EMAIL SIMULATED] to=${log.to} subject="${log.subject}" fail=${fail}`);
    if (fail) return { success: false, error: 'Simulated SMTP timeout' };
    return { success: true, messageId: `sim_email_${Date.now()}` };
  }
}

// ─── SMS Provider (Simulated — swap for Twilio) ─────────────────────────────

export class SmsProvider implements NotificationProvider {
  channel = 'sms' as const;

  async send(log: NotificationLog): Promise<SendResult> {
    // Swap body for real Twilio integration:
    // const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
    // const msg = await client.messages.create({ body: log.body, from: '...', to: log.to });
    // return { success: true, messageId: msg.sid };

    const fail = Math.random() < 0.1;
    console.log(`[SMS SIMULATED] to=${log.to} body="${log.body.slice(0, 60)}" fail=${fail}`);
    if (fail) return { success: false, error: 'Simulated SMS gateway error' };
    return { success: true, messageId: `sim_sms_${Date.now()}` };
  }
}

// ─── Push Provider (Simulated — swap for FCM/APNs) ─────────────────────────

export class PushProvider implements NotificationProvider {
  channel = 'push' as const;

  async send(log: NotificationLog): Promise<SendResult> {
    // Swap for Firebase Admin SDK:
    // await admin.messaging().send({ token: log.to, notification: { body: log.body } });

    const fail = Math.random() < 0.1;
    console.log(`[PUSH SIMULATED] token=${log.to.slice(0, 20)}... body="${log.body.slice(0, 60)}" fail=${fail}`);
    if (fail) return { success: false, error: 'Simulated FCM error' };
    return { success: true, messageId: `sim_push_${Date.now()}` };
  }
}

// ─── Provider Registry ────────────────────────────────────────────────────

const registry: Record<string, NotificationProvider> = {
  email: new EmailProvider(),
  sms: new SmsProvider(),
  push: new PushProvider(),
};

export function getProvider(channel: string): NotificationProvider {
  const provider = registry[channel];
  if (!provider) throw new Error(`No provider registered for channel: ${channel}`);
  return provider;
}