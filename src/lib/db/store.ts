// ============================================================
// db/store.ts - Supabase persistence layer
// ============================================================

import { createClient } from '@supabase/supabase-js';
import type { NotificationLog } from '../types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TABLE = 'notification_logs';

export const db = {
  async save(log: NotificationLog): Promise<NotificationLog> {
    const { error } = await supabase.from(TABLE).insert({
      id: log.id,
      created_at: log.createdAt,
      updated_at: log.updatedAt,
      channel: log.channel,
      type: log.type,
      language: log.language,
      to: log.to,
      subject: log.subject,
      body: log.body,
      status: log.status,
      attempts: log.attempts,
      error: log.error,
      metadata: log.metadata,
    });
    if (error) throw new Error(`Supabase save error: ${error.message}`);
    return log;
  },

  async update(id: string, patch: Partial<NotificationLog>): Promise<NotificationLog | null> {
    const { data, error } = await supabase
      .from(TABLE)
      .update({
        updated_at: new Date().toISOString(),
        ...(patch.status !== undefined && { status: patch.status }),
        ...(patch.attempts !== undefined && { attempts: patch.attempts }),
        ...(patch.error !== undefined && { error: patch.error }),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Supabase update error: ${error.message}`);
    return mapRow(data);
  },

  async findById(id: string): Promise<NotificationLog | null> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return mapRow(data);
  },

  async findAll(filters?: {
    status?: NotificationLog['status'];
    channel?: NotificationLog['channel'];
    type?: NotificationLog['type'];
  }): Promise<NotificationLog[]> {
    let query = supabase.from(TABLE).select('*').order('created_at', { ascending: false });

    if (filters?.status)  query = query.eq('status', filters.status);
    if (filters?.channel) query = query.eq('channel', filters.channel);
    if (filters?.type)    query = query.eq('type', filters.type);

    const { data, error } = await query;
    if (error) throw new Error(`Supabase findAll error: ${error.message}`);
    return (data || []).map(mapRow);
  },
};

function mapRow(row: Record<string, unknown>): NotificationLog {
  return {
    id:        row.id as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    channel:   row.channel as NotificationLog['channel'],
    type:      row.type as NotificationLog['type'],
    language:  row.language as NotificationLog['language'],
    to:        row.to as string,
    subject:   row.subject as string | undefined,
    body:      row.body as string,
    status:    row.status as NotificationLog['status'],
    attempts:  row.attempts as number,
    error:     row.error as string | undefined,
    metadata:  row.metadata as Record<string, unknown> | undefined,
  };
}