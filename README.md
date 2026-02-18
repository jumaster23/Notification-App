# NotifyHub — Sistema de Notificaciones Multicanal

API REST para envío de notificaciones por Email, SMS y Push con soporte bilingüe (ES/EN), reintentos automáticos y persistencia en Supabase.

---

## Stack

- **Next.js 14** App Router
- **TypeScript**
- **Resend** — email real
- **Supabase** — base de datos PostgreSQL
- **Twilio** — SMS (opcional)

---

## Instalación

```bash
npm install
cp .env.example .env.local
npm run dev
```

---

## Variables de entorno

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxxx
RESEND_API_KEY=re_xxxx
EMAIL_FROM=onboarding@resend.dev
TWILIO_SID=ACxxxx
TWILIO_TOKEN=xxxx
TWILIO_FROM=+15551234567
```

---

## Base de datos

Ejecutar en Supabase → SQL Editor:

```sql
create table notification_logs (
  id uuid primary key,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  channel text not null,
  type text not null,
  language text not null,
  "to" text not null,
  subject text,
  body text not null,
  status text not null,
  attempts int not null default 0,
  error text,
  metadata jsonb
);
```

---

## API

### POST `/api/notifications`

Enviar una notificación.

```json
{
  "to": "user@example.com",
  "channel": "email",
  "type": "otp",
  "language": "es",
  "variables": {
    "code": "482910",
    "expiry": "10"
  }
}
```

| Campo | Tipo | Requerido | Valores |
|-------|------|-----------|---------|
| `to` | string | ✅ | email / teléfono / device token |
| `channel` | string | ✅ | `email` `sms` `push` |
| `type` | string | ✅ | `otp` `alert` `marketing` `receipt` |
| `language` | string | ❌ | `en` `es` (default: `en`) |
| `variables` | object | ❌ | variables de la plantilla |

### GET `/api/notifications`

```text
GET /api/notifications
GET /api/notifications?status=failed
GET /api/notifications?channel=email
GET /api/notifications?type=otp
```

### GET `/api/notifications/:id`

```text
GET /api/notifications/uuid
```

---

## Plantillas

| Tipo | Variables |
|------|-----------|
| `otp` | `{{code}}`, `{{expiry}}` |
| `alert` | `{{title}}`, `{{message}}`, `{{severity}}` |
| `marketing` | `{{firstName}}`, `{{promoCode}}`, `{{discount}}` |
| `receipt` | `{{orderId}}`, `{{amount}}`, `{{date}}`, `{{items}}` |

---

## Estados de envío

| Estado | Descripción |
|--------|-------------|
| `pending` | Creado, pendiente de envío |
| `sent` | Enviado exitosamente |
| `retried` | Reintentando (intento 2 o 3) |
| `failed` | Falló los 3 intentos |

---

## Despliegue

```bash
npx vercel --prod
```

Agregar las variables de entorno en Vercel Dashboard → Settings → Environment Variables.