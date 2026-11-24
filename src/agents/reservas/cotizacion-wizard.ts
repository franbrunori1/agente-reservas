// Wizard de /cotizacion: una pregunta por mensaje, sin LLM — cada paso es
// un parseo determinístico fijo (ver ARQUITECTURA.md §1.1). El precio hoy
// se recibe tal cual lo contesta la persona (tarifa por noche por renglón);
// el tarifario automático es un paso futuro (ver conversación del
// 2026-11-24).

import { todayInArgentina } from "../../core/date-range.js";
import { sendDocument } from "../../core/telegram-api.js";
import { logEvent, errorContext } from "../../core/logger.js";
import { findCabanaByNombre } from "./store.js";
import { getDraft, saveDraft, deleteDraft, type CotizacionDraftData, type FilaDraft } from "./cotizacion-drafts.js";
import { generateCotizacionPdf, type FilaCotizacion } from "./tools/pdf-cotizacion.js";

const FECHA_RE = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/;
const SI_RE = /^s[ií]$/i;
const NO_RE = /^no$/i;

function parseFecha(text: string): { display: string; iso: string } | null {
  const m = text.trim().match(FECHA_RE);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  let year = Number(m[3]);
  if (year < 100) year += 2000;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const display = `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${String(year).slice(2)}`;
  return { display, iso };
}

