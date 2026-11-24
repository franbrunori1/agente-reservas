// Google Calendar vía cuenta de servicio — sin login interactivo, no vence
// como un refresh token de "installed app" (ver ARQUITECTURA.md §2). El
// email de la cuenta de servicio se comparte como editor del calendario
// real; esto solo firma el JWT y llama a la API.

import { google } from "googleapis";

function client() {
  const email = process.env.GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_CALENDAR_PRIVATE_KEY;
  if (!email || !key) throw new Error("Falta GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL / GOOGLE_CALENDAR_PRIVATE_KEY");

  const auth = new google.auth.JWT({
    email,
    // En la env var de Vercel los saltos de línea quedan como "\n" literal
    // (no un salto real) — se normalizan acá, no al guardar la variable.
    key: key.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });
  return google.calendar({ version: "v3", auth });
}

export interface ReservationEvent {
  cabana: string;
  huespedNombre: string;
  huespedContacto?: string | null;
  fechaEntrada: string; // YYYY-MM-DD
  fechaSalida: string; // YYYY-MM-DD, exclusiva (igual que Google Calendar para eventos de día completo)
}

/** Crea el evento de la reserva en el calendario compartido. Devuelve el id del evento (para poder editarlo/cancelarlo después). */
export async function createReservationEvent(reservation: ReservationEvent): Promise<string> {
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  if (!calendarId) throw new Error("Falta GOOGLE_CALENDAR_ID");

  const res = await client().events.insert({
    calendarId,
    requestBody: {
      summary: `${reservation.cabana} — ${reservation.huespedNombre}`,
      description: reservation.huespedContacto ? `Contacto: ${reservation.huespedContacto}` : undefined,
      start: { date: reservation.fechaEntrada },
      end: { date: reservation.fechaSalida },
    },
  });

  const id = res.data.id;
  if (!id) throw new Error("Google Calendar no devolvió id de evento");
  return id;
}

/** Cancela (borra) el evento de una reserva cancelada. */
export async function deleteReservationEvent(eventId: string): Promise<void> {
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  if (!calendarId) throw new Error("Falta GOOGLE_CALENDAR_ID");

  await client().events.delete({ calendarId, eventId });
}
