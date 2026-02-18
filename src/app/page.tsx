'use client';

import { useState, useEffect, useCallback } from 'react';

type Channel = 'email' | 'sms' | 'push';
type NotifType = 'otp' | 'alert' | 'marketing' | 'receipt';
type Language = 'en' | 'es';
type Status = 'pending' | 'sent' | 'failed' | 'retried';

interface NotificationLog {
  id: string;
  createdAt: string;
  channel: Channel;
  type: NotifType;
  language: Language;
  to: string;
  subject?: string;
  body: string;
  status: Status;
  attempts: number;
  error?: string;
}

const FIELDS: Record<NotifType, string[]> = {
  otp: ['code', 'expiry'],
  alert: ['title', 'message', 'severity'],
  marketing: ['firstName', 'promoCode', 'discount'],
  receipt: ['orderId', 'amount', 'date', 'items'],
};

const PLACEHOLDERS: Record<string, string> = {
  code: '482910', expiry: '10', title: 'Servidor caído',
  message: 'La base de datos no responde', severity: 'CRITICAL',
  firstName: 'Jesus', promoCode: 'VERANO25', discount: '25',
  orderId: 'ORD-9921', amount: '$149.99', date: '2026-02-18',
  items: '2x Widget Pro, 1x Gadget Mini',
};

const STATUS_STYLE: Record<Status, string> = {
  sent: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  failed: 'bg-red-100 text-red-700 border border-red-200',
  pending: 'bg-amber-100 text-amber-700 border border-amber-200',
  retried: 'bg-violet-100 text-violet-700 border border-violet-200',
};

const STATUS_DOT: Record<Status, string> = {
  sent: 'bg-emerald-500',
  failed: 'bg-red-500',
  pending: 'bg-amber-500',
  retried: 'bg-violet-500',
};

const CHANNEL_ICON: Record<Channel, string> = { email: '✉', sms: '💬', push: '🔔' };
const TYPE_ICON: Record<NotifType, string> = { otp: '🔐', alert: '⚠️', marketing: '📣', receipt: '🧾' };

function buildPreview(type: NotifType, lang: Language, channel: Channel, vars: Record<string, string>) {
  const replace = (s: string) => s.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] || `{{${k}}}`);
  const templates: Record<NotifType, Record<Language, Record<Channel, { subject?: string; body: string }>>> = {
    otp: {
      en: {
        email: { subject: 'Your verification code', body: 'Hello,\n\nYour one-time code is: {{code}}\n\nThis code expires in {{expiry}} minutes.\nDo NOT share it with anyone.' },
        sms: { body: 'Your code: {{code}}. Expires in {{expiry}} min. Do not share.' },
        push: { body: 'Tap to copy your code: {{code}} (expires in {{expiry}} min)' },
      },
      es: {
        email: { subject: 'Tu código de verificación', body: 'Hola,\n\nTu código de un solo uso es: {{code}}\n\nEste código expira en {{expiry}} minutos.\nNO lo compartas con nadie.' },
        sms: { body: 'Tu código: {{code}}. Expira en {{expiry}} min. No lo compartas.' },
        push: { body: 'Toca para copiar tu código: {{code}} (expira en {{expiry}} min)' },
      },
    },
    alert: {
      en: {
        email: { subject: 'Alert: {{title}}', body: 'ALERT [{{severity}}]\n\n{{title}}\n\n{{message}}' },
        sms: { body: '[{{severity}}] {{title}}: {{message}}' },
        push: { body: '{{title}} — {{message}}' },
      },
      es: {
        email: { subject: 'Alerta: {{title}}', body: 'ALERTA [{{severity}}]\n\n{{title}}\n\n{{message}}' },
        sms: { body: '[{{severity}}] {{title}}: {{message}}' },
        push: { body: '{{title}} — {{message}}' },
      },
    },
    marketing: {
      en: {
        email: { subject: '🎉 Special offer for you, {{firstName}}!', body: 'Hi {{firstName}},\n\nWe have an exclusive deal:\n{{discount}}% OFF with code {{promoCode}}' },
        sms: { body: 'Hi {{firstName}}! {{discount}}% OFF with code {{promoCode}}. Reply STOP to unsubscribe.' },
        push: { body: '{{firstName}}, grab {{discount}}% off with {{promoCode}}! 🎉' },
      },
      es: {
        email: { subject: '🎉 ¡Oferta especial para ti, {{firstName}}!', body: 'Hola {{firstName}},\n\n{{discount}}% DE DESCUENTO con el código {{promoCode}}' },
        sms: { body: '¡Hola {{firstName}}! {{discount}}% OFF con código {{promoCode}}.' },
        push: { body: '{{firstName}}, ¡{{discount}}% de descuento con {{promoCode}}! 🎉' },
      },
    },
    receipt: {
      en: {
        email: { subject: 'Your receipt for order #{{orderId}}', body: 'Thank you for your purchase!\n\nOrder ID: {{orderId}}\nDate: {{date}}\nItems: {{items}}\n\nTotal: {{amount}}' },
        sms: { body: 'Receipt for order #{{orderId}}: {{amount}} on {{date}}.' },
        push: { body: 'Order #{{orderId}} confirmed. Total: {{amount}}' },
      },
      es: {
        email: { subject: 'Tu recibo del pedido #{{orderId}}', body: '¡Gracias por tu compra!\n\nID: {{orderId}}\nFecha: {{date}}\nArtículos: {{items}}\n\nTotal: {{amount}}' },
        sms: { body: 'Recibo pedido #{{orderId}}: {{amount}} el {{date}}.' },
        push: { body: 'Pedido #{{orderId}} confirmado. Total: {{amount}}' },
      },
    },
  };
  const tpl = templates[type][lang][channel];
  return { subject: tpl.subject ? replace(tpl.subject) : undefined, body: replace(tpl.body) };
}

