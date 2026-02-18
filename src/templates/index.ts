import type { Language, NotificationType, Template } from '../lib/types';

type TemplateMap = Record<NotificationType, Record<Language, Record<'email' | 'sms' | 'push', Template>>>;

const templates: TemplateMap = {
  otp: {
    en: {
      email: {
        subject: 'Your verification code',
        body: `Hello,\n\nYour one-time code is: {{code}}\n\nThis code expires in {{expiry}} minutes.\nDo NOT share it with anyone.\n\nIf you did not request this, ignore this message.`,
      },
      sms: { body: 'Your code: {{code}}. Expires in {{expiry}} min. Do not share.' },
      push: { body: 'Tap to copy your code: {{code}} (expires in {{expiry}} min)' },
    },
    es: {
      email: {
        subject: 'Tu código de verificación',
        body: `Hola,\n\nTu código de un solo uso es: {{code}}\n\nEste código expira en {{expiry}} minutos.\nNO lo compartas con nadie.\n\nSi no solicitaste esto, ignora este mensaje.`,
      },
      sms: { body: 'Tu código: {{code}}. Expira en {{expiry}} min. No lo compartas.' },
      push: { body: 'Toca para copiar tu código: {{code}} (expira en {{expiry}} min)' },
    },
  },

  alert: {
    en: {
      email: {
        subject: 'Alert: {{title}}',
        body: `ALERT [{{severity}}]\n\n{{title}}\n\n{{message}}\n\nThis is an automated notification.`,
      },
      sms: { body: '[{{severity}}] {{title}}: {{message}}' },
      push: { body: '{{title}} — {{message}}' },
    },
    es: {
      email: {
        subject: 'Alerta: {{title}}',
        body: `ALERTA [{{severity}}]\n\n{{title}}\n\n{{message}}\n\nEsta es una notificación automática.`,
      },
      sms: { body: '[{{severity}}] {{title}}: {{message}}' },
      push: { body: '{{title}} — {{message}}' },
    },
  },

  marketing: {
    en: {
      email: {
        subject: '🎉 Special offer for you, {{firstName}}!',
        body: `Hi {{firstName}},\n\nWe have an exclusive deal just for you:\n{{discount}}% OFF with code {{promoCode}}\n\nDon't miss it — limited time only!\n\nTo unsubscribe reply STOP.`,
      },
      sms: { body: 'Hi {{firstName}}! {{discount}}% OFF with code {{promoCode}}. Reply STOP to unsubscribe.' },
      push: { body: '{{firstName}}, grab {{discount}}% off with {{promoCode}}! 🎉' },
    },
    es: {
      email: {
        subject: '🎉 ¡Oferta especial para ti, {{firstName}}!',
        body: `Hola {{firstName}},\n\nTenemos una oferta exclusiva para ti:\n{{discount}}% DE DESCUENTO con el código {{promoCode}}\n\n¡No te lo pierdas — solo por tiempo limitado!\n\nPara cancelar responde STOP.`,
      },
      sms: { body: '¡Hola {{firstName}}! {{discount}}% OFF con código {{promoCode}}. Responde STOP para cancelar.' },
      push: { body: '{{firstName}}, ¡{{discount}}% de descuento con {{promoCode}}! 🎉' },
    },
  },

  receipt: {
    en: {
      email: {
        subject: 'Your receipt for order #{{orderId}}',
        body: `Thank you for your purchase!\n\nOrder ID: {{orderId}}\nDate: {{date}}\n\nItems:\n{{items}}\n\nTotal: {{amount}}\n\nWe appreciate your business.`,
      },
      sms: { body: 'Receipt for order #{{orderId}}: {{amount}} on {{date}}.' },
      push: { body: 'Order #{{orderId}} confirmed. Total: {{amount}}' },
    },
    es: {
      email: {
        subject: 'Tu recibo del pedido #{{orderId}}',
        body: `¡Gracias por tu compra!\n\nID de pedido: {{orderId}}\nFecha: {{date}}\n\nArtículos:\n{{items}}\n\nTotal: {{amount}}\n\nApreciamos tu preferencia.`,
      },
      sms: { body: 'Recibo pedido #{{orderId}}: {{amount}} el {{date}}.' },
      push: { body: 'Pedido #{{orderId}} confirmado. Total: {{amount}}' },
    },
  },
};

/** Render a template by replacing {{variable}} placeholders */
export function renderTemplate(
  tpl: Template,
  variables: Record<string, string>
): Template {
  const replace = (str: string) =>
    str.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? `{{${key}}}`);
  return {
    subject: tpl.subject ? replace(tpl.subject) : undefined,
    body: replace(tpl.body),
  };
}

export function getTemplate(
  type: NotificationType,
  language: Language,
  channel: 'email' | 'sms' | 'push'
): Template {
  return templates[type][language][channel];
}