function parseMonto(text: string): number | null {
  const digits = text.trim().replace(/[.,]/g, "").replace(/[^\d]/g, "");
  if (digits.length === 0) return null;
  const n = Number(digits);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function isoToDisplayLargo(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

function noches(checkInIso: string, checkOutIso: string): number {
  const ms = new Date(checkOutIso).getTime() - new Date(checkInIso).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export async function startCotizacion(chatId: string): Promise<string> {
  await saveDraft(chatId, "nombre", {});
  return "Arrancamos una cotización nueva.\n¿Nombre del huésped?";
}

export async function cancelCotizacion(chatId: string): Promise<string> {
  await deleteDraft(chatId);
  return "Cotización cancelada.";
}

async function finalizar(chatId: string, data: CotizacionDraftData, botToken: string): Promise<string> {
  const filas = data.filas ?? [];
  const n = noches(data.checkInIso!, data.checkOutIso!);

  const filasPdf: FilaCotizacion[] = filas.map((f) => ({
    label: f.label,
    tarifaPorNoche: f.tarifaPorNoche,
    noches: n,
    descuento: "-",
    subtotal: f.tarifaPorNoche * n,
  }));
  const total = filasPdf.reduce((acc, f) => acc + f.subtotal, 0);

  let pdf: Buffer;
  try {
    pdf = await generateCotizacionPdf({
      nombre: data.nombre!,
      fecha: isoToDisplayLargo(todayInArgentina()),
      checkIn: data.checkInDisplay!,
      checkOut: data.checkOutDisplay!,
      personas: data.personas!,
      filas: filasPdf,
      total,
      senia: Math.round(total / 2),
    });
  } catch (err) {
    await logEvent("reservas", "error", "Falló la generación del PDF de cotización", errorContext(err));
    await deleteDraft(chatId);
    return "No pude generar el PDF — algo falló. Probá de nuevo con /cotizacion.";
  }

  await sendDocument(botToken, chatId, pdf, `cotizacion-${data.nombre}.pdf`);
  await deleteDraft(chatId);
  return "Listo, ahí te mando la cotización.";
}

/** Procesa la respuesta del paso actual. Asume que ya se confirmó que hay un draft activo para este chat. */
export async function handleCotizacionAnswer(
  chatId: string,
  text: string,
  step: string,
  data: CotizacionDraftData,
  botToken: string,
): Promise<string> {
  const trimmed = text.trim();

  switch (step) {
    case "nombre": {
      if (trimmed.length === 0) return "Necesito el nombre del huésped.";
      data.nombre = trimmed;
      await saveDraft(chatId, "check_in", data);
      return "¿Check-in? (DD/MM/AA, ej. 10/12/26)";
    }

    case "check_in": {
      const fecha = parseFecha(trimmed);
      if (!fecha) return "No entendí la fecha — usá el formato DD/MM/AA (ej. 10/12/26).";
      data.checkInDisplay = fecha.display;
      data.checkInIso = fecha.iso;
      await saveDraft(chatId, "check_out", data);
      return "¿Check-out? (DD/MM/AA)";
    }

    case "check_out": {
      const fecha = parseFecha(trimmed);
      if (!fecha) return "No entendí la fecha — usá el formato DD/MM/AA (ej. 15/12/26).";
      if (fecha.iso <= data.checkInIso!) return "El check-out tiene que ser posterior al check-in.";
      data.checkOutDisplay = fecha.display;
      data.checkOutIso = fecha.iso;
      await saveDraft(chatId, "personas", data);
      return "¿Cuántas personas en total?";
    }

    case "personas": {
      const n = Number(trimmed);
      if (!Number.isInteger(n) || n <= 0) return "Decime un número de personas válido.";
      data.personas = n;
      await saveDraft(chatId, "cabana_nombre", data);
      return "¿Qué cabaña? (Cabaña 1, 2, 3 o 4)";
    }

    case "cabana_nombre": {
      let cabana = await findCabanaByNombre(trimmed);
      if (!cabana && /^\d+$/.test(trimmed)) cabana = await findCabanaByNombre(`Cabaña ${trimmed}`);
      if (!cabana) return 'No encuentro esa cabaña. Escribí, por ejemplo, "Cabaña 2".';
      data.filaEnProgreso = { label: cabana.nombre };
      await saveDraft(chatId, "cabana_tarifa", data);
      return `¿Tarifa por noche de ${cabana.nombre}?`;
    }

    case "cabana_tarifa": {
      const monto = parseMonto(trimmed);
      if (!monto) return "Decime un monto válido (ej. 215000).";
      const filas = data.filas ?? [];
      filas.push({ label: data.filaEnProgreso!.label!, tarifaPorNoche: monto });
      data.filas = filas;
      data.filaEnProgreso = undefined;
      await saveDraft(chatId, "cabana_mas", data);
      return "¿Agregás otra cabaña a esta misma cotización? (si/no)";
    }

    case "cabana_mas": {
      if (SI_RE.test(trimmed)) {
        await saveDraft(chatId, "cabana_nombre", data);
        return "¿Qué otra cabaña? (Cabaña 1, 2, 3 o 4)";
      }
      if (NO_RE.test(trimmed)) {
        await saveDraft(chatId, "adicional_si_no", data);
        return "¿Hay algún adicional (ej. por persona de más)? (si/no)";
      }
      return "Contestame si o no.";
    }

    case "adicional_si_no": {
      if (SI_RE.test(trimmed)) {
        await saveDraft(chatId, "adicional_desc", data);
        return 'Descripción del adicional (ej. "Adicional 2 pers.")';
      }
      if (NO_RE.test(trimmed)) return finalizar(chatId, data, botToken);
      return "Contestame si o no.";
    }

    case "adicional_desc": {
      if (trimmed.length === 0) return "Necesito una descripción para el adicional.";
      data.filaEnProgreso = { label: trimmed };
      await saveDraft(chatId, "adicional_precio", data);
      return "¿Precio de ese adicional (por noche)?";
    }

    case "adicional_precio": {
      const monto = parseMonto(trimmed);
      if (!monto) return "Decime un monto válido (ej. 66200).";
      const filas = data.filas ?? [];
      filas.push({ label: data.filaEnProgreso!.label!, tarifaPorNoche: monto });
      data.filas = filas;
      data.filaEnProgreso = undefined;
      await saveDraft(chatId, "adicional_mas", data);
      return "¿Otro adicional más? (si/no)";
    }

    case "adicional_mas": {
      if (SI_RE.test(trimmed)) {
        await saveDraft(chatId, "adicional_desc", data);
        return 'Descripción del adicional (ej. "Adicional 2 pers.")';
      }
      if (NO_RE.test(trimmed)) return finalizar(chatId, data, botToken);
      return "Contestame si o no.";
    }

    default:
      await deleteDraft(chatId);
      return "Algo se desordenó — arrancá de nuevo con /cotizacion.";
  }
}
