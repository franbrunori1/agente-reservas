// Comandos determinísticos, sin LLM — parseo puro, sin tocar la base ni la
// API de Calendar (eso lo hace report.ts). Formato de /reservar: multilínea,
// clave: valor, para que se pueda escribir a mano sin pelearse con comillas
// o el orden de los argumentos.

import { normalizeCommand } from "../../core/date-range.js";

export interface ReservarInput {
  cabana: string;
  fechaEntrada: string; // YYYY-MM-DD
  fechaSalida: string; // YYYY-MM-DD
  huespedNombre: string;
  huespedContacto: string | null;
}

export type ParsedReservar = { ok: true; data: ReservarInput } | { ok: false; error: string };

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** null = el texto ni siquiera es un /reservar — cae a otro comando o al orquestador. */
export function parseReservarCommand(text: string): ParsedReservar | null {
  const lines = text
    .trim()
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0 || normalizeCommand(lines[0]) !== "reservar") return null;

  const fields: Record<string, string> = {};
  for (const line of lines.slice(1)) {
    const m = line.match(/^([^:]+):\s*(.*)$/);
    if (!m) continue;
    fields[m[1].trim().toLowerCase()] = m[2].trim();
  }

  const cabana = fields["cabaña"] || fields["cabana"];
  const fechaEntrada = fields["entrada"];
  const fechaSalida = fields["salida"];
  const huespedNombre = fields["huesped"] || fields["huésped"];
  const huespedContacto = fields["contacto"] || null;

  const missing = [
    !cabana && "cabaña",
    !fechaEntrada && "entrada",
    !fechaSalida && "salida",
    !huespedNombre && "huesped",
  ].filter(Boolean);
  if (missing.length > 0) return { ok: false, error: `Falta completar: ${missing.join(", ")}.` };

  if (!DATE.test(fechaEntrada) || !DATE.test(fechaSalida)) {
    return { ok: false, error: "Las fechas van en formato AAAA-MM-DD (ej. 2026-12-10)." };
  }
  if (fechaSalida <= fechaEntrada) {
    return { ok: false, error: "La fecha de salida tiene que ser posterior a la de entrada." };
  }

  return { ok: true, data: { cabana, fechaEntrada, fechaSalida, huespedNombre, huespedContacto } };
}

export function isCabanasCommand(text: string): boolean {
  return normalizeCommand(text) === "cabanas";
}
