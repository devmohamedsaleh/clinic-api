import 'dotenv/config';

export const CLINIC_TIMEZONE = process.env.CLINIC_TIMEZONE ?? 'Africa/Cairo';

try {
  new Intl.DateTimeFormat('en-US', { timeZone: CLINIC_TIMEZONE });
} catch {
  throw new Error(`Invalid CLINIC_TIMEZONE: ${CLINIC_TIMEZONE}`);
}