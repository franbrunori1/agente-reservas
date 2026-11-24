# ARQUITECTURA.md — Agente de reservas de cabañas

## 0. Por qué un repo separado

Nace como pedido explícito: un agente para gestionar reservas de cabañas, para otra persona, sin mezclarlo con `D:\agents` (BOLTEN). Repo propio, base de datos propia (Supabase u otro Postgres administrado), proyecto de Vercel propio, bot de Telegram propio. Lo único que se compartió al arrancar fue la infraestructura de plataforma ya escrita y probada ahí — copiada, no importada como dependencia — porque resolver "cómo logueo", "cómo chequeo salud", "cómo le hablo a Telegram" de nuevo no aporta nada.

## 1. Qué se copió de `D:\agents` y por qué

Copiado tal cual (genérico, sin saber de MeLi ni de ningún agente puntual):
- `src/core/health.ts`, `logger.ts`, `telegram-api.ts`, `telegram-commands.ts`, `telegram-webhook.ts`, `telegram-webapp.ts`, `date-range.ts`, `html.ts`.
- `src/channels/` completo (contrato `Channel` + implementación de Telegram).
- `src/triggers/check-structure.ts` (el validador de contrato de agente, sección 3 de este mismo archivo).
- `.githooks/pre-commit`.

Adaptado al proyecto propio (cambia el nombre de schema/tablas, nada más):
- `src/memory/client.ts` — mismo patrón (`pg.Pool` único, nadie más abre conexión), pero contra la base de este proyecto, schema `reservas` en vez de `agents`.
- `src/memory/schema.sql`, `src/triggers/status.ts`, `src/triggers/tail-logs.ts` — mismas ideas, nombres propios.

No se copió: `core/meli-auth.ts`, `src/agents/*` de BOLTEN, ninguna credencial, ningún dato real. Tampoco `core/llm.ts` ni `core/conversation.ts` (ventana de charla libre) — decisión explícita, ver §2.1.

### 1.1 Sin LLM, a propósito

Este agente es determinístico de punta a punta: fechas, estados y campos fijos, nada que necesite "criterio" de un modelo. Mismo patrón que el agente `sales` de BOLTEN (comandos fijos, sin orquestador con LLM) — no el de `marketing-ads`. Por eso no se copiaron `core/llm.ts` (fábrica de cliente OpenAI) ni `core/conversation.ts` (ventana de charla para dar contexto a un LLM) ni la dependencia `openai` del `package.json`: no hay nada que las use. Si en algún momento aparece un caso real que sí necesite lenguaje libre, se suman ahí — no antes.

## 2. Qué falta decidir

Ver CLAUDE.md, sección "Estado" — ahí está el orden real (infraestructura antes que lógica).

Decidido:
- **4 cabañas, fijas** — no hay (ni va a haber) comando para agregar/quitar. Se cargan una sola vez con un `insert` en `src/memory/schema.sql` (falta completar con los nombres reales).
- **Alta de reserva a mano por Telegram** — la persona le escribe los datos al bot (nombre, fechas, cabaña), no hay integración con ningún canal de venta.
- **Calendario único compartido** (no uno por cabaña) — cada evento lleva la cabaña en el título, `GOOGLE_CALENDAR_ID` es un solo valor fijo.
- **Google Calendar vía cuenta de servicio** (no OAuth de usuario — no hay login interactivo, y una cuenta de servicio no vence como un refresh token de "installed app"). El JSON de la cuenta de servicio da `client_email` + `private_key`; ese email se comparte como editor del calendario real.
- **PDF de tarjeta de reservación**: plantilla con formato específico ya diseñado en Canva — `pdf-lib` (ya en las dependencias) para generarlo.

Abierto (próximo paso):
- Los 4 nombres reales de las cabañas (completar el `insert` de `schema.sql`).
- Cómo exportó/exporta Canva la plantilla — PDF con campos de formulario (se completan por nombre de campo) o imagen fija + texto superpuesto por coordenadas (pdf-lib puede hacer ambas, pero la segunda es más frágil a cualquier cambio de diseño).
- Credenciales reales de la cuenta de servicio de Google (`GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_CALENDAR_PRIVATE_KEY`, `GOOGLE_CALENDAR_ID`) para probar `/reservar` de punta a punta.

## 3. Contrato de agente (heredado de `D:\agents`)

Cada agente en `src/agents/<nombre>/` necesita:
- `orchestrator.ts` con `export async function askOrchestrator(chatId, message, replyToText)`.
- `health.ts` con un `AgentHealth` (ver `src/core/health.ts`), sumado a `src/triggers/status.ts`.
- Su propio endpoint en `api/` (un archivo que importe de `src/agents/<nombre>/`, no un webhook genérico compartido).
- `decisions.ts`/`rules.ts`/`evaluator.ts` (memoria episódica/semántica con métrica externa medible) van los tres juntos o ninguno — no aplica todavía a este agente.

`src/triggers/check-structure.ts` valida esto en estático antes de cada commit (`npm run precommit`), igual que en `D:\agents`.

Invariantes de `core/`: nunca importa de `src/agents/`; nadie fuera de `src/memory/client.ts` abre su propio `Pool` de Postgres.

## 4. Seguridad

Mismo criterio que `D:\agents` §5: ninguna llamada de escritura contra un sistema externo (crear/mover un evento de Google Calendar, lo que sea) se agrega sin confirmación explícita antes de ejecutarse.
