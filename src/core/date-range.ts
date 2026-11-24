// Comandos de período, deterministicos — sin LLM, gratis e instantáneo.
// Compartido: cualquier agente que necesite "hoy/ayer/semana/mes/rango" usa
// esto, no lo reescribe.

export interface DateRange {
  dateFrom: string;
  dateTo: string;
  label: string;
}

function fmtArgentina(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(d);
}

export function todayInArgentina(): string {
  return fmtArgentina(new Date());
}

export function daysAgoInArgentina(n: number): string {
  return fmtArgentina(new Date(Date.now() - n * 24 * 60 * 60 * 1000));
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const RANGE = /^(\d{4}-\d{2}-\d{2})\s+(\d{4}-\d{2}-\d{2})$/;

// Pela "/" y "@nombre_del_bot" de los comandos que vienen del menú de Telegram
// (ej. "/semana", "/rango@mi_bot 2026-11-01 2026-11-15") para que funcionen
// igual que si se escriben a mano. La usa cualquier comando determinístico.
export function normalizeCommand(text: string): string {
  let t = text.trim();
  const slashCmd = t.match(/^\/(\S+)/);
  if (slashCmd) t = slashCmd[1].split("@")[0] + t.slice(slashCmd[0].length);
  return t.toLowerCase().trim();
}

export function parseDateRangeCommand(text: string): DateRange | null {
  let t = normalizeCommand(text);
  if (t.startsWith("rango")) t = t.slice("rango".length).trim();

  const range = t.match(RANGE);
  if (range) return { dateFrom: range[1], dateTo: range[2], label: `${range[1]} a ${range[2]}` };

  if (DATE.test(t)) return { dateFrom: t, dateTo: t, label: t };

  if (t === "" || t === "hoy") {
    const today = todayInArgentina();
    return { dateFrom: today, dateTo: today, label: `${today}, parcial` };
  }
  if (t === "ayer") {
    const d = daysAgoInArgentina(1);
    return { dateFrom: d, dateTo: d, label: d };
  }
  if (t === "semana") {
    return { dateFrom: daysAgoInArgentina(6), dateTo: todayInArgentina(), label: "últimos 7 días" };
  }
  if (t === "mes") {
    return { dateFrom: daysAgoInArgentina(29), dateTo: todayInArgentina(), label: "últimos 30 días" };
  }

  return null;
}
