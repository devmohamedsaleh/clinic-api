import { TZDate } from '@date-fns/tz';

export function dayRange(date: string, timeZone: string) {
  const [year, month, day] = date.split('-').map(Number);

  const from = new TZDate(year, month - 1, day, timeZone);
  const to = new TZDate(year, month - 1, day + 1, timeZone);

  return { from: new Date(from.getTime()), to: new Date(to.getTime()) };
}