// Lectura manual de reservas.logs mientras no existe un agente que los lea
// solo. Uso: npm run logs -- [agente] [cantidad]
// ej: npm run logs -- reservas 20

import "dotenv/config";
import { db } from "../memory/client.js";

const [agentFilter, countArg] = process.argv.slice(2);
const limit = Number(countArg) || 30;

const { rows } = await db.query(
  agentFilter
    ? "select agent, level, message, context, created_at from reservas.logs where agent = $1 order by created_at desc limit $2"
    : "select agent, level, message, context, created_at from reservas.logs order by created_at desc limit $1",
  agentFilter ? [agentFilter, limit] : [limit],
);

for (const r of rows.reverse()) {
  const tag = r.level === "error" ? "ERROR" : r.level === "warn" ? "WARN " : "INFO ";
  console.log(`[${r.created_at.toISOString()}] ${tag} ${r.agent} — ${r.message}`);
  if (r.context && Object.keys(r.context).length > 0) {
    console.log(`  ${JSON.stringify(r.context)}`);
  }
}

if (rows.length === 0) console.log("Sin logs todavía.");
process.exit(0);
