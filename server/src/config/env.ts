import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default('7d'),
  FRONTEND_URL: z.string().url(),
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  GOOGLE_REDIRECT_URI: z.string().url().optional(),
  GOOGLE_FRONTEND_CALLBACK_URL: z.string().url().optional(),
}).superRefine((value, context) => {
  const fields = [value.GOOGLE_CLIENT_ID, value.GOOGLE_CLIENT_SECRET, value.GOOGLE_REDIRECT_URI];
  if (fields.some(Boolean) && !fields.every(Boolean)) {
    context.addIssue({ code: 'custom', message: 'Configure all three GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI' });
  }
  for (const target of [value.GOOGLE_REDIRECT_URI, value.GOOGLE_FRONTEND_CALLBACK_URL]) {
    if (!target) continue;
    const url = new URL(target);
    if (url.username || url.password || url.search || url.hash ||
        (url.protocol !== 'https:' && !(value.NODE_ENV !== 'production' && url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))) {
      context.addIssue({ code: 'custom', message: 'Google callback URLs must use HTTPS (HTTP loopback is allowed outside production) and contain no credentials, query or fragment' });
    }
  }
  if (value.GOOGLE_REDIRECT_URI && new URL(value.GOOGLE_REDIRECT_URI).pathname !== '/auth/google/callback') {
    context.addIssue({ code: 'custom', message: 'GOOGLE_REDIRECT_URI must point to /auth/google/callback' });
  }
  if (value.GOOGLE_FRONTEND_CALLBACK_URL && new URL(value.GOOGLE_FRONTEND_CALLBACK_URL).origin !== new URL(value.FRONTEND_URL).origin) {
    context.addIssue({ code: 'custom', message: 'Google frontend callback must use the configured frontend origin' });
  }
  if (value.NODE_ENV === 'production' && value.GOOGLE_CLIENT_ID && new URL(value.FRONTEND_URL).protocol !== 'https:') {
    context.addIssue({ code: 'custom', message: 'Google OAuth requires an HTTPS frontend in production' });
  }
});

export const env = envSchema.parse(process.env);
