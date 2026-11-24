// Estado del wizard de /cotizacion en curso — una fila por chat, se
// sobreescribe en cada paso. No hay historial acá a propósito (ver
// schema.sql); el PDF generado es el registro real.

import { db } from "../../memory/client.js";

export interface FilaDraft {
  label: string;
  tarifaPorNoche: number;
}

export interface CotizacionDraftData {
  nombre?: string;
  checkInDisplay?: string; // DD/MM/AA
  checkInIso?: string; // AAAA-MM-DD, para calcular noches
  checkOutDisplay?: string;
  checkOutIso?: string;
  personas?: number;
  filas?: FilaDraft[];
  filaEnProgreso?: Partial<FilaDraft>;
}

export interface CotizacionDraft {
  step: string;
  data: CotizacionDraftData;
}

export async function getDraft(chatId: string): Promise<CotizacionDraft | null> {
  const { rows } = await db.query("select step, data from reservas.cotizacion_drafts where chat_id = $1", [chatId]);
  return rows[0] ?? null;
}

export async function saveDraft(chatId: string, step: string, data: CotizacionDraftData): Promise<void> {
  await db.query(
    `insert into reservas.cotizacion_drafts (chat_id, step, data, updated_at)
     values ($1, $2, $3, now())
     on conflict (chat_id) do update set step = excluded.step, data = excluded.data, updated_at = now()`,
    [chatId, step, JSON.stringify(data)],
  );
}

export async function deleteDraft(chatId: string): Promise<void> {
  await db.query("delete from reservas.cotizacion_drafts where chat_id = $1", [chatId]);
}
