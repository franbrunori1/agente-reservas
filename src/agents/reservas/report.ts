import { escapeHtml } from "../../core/html.js";
import { logEvent, errorContext } from "../../core/logger.js";
import { createReservationEvent } from "./tools/calendar.js";
import { findCabanaByNombre, insertReserva, listCabanas } from "./store.js";
import type { ReservarInput } from "./commands.js";

// Las 4 cabañas son fijas (ver schema.sql) — no hay comando para agregar
// o quitar, a propósito.
export async function buildCabanasReport(): Promise<string> {
  const cabanas = await listCabanas();
  const lista = cabanas.map((c) => `• ${escapeHtml(c.nombre)}`).join("\n");
  return `<b>Cabañas</b>\n${lista}`;
}

export async function handleReservar(chatId: string, input: ReservarInput): Promise<string> {
  const cabana = await findCabanaByNombre(input.cabana);
  if (!cabana) {
    return `No encuentro la cabaña "${escapeHtml(input.cabana)}". Mirá <b>/cabanas</b> para ver los nombres exactos.`;
  }

  let eventId: string;
  try {
    eventId = await createReservationEvent({
      cabana: cabana.nombre,
      huespedNombre: input.huespedNombre,
      huespedContacto: input.huespedContacto,
      fechaEntrada: input.fechaEntrada,
      fechaSalida: input.fechaSalida,
    });
  } catch (err) {
    await logEvent("reservas", "error", "Falló la creación del evento en Google Calendar", errorContext(err));
    return "No pude anotarlo en el calendario — algo falló del lado de Google. Probá de nuevo en un rato.";
  }

  await insertReserva({
    cabanaId: cabana.id,
    huespedNombre: input.huespedNombre,
    huespedContacto: input.huespedContacto,
    fechaEntrada: input.fechaEntrada,
    fechaSalida: input.fechaSalida,
    googleEventId: eventId,
    chatId,
  });

  return (
    `Reserva anotada en el calendario.\n` +
    `<b>${escapeHtml(cabana.nombre)}</b> — ${escapeHtml(input.huespedNombre)}\n` +
    `${input.fechaEntrada} a ${input.fechaSalida}`
  );
}