export default function Home() {
  const [tab, setTab] = useState<'send' | 'logs'>('send');
  const [to, setTo] = useState('');
  const [channel, setChannel] = useState<Channel>('email');
  const [type, setType] = useState<NotifType>('otp');
  const [lang, setLang] = useState<Language>('es');
  const [vars, setVars] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<NotificationLog | null>(null);
  const [resultError, setResultError] = useState<string | null>(null);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [filterStatus, setFilterStatus] = useState<Status | ''>('');
  const [filterChannel, setFilterChannel] = useState<Channel | ''>('');
  const [selectedLog, setSelectedLog] = useState<NotificationLog | null>(null);

  const stats = {
    total: logs.length,
    sent: logs.filter(l => l.status === 'sent').length,
    failed: logs.filter(l => l.status === 'failed').length,
    retried: logs.filter(l => l.status === 'retried').length,
  };

  const preview = buildPreview(type, lang, channel, vars);

  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      if (filterChannel) params.set('channel', filterChannel);
      const res = await fetch(`/api/notifications?${params}`);
      const data = await res.json();
      setLogs(data.logs || []);
    } catch { setLogs([]); }
    finally { setLoadingLogs(false); }
  }, [filterStatus, filterChannel]);

  useEffect(() => { if (tab === 'logs') fetchLogs(); }, [tab, fetchLogs]);

  const handleSend = async () => {
    if (!to) return;
    setSending(true); setResult(null); setResultError(null);
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, channel, type, language: lang, variables: vars }),
      });
      const data = await res.json();
      setResult(data.log);
    } catch (e) { setResultError(String(e)); }
    finally { setSending(false); }
  };

  const updateVar = (key: string, value: string) => setVars(prev => ({ ...prev, [key]: value }));

  const inputCls =
    'w-full bg-white border border-zinc-300 rounded-xl text-zinc-900 text-[15px] px-4 py-3 outline-none transition-all placeholder:text-zinc-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 shadow-sm';
  const toggleBase =
    'border rounded-xl text-sm font-medium py-2.5 px-4 cursor-pointer transition-all text-center select-none';
  const toggleOff =
    'bg-zinc-100 border-zinc-300 text-zinc-600 hover:border-zinc-400 hover:bg-zinc-200 hover:text-zinc-900';
  const toggleOn =
    'bg-indigo-100 border-indigo-400 text-indigo-700 ring-1 ring-indigo-500/30';

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans">
      <div
        className="fixed inset-0 pointer-events-none opacity-80"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99,102,241,0.08), transparent), linear-gradient(rgba(0,0,0,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.02) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-10 sm:px-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-8 pb-6 border-b border-zinc-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-xl shadow-lg shadow-indigo-500/25">
              📡
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-900">NotifyHub</h1>
              <p className="text-sm text-zinc-500 mt-0.5">Email · SMS · Push · ES/EN · Retry</p>
            </div>
          </div>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total sent', value: stats.total, color: 'text-zinc-900', bg: 'bg-white border-zinc-200' },
            { label: 'Successful', value: stats.sent, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
            { label: 'Failed', value: stats.failed, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
            { label: 'Retried', value: stats.retried, color: 'text-violet-600', bg: 'bg-violet-50 border-violet-200' },
          ].map((s) => (
            <div
              key={s.label}
              className={`rounded-2xl border p-5 transition-colors hover:shadow-sm ${s.bg}`}
            >
              <div className="text-xs font-medium text-zinc-500 mb-1">{s.label}</div>
              <div className={`text-2xl sm:text-3xl font-bold tracking-tight ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1.5 bg-white border border-zinc-200 rounded-2xl w-fit mb-8 shadow-sm">
          {(['send', 'logs'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                tab === t
                  ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/25'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              {t === 'send' ? 'Send notification' : 'Delivery history'}
            </button>
          ))}
        </div>

        {/* SEND TAB */}
        {tab === 'send' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-zinc-200 rounded-2xl p-6 sm:p-8 shadow-sm">
              <h2 className="text-base font-semibold text-zinc-800 mb-6">Configure your notification</h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-zinc-600 mb-2">Recipient</label>
                  <input
                    className={inputCls}
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    placeholder="Email, phone number, or device token"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-600 mb-2">Channel</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['email', 'sms', 'push'] as Channel[]).map((c) => (
                      <button
                        key={c}
                        onClick={() => setChannel(c)}
                        className={`${toggleBase} ${channel === c ? toggleOn : toggleOff}`}
                      >
                        {CHANNEL_ICON[c]} {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-600 mb-2">Notification type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['otp', 'alert', 'marketing', 'receipt'] as NotifType[]).map((t) => (
                      <button
                        key={t}
                        onClick={() => setType(t)}
                        className={`${toggleBase} ${type === t ? toggleOn : toggleOff}`}
                      >
                        {TYPE_ICON[t]} {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-600 mb-2">Language</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['es', 'en'] as Language[]).map((l) => (
                      <button
                        key={l}
                        onClick={() => setLang(l)}
                        className={`${toggleBase} ${lang === l ? toggleOn : toggleOff}`}
                      >
                        {l === 'es' ? '🇪🇸 Español' : '🇺🇸 English'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-600 mb-2">Template variables</label>
                  <p className="text-xs text-zinc-500 mb-3">Fill in the placeholders used in your message.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {FIELDS[type].map((key) => (
                      <div key={key}>
                        <label className="block text-xs text-zinc-500 mb-1.5 font-mono">{`{{${key}}}`}</label>
                        <input
                          className={inputCls}
                          value={vars[key] || ''}
                          onChange={(e) => updateVar(key, e.target.value)}
                          placeholder={PLACEHOLDERS[key] || key}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={handleSend}
                disabled={sending || !to}
                className="mt-6 w-full bg-linear-to-r from-indigo-500 to-violet-500 text-white font-semibold text-[15px] py-3.5 rounded-xl cursor-pointer hover:from-indigo-400 hover:to-violet-400 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-indigo-500 disabled:hover:to-violet-500 shadow-lg shadow-indigo-500/20"
              >
                {sending ? 'Sending…' : 'Send notification'}
              </button>
              {!to && (
                <p className="mt-2 text-xs text-zinc-500">Enter a recipient to enable sending.</p>
              )}

              {result && (
                <div
                  className={`mt-5 rounded-xl p-4 text-sm border ${
                    result.status === 'sent'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}
                >
                  <div className="font-medium mb-2">
                    {result.status === 'sent' ? '✓ Sent successfully' : 'Delivery failed'}
                  </div>
                  <div className="space-y-1 text-xs text-zinc-600">
                    <div className="flex justify-between gap-4">
                      <span>Attempts</span>
                      <span>{result.attempts}</span>
                    </div>
                    <div className="flex justify-between gap-4 truncate">
                      <span>ID</span>
                      <span className="truncate">{result.id}</span>
                    </div>
                    {result.error && (
                      <div className="pt-1 text-red-600">{result.error}</div>
                    )}
                  </div>
                </div>
              )}
              {resultError && (
                <div className="mt-5 rounded-xl p-4 text-sm bg-red-50 border border-red-200 text-red-800">
                  {resultError}
                </div>
              )}
            </div>

            {/* Preview */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-6 sm:p-8 shadow-sm">
              <h2 className="text-base font-semibold text-zinc-800 mb-5">Message preview</h2>
              <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-4 mb-5">
                {channel === 'email' && preview.subject && (
                  <div className="text-xs text-zinc-500 mb-2">
                    Subject: <span className="text-indigo-600 font-medium">{preview.subject}</span>
                  </div>
                )}
                <pre className="font-mono text-sm leading-relaxed text-zinc-700 whitespace-pre-wrap wrap-break-word min-h-24">
                  {preview.body || 'Fill in the variables to see the preview.'}
                </pre>
              </div>
              <details className="group">
                <summary className="text-sm font-medium text-zinc-500 cursor-pointer hover:text-zinc-700 list-none [&::-webkit-details-marker]:hidden">
                  Payload (JSON)
                </summary>
                <pre className="mt-3 bg-zinc-100 border border-zinc-200 rounded-lg p-4 font-mono text-xs leading-relaxed text-zinc-600 whitespace-pre-wrap wrap-break-word">
                  {JSON.stringify(
                    { to: to || '…', channel, type, language: lang, variables: vars },
                    null,
                    2
                  )}
                </pre>
              </details>
            </div>
          </div>
        )}

        {/* LOGS TAB */}
        {tab === 'logs' && (
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h2 className="text-base font-semibold text-zinc-800">Delivery history</h2>
              <div className="flex flex-wrap gap-2">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as Status | '')}
                  className="bg-white border border-zinc-300 rounded-xl text-zinc-700 text-sm px-4 py-2.5 outline-none cursor-pointer focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 shadow-sm"
                >
                  <option value="">All statuses</option>
                  <option value="sent">Sent</option>
                  <option value="failed">Failed</option>
                  <option value="retried">Retried</option>
                  <option value="pending">Pending</option>
                </select>
                <select
                  value={filterChannel}
                  onChange={(e) => setFilterChannel(e.target.value as Channel | '')}
                  className="bg-white border border-zinc-300 rounded-xl text-zinc-700 text-sm px-4 py-2.5 outline-none cursor-pointer focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 shadow-sm"
                >
                  <option value="">All channels</option>
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="push">Push</option>
                </select>
                <button
                  onClick={fetchLogs}
                  className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-700 cursor-pointer hover:bg-zinc-50 transition-colors shadow-sm"
                  title="Refresh"
                >
                  Refresh
                </button>
              </div>
            </div>

            {loadingLogs ? (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
                <div className="w-10 h-10 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin mb-4" />
                <p className="text-sm">Loading deliveries…</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 rounded-2xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-3xl mx-auto mb-4">📭</div>
                <p className="text-zinc-700 font-medium">No notifications yet</p>
                <p className="text-sm text-zinc-500 mt-1">Send one from the “Send notification” tab to see it here.</p>
              </div>
            ) : (
              <div className="rounded-xl border border-zinc-200 overflow-hidden">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-zinc-50">
                      {['Status', 'Channel', 'Type', 'Recipient', 'Attempts', 'Time'].map((h) => (
                        <th key={h} className="text-left text-xs font-medium text-zinc-500 py-3.5 px-4">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr
                        key={log.id}
                        onClick={() => setSelectedLog(log)}
                        className="border-t border-zinc-100 cursor-pointer hover:bg-zinc-50 transition-colors"
                      >
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${STATUS_STYLE[log.status]}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[log.status]}`} />
                            {log.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-zinc-600 text-sm">
                          {CHANNEL_ICON[log.channel]} {log.channel}
                        </td>
                        <td className="px-4 py-3.5 text-zinc-600 text-sm">
                          {TYPE_ICON[log.type]} {log.type}
                        </td>
                        <td className="px-4 py-3.5 text-zinc-600 text-sm max-w-44 truncate">{log.to}</td>
                        <td
                          className={`px-4 py-3.5 text-sm text-center ${
                            log.attempts >= 3 ? 'text-red-600' : 'text-zinc-500'
                          }`}
                        >
                          {log.attempts}
                        </td>
                        <td className="px-4 py-3.5 text-zinc-500 text-sm">
                          {new Date(log.createdAt).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedLog && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="bg-white border border-zinc-200 rounded-2xl p-6 sm:p-8 w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h3 className="font-semibold text-zinc-900">
                  {TYPE_ICON[selectedLog.type]} {selectedLog.type} · {CHANNEL_ICON[selectedLog.channel]}{' '}
                  {selectedLog.channel}
                </h3>
                <p className="text-xs text-zinc-500 mt-1 font-mono truncate max-w-[240px]">{selectedLog.id}</p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="shrink-0 w-9 h-9 rounded-xl bg-zinc-100 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200 flex items-center justify-center text-lg leading-none cursor-pointer transition-colors"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="space-y-0 divide-y divide-zinc-200">
              {[
                { k: 'Status', v: selectedLog.status },
                { k: 'Recipient', v: selectedLog.to },
                { k: 'Language', v: selectedLog.language },
                { k: 'Attempts', v: String(selectedLog.attempts) },
                { k: 'Created', v: new Date(selectedLog.createdAt).toLocaleString() },
                ...(selectedLog.subject ? [{ k: 'Subject', v: selectedLog.subject }] : []),
                { k: 'Body', v: selectedLog.body },
                ...(selectedLog.error ? [{ k: 'Error', v: selectedLog.error }] : []),
              ].map(({ k, v }) => (
                <div key={k} className="flex gap-4 py-3.5 items-start">
                  <div className="text-zinc-500 text-sm font-medium min-w-24 shrink-0">{k}</div>
                  <div className="text-zinc-700 text-sm wrap-break-word whitespace-pre-wrap flex-1">{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}