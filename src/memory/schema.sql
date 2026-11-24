-- Aplicar a mano contra la base real (Supabase propio de este proyecto) y
-- mantener este archivo como la referencia versionada de lo que existe —
-- si se corrige el schema, se corrige acá y se vuelve a aplicar, no se
-- asume que coincide solo.

create schema if not exists reservas;

-- Log genérico y uniforme de cualquier agente de este proyecto (hoy solo
-- "reservas", mismo criterio que D:\agents: columna `agent` desde el día
-- uno para no tener que migrar el día que se sume un segundo agente).
create table if not exists reservas.logs (
  id uuid primary key default gen_random_uuid(),
  agent text not null,
  level text not null, -- info | warn | error
  message text not null,
  context jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists logs_agent_created_idx on reservas.logs (agent, created_at);
create index if not exists logs_level_created_idx on reservas.logs (level, created_at);

-- Ventana corta de charla libre por chat y por agente — continuidad básica,
-- no aprendizaje (ver src/core/conversation.ts).
create table if not exists reservas.conversation_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id text not null,
  agent text not null,
  role text not null, -- user | assistant
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists conversation_messages_chat_agent_created_idx
  on reservas.conversation_messages (chat_id, agent, created_at);

-- A definir junto con el diseño del agente: reservas en sí (cabaña, fechas,
-- huésped, estado), conexión a Google Calendar (tokens OAuth propios, como
-- agents.meli_connection en D:\agents) y qué guarda la generación de PDF de
-- tarjetas (plantilla de Canva exportada, datos que se insertan). No se
-- crea nada de eso todavía para no inventar columnas antes de tener claro
-- el flujo real.
