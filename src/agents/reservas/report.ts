import { escapeHtml } from "../../core/html.js";
import { logEvent, errorContext } from "../../core/logger.js";
import { createReservationEvent } from "./tools/calendar.js";
import { addCabana, findCabanaByNombre, insertReserva, listCabanas } from "./store.js";
import type { ReservarInput } from "./commands.js";

export async function buildCabanasReport(): Promise<string> {
  const cabanas = await listCabanas();
  if (cabanas.length === 0) {
    return "Todavía no hay ninguna cabaña — agregá una con <b>/agregar_cabana &lt;nombre&gt;</b>.";
  }
  const lista = cabanas.map((c) => `• ${escapeHtml(c.nombre)}`).join("\n");
  return `<b>Cabañas</b>\n${lista}`;
}

export async function handleAgregarCabana(nombre: string): Promise<string> {
  const creada = await addCabana(nombre);
  if (!creada) return `Ya existe una cabaña llamada "${escapeHtml(nombre)}".`;
  return `Cabaña agregada: <b>${escapeHtml(creada.nombre)}</b>.`;
}

export async function handleReservar(chatId: string, input: ReservarInput): Promise<string> {
  const cabana = await findCabanaByNombre(input.cabana);
  if (!cabana) {
    return (
      `No encuentro la cabaña "${escapeHtml(input.cabana)}". Mirá <b>/cabanas</b> para ver los nombres exactos, ` +
      `o agregala con <b>/agregar_cabana ${escapeHtml(input.cabana)}</b>.`
    );
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
