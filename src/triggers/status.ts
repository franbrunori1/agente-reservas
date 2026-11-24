import "dotenv/config";
import { runHealthChecks } from "../core/health.js";
import { reservasHealth } from "../agents/reservas/health.js";

// Cada agente nuevo se suma a esta lista — es el único lugar que la
// plataforma necesita tocar para que su estado real entre en `npm run status`.
const agents = [reservasHealth];

const ok = await runHealthChecks(agents);
process.exit(ok ? 0 : 1);
