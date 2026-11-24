// Conexión a Postgres (Supabase) de este proyecto — base propia, separada
// de D:\agents. Esquema `reservas`, sin compartir nada con otro sistema.

import { Pool } from "pg";

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  options: "-c search_path=reservas,public",
});
