// Acceso a la base — solo esto toca reservas.cabanas/reservas.reservas.
// Las cabañas son fijas (4, cargadas en schema.sql), por eso no hay insert
// acá — solo lectura.

import { db } from "../../memory/client.js";

export interface Cabana {
  id: string;
  nombre: string;
}

export async function listCabanas(): Promise<Cabana[]> {
  const { rows } = await db.query("select id, nombre from reservas.cabanas order by nombre");
  return rows;
}

export async function findCabanaByNombre(nombre: string): Promise<Cabana | null> {
  const { rows } = await db.query("select id, nombre from reservas.cabanas where lower(nombre) = lower($1)", [nombre]);
  return rows[0] ?? null;
}

export interface NuevaReserva {
  cabanaId: string;
  huespedNombre: string;
  huespedContacto: string | null;
  fechaEntrada: string;
  fechaSalida: string;
  googleEventId: string;
  chatId: string;
}

export async function insertReserva(r: NuevaReserva): Promise<string> {
  const { rows } = await db.query(
    `insert into reservas.reservas
       (cabana_id, huesped_nombre, huesped_contacto, fecha_entrada, fecha_salida, google_event_id, chat_id)
     values ($1, $2, $3, $4, $5, $6, $7)
     returning id`,
    [r.cabanaId, r.huespedNombre, r.huespedContacto, r.fechaEntrada, r.fechaSalida, r.googleEventId, r.chatId],
  );
  return rows[0].id;
}
