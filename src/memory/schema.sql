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

insert into reservas.cabanas (nombre) values
  ('Cabaña 1'), ('Cabaña 2'), ('Cabaña 3'), ('Cabaña 4')
on conflict (nombre) do nothing;

-- Estado del wizard de /cotizacion en curso por chat — una sola cotización
-- a la vez por chat (no hace falta más). `step` dice qué está esperando el
-- bot a continuación; `data` acumula lo ya contestado (ver wizard.ts). Se
-- borra la fila al terminar o cancelar, no queda historial acá (el PDF ya
-- generado es el registro real).
create table if not exists reservas.cotizacion_drafts (
  chat_id text primary key,
  step text not null,
  data jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

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
