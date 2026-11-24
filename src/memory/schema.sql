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

-- Son 4 cabañas fijas, sin alta/baja por comando (decisión explícita del
-- usuario) — se cargan una sola vez acá, con nombre real, y no se tocan más
-- salvo que la lista cambie de verdad. Si en algún momento cada cabaña
-- necesita su propio calendario (hoy se decidió uno solo compartido, ver
-- ARQUITECTURA.md §2), es la columna que se agrega, no otra tabla.
create table if not exists reservas.cabanas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  created_at timestamptz not null default now()
);

-- TODO: completar con los 4 nombres reales y correr una sola vez.
-- insert into reservas.cabanas (nombre) values
--   ('<cabaña 1>'), ('<cabaña 2>'), ('<cabaña 3>'), ('<cabaña 4>')
-- on conflict (nombre) do nothing;

-- Una reserva = un evento real en el Google Calendar compartido
-- (google_event_id es el id que devuelve la API al crearlo, para poder
-- editarlo/cancelarlo después sin tener que buscarlo por fecha). No se
-- borra nunca aunque se cancele — `estado` lleva el historial real.
create table if not exists reservas.reservas (
  id uuid primary key default gen_random_uuid(),
  cabana_id uuid not null references reservas.cabanas (id),
  huesped_nombre text not null,
  huesped_contacto text,
  fecha_entrada date not null,
  fecha_salida date not null,
  estado text not null default 'confirmada', -- confirmada | cancelada
  google_event_id text,
  chat_id text not null, -- quién la dio de alta, mismo criterio que conversation_messages en D:\agents
  created_at timestamptz not null default now()
);

create index if not exists reservas_cabana_fechas_idx on reservas.reservas (cabana_id, fecha_entrada, fecha_salida);
