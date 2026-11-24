// Log genérico y uniforme — cualquier agente (y core/telegram-webhook.ts,
// el cuello de botella compartido) escribe acá, nunca a su propia tabla.
// Es la base para que un futuro agente de monitoreo pueda leer "qué pasó"
// de todos a la vez, sin tener que entender el formato de cada uno.
//
// Nunca tira: si falla el log en sí (ej. la base caída justo en ese
// momento), se degrada a console.error — perder un log no puede tumbar lo
// que se estaba procesando, pero tampoco puede desaparecer en silencio del
// todo mientras Vercel todavía tenga los últimos 30 minutos.

import { db } from "../memory/client.js";

export type LogLevel = "info" | "warn" | "error";

/** Error de JS -> contexto serializable — un solo lugar para no repetir esto en cada catch. */
export function errorContext(err: unknown): Record<string, unknown> {
  return err instanceof Error ? { error: err.message, stack: err.stack } : { error: String(err) };
}

export async function logEvent(
  agent: string,
  level: LogLevel,
  message: string,
  context: Record<string, unknown> = {},
): Promise<void> {
  try {
    await db.query("insert into reservas.logs (agent, level, message, context) values ($1, $2, $3, $4)", [
      agent,
      level,
      message,
      JSON.stringify(context),
    ]);
  } catch (err) {
    console.error(`[logger] no se pudo escribir el log (${agent}/${level}): ${message}`, context, err);
  }
}
