import { NextRequest, NextResponse } from 'next/server';
import { sendNotification } from '@/lib/notification-service';
import { db } from '@/lib/db/store';
import type { Channel, Language, NotificationType } from '@/lib/types';
import type { NotificationLog } from '@/lib/types';

// ─── POST /api/notifications ──────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Basic validation
  const { to, channel, type, language, variables, metadata } = body as Record<string, unknown>;

  const validChannels: Channel[] = ['email', 'sms', 'push'];
  const validTypes: NotificationType[] = ['otp', 'alert', 'marketing', 'receipt'];
  const validLanguages: Language[] = ['en', 'es'];

  if (!to || typeof to !== 'string') {
    return NextResponse.json({ error: '`to` is required (string)' }, { status: 400 });
  }
  if (!channel || !validChannels.includes(channel as Channel)) {
    return NextResponse.json(
      { error: `\`channel\` must be one of: ${validChannels.join(', ')}` },
      { status: 400 }
    );
  }
  if (!type || !validTypes.includes(type as NotificationType)) {
    return NextResponse.json(
      { error: `\`type\` must be one of: ${validTypes.join(', ')}` },
      { status: 400 }
    );
  }
  if (language && !validLanguages.includes(language as Language)) {
    return NextResponse.json(
      { error: `\`language\` must be one of: ${validLanguages.join(', ')}` },
      { status: 400 }
    );
  }
  if (variables && typeof variables !== 'object') {
    return NextResponse.json({ error: '`variables` must be an object' }, { status: 400 });
  }

  try {
    const log = await sendNotification({
      to,
      channel: channel as Channel,
      type: type as NotificationType,
      language: (language ?? 'en') as Language,
      variables: (variables as Record<string, string>) ?? {},
      metadata: metadata as Record<string, unknown> | undefined,
    });

    return NextResponse.json(
      { success: log.status === 'sent' || log.status === 'retried', log },
      { status: log.status === 'failed' ? 502 : 201 }
    );
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ─── GET /api/notifications ────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const status = searchParams.get('status') ?? undefined;
  const channel = searchParams.get('channel') ?? undefined;
  const type = searchParams.get('type') ?? undefined;

  const logs = db.findAll({
    status: status as NotificationLog['status'] | undefined,
    channel: channel as Channel | undefined,
    type: type as NotificationType | undefined,
  });

  const logsResult = await logs;
  return NextResponse.json({ total: logsResult.length, logs: logsResult });
}


