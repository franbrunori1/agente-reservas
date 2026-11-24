# CLAUDE.md — Agente de reservas de cabañas

> Leer `ARQUITECTURA.md` entero antes de tocar código. Este repo es independiente de `D:\agents` (BOLTEN) a propósito: base de datos propia, deploy en Vercel propio, bot de Telegram propio — nada se comparte entre los dos sistemas.

## Qué es esto

Agente autónomo para gestionar reservas de cabañas: anotar fechas en un calendario, generar PDFs de tarjeta de reservación a partir de una plantilla de Canva, y lo que se vaya definiendo. Arrancó copiando la infraestructura de plataforma ya probada en `D:\agents` (mismo contrato de agente, mismo patrón de salud/logs/memoria), sin copiar nada específico de ese proyecto (MeLi, marketing, credenciales).

## Estado

Scaffolding inicial — todavía no hay cuenta de Supabase, bot de Telegram, proyecto de Vercel ni credenciales de Google Calendar propias de este proyecto. Nada de esto se crea ni se deployea sin confirmar antes con el usuario.

Falta decidir y armar (en ese orden, no se avanza sin resolver lo anterior):
1. Supabase (o el motor de Postgres que se use) — proyecto propio, aplicar `src/memory/schema.sql`, completar `DATABASE_URL`.
2. Bot de Telegram propio (`TELEGRAM_BOT_TOKEN_RESERVAS` / `TELEGRAM_CHAT_ID_RESERVAS`).
3. Proyecto de Vercel propio, enlazado a este repo (no al de `D:\agents`).
4. Diseño real de datos de una reserva (cabaña, fechas, huésped, estado) y recién ahí las tools de calendario y PDF.
5. Acceso a Google Calendar (API, OAuth propio) para escribir las fechas de reserva.
6. La plantilla de Canva: cómo se exporta (PDF editable / imagen + overlay de texto con `pdf-lib`) y qué datos variables lleva la tarjeta.

## Chequeos antes de commitear

`npm run precommit` corre tipos + `check:structure` (hereda el mismo validador de contrato de agente que `D:\agents` — ver `ARQUITECTURA.md` §3). Activar el hook una vez por clon: `git config core.hooksPath .githooks`.

## Seguridad

- Credenciales solo en `.env` local (gitignored) y en las env vars de Vercel — nunca en el repo.
- Cualquier escritura real contra un sistema externo (Google Calendar, lo que sea) necesita confirmación explícita antes de ejecutarse — mismo criterio que `D:\agents` §5.
