import { randomUUID } from 'crypto';
import type { NotificationLog, NotificationPayload, SendResult } from './types';
import { db } from './db/store';
import { getProvider } from './providers/index';
import { getTemplate, renderTemplate } from '../templates/index';

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 500;

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function attemptSend(log: NotificationLog): Promise<SendResult> {
  const provider = getProvider(log.channel);
  return provider.send(log);
}

export async function sendNotification(payload: NotificationPayload): Promise<NotificationLog> {
  const lang = payload.language ?? 'en';

  const rawTemplate = getTemplate(payload.type, lang, payload.channel);
  const rendered = renderTemplate(rawTemplate, payload.variables);

  const now = new Date().toISOString();
  const log: NotificationLog = {
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
    channel: payload.channel,
    type: payload.type,
    language: lang,
    to: payload.to,
    subject: rendered.subject,
    body: rendered.body,
    status: 'pending',
    attempts: 0,
    metadata: payload.metadata,
  };

  await db.save(log);

  let lastError: string | undefined;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const isRetry = attempt > 1;

    await db.update(log.id, {
      attempts: attempt,
      status: isRetry ? 'retried' : 'pending',
    });

    const result = await attemptSend({ ...log, attempts: attempt });

    if (result.success) {
      const final = await db.update(log.id, {
        status: 'sent',
        attempts: attempt,
        error: undefined,
      });
      console.log(`[NOTIFICATION] ✅ id=${log.id} channel=${log.channel} attempt=${attempt}`);
      return final!;
    }

    lastError = result.error;
    console.warn(`[NOTIFICATION] ⚠️  id=${log.id} attempt=${attempt} error=${lastError}`);

    if (attempt < MAX_ATTEMPTS) await sleep(RETRY_DELAY_MS * attempt);
  }

  const failed = await db.update(log.id, {
    status: 'failed',
    error: lastError,
  });
  console.error(`[NOTIFICATION] ❌ id=${log.id} failed after ${MAX_ATTEMPTS} attempts`);
  return failed!;
}