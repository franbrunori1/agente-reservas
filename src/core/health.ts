// Contrato de salud que cada agente implementa — fuente de verdad del estado
// real, para no repetir "estado actual" a mano en CLAUDE.md. Correr con
// `npm run status`.

export interface HealthCheck {
  item: string;
  ok: boolean;
  detail?: string;
}

export interface AgentHealth {
  name: string;
  check(): Promise<HealthCheck[]>;
}

export async function runHealthChecks(agents: AgentHealth[]): Promise<boolean> {
  let allOk = true;
  for (const agent of agents) {
    console.log(`\n${agent.name}`);
    for (const { item, ok, detail } of await agent.check()) {
      allOk &&= ok;
      console.log(`  [${ok ? "OK" : "FALLA"}] ${item}${detail ? ` — ${detail}` : ""}`);
    }
  }
  return allOk;
}
