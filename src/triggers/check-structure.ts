// Chequea en estático que el código respete el contrato de agente de
// ARQUITECTURA.md §3 — no corre nada, no pega a ninguna API, solo lee
// archivos. Pensado para correr rápido antes de cada commit (ver
// .githooks/pre-commit). Junta TODOS los problemas antes de fallar, no se
// para en el primero.

import { readdirSync, existsSync, readFileSync, statSync } from "fs";
import { join } from "path";

const ROOT = join(import.meta.dirname, "..", "..");
const problems: string[] = [];

function read(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

function listFiles(dir: string, ext: string): string[] {
  const full = join(ROOT, dir);
  if (!existsSync(full)) return [];
  return readdirSync(full).filter((f) => f.endsWith(ext));
}

// --- Cada carpeta en src/agents/* tiene lo que el contrato pide ---

const agentsDir = join(ROOT, "src", "agents");
const agentNames = existsSync(agentsDir)
  ? readdirSync(agentsDir).filter((f) => statSync(join(agentsDir, f)).isDirectory())
  : [];

if (agentNames.length === 0) problems.push("src/agents/ no tiene ningún agente — ¿se corrió desde el lugar correcto?");

const statusContent = existsSync(join(ROOT, "src", "triggers", "status.ts"))
  ? read("src/triggers/status.ts")
  : "";

for (const name of agentNames) {
  const base = `src/agents/${name}`;

  if (!existsSync(join(ROOT, base, "orchestrator.ts"))) {
    problems.push(`${base}/orchestrator.ts no existe — todo agente necesita su cerebro propio (ARQUITECTURA.md §3)`);
  } else if (!/export\s+(async\s+)?function\s+askOrchestrator/.test(read(`${base}/orchestrator.ts`))) {
    problems.push(`${base}/orchestrator.ts no expone askOrchestrator(chatId, message, replyToText) — contrato roto`);
  }

  if (!existsSync(join(ROOT, base, "health.ts"))) {
    problems.push(`${base}/health.ts no existe — todo agente expone su AgentHealth (ARQUITECTURA.md §3)`);
  } else if (!statusContent.includes(`agents/${name}/health.js`)) {
    problems.push(`${base}/health.ts existe pero triggers/status.ts no lo importa — el estado real no lo va a ver`);
  }

  // decisions.ts/rules.ts/evaluator.ts son memoria episódica/semántica con
  // métrica externa medible — van juntas o no van, no tiene sentido una sola.
  const episodic = ["decisions.ts", "rules.ts", "evaluator.ts"].map((f) => existsSync(join(ROOT, base, f)));
  if (episodic.some(Boolean) && !episodic.every(Boolean)) {
    problems.push(`${base}: tiene solo algunos de decisions.ts/rules.ts/evaluator.ts — van juntos (§1.1) o ninguno`);
  }

  // Endpoint propio en api/ — el nombre de archivo no siempre matchea el
  // nombre de carpeta (ej. marketing-ads -> marketing-webhook.js, ya
  // documentado en CLAUDE.md), lo que importa es que exista UN webhook
  // dedicado que importe de este agente, no uno genérico compartido.
  const ownWebhook = listFiles("api", ".js").some((f) => read(`api/${f}`).includes(`agents/${name}/`));
  if (!ownWebhook) {
    problems.push(`ningún archivo en api/ importa de src/agents/${name}/ — falta su endpoint propio (§3)`);
  }
}

// --- core/ y channels/ son genéricos: no pueden depender de un agente puntual ---

for (const dir of ["src/core", "src/channels"]) {
  for (const file of listFiles(dir, ".ts")) {
    const content = read(`${dir}/${file}`);
    if (/from\s+["'].*\/agents\//.test(content)) {
      problems.push(`${dir}/${file} importa algo de src/agents/ — rompe la regla de "genérico, sin saber qué agente lo usa" (§3)`);
    }
  }
}

// --- memory/client.ts es el único punto de conexión a Postgres ---

const tsFiles: string[] = [];
function walk(dir: string): void {
  for (const entry of readdirSync(join(ROOT, dir))) {
    const rel = `${dir}/${entry}`;
    if (statSync(join(ROOT, rel)).isDirectory()) walk(rel);
    else if (entry.endsWith(".ts")) tsFiles.push(rel);
  }
}
walk("src");

for (const file of tsFiles) {
  if (file === "src/memory/client.ts") continue;
  if (/new\s+Pool\s*\(/.test(read(file))) {
    problems.push(`${file} crea su propia conexión a Postgres (new Pool) — tiene que usar el pool de src/memory/client.ts (§4)`);
  }
}

if (problems.length > 0) {
  console.error(`\nEstructura de agentes rota (${problems.length}):\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error("");
  process.exit(1);
}

console.log(`Estructura OK — ${agentNames.length} agente(s) revisados.`);
