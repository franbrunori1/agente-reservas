// Telegram llama acá. Comandos determinísticos primero; cualquier otra cosa
// cae al orquestador. Ver src/core/telegram-webhook.ts para el manejo de fallos.

import { createTelegramHandler } from "../src/core/telegram-webhook.js";
import { isCabanasCommand, isCancelarCommand, isCotizacionCommand, parseReservarCommand } from "../src/agents/reservas/commands.js";
import { buildCabanasReport, handleReservar } from "../src/agents/reservas/report.js";
import { askOrchestrator } from "../src/agents/reservas/orchestrator.js";
import { getDraft } from "../src/agents/reservas/cotizacion-drafts.js";
import { startCotizacion, cancelCotizacion, handleCotizacionAnswer } from "../src/agents/reservas/cotizacion-wizard.js";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN_RESERVAS;

async function resolveReply(chatId, text, replyToText) {
  if (isCancelarCommand(text)) return cancelCotizacion(chatId);
  if (isCotizacionCommand(text)) return startCotizacion(chatId);

  // Un draft de /cotizacion en curso tiene prioridad: cualquier texto
  // libre es la respuesta al paso actual, no se procesa como otro comando.
  const draft = await getDraft(chatId);
  if (draft) return handleCotizacionAnswer(chatId, text, draft.step, draft.data, BOT_TOKEN);

  if (isCabanasCommand(text)) return buildCabanasReport();

  const reserva = parseReservarCommand(text);
  if (reserva) return reserva.ok ? handleReservar(chatId, reserva.data) : reserva.error;

  return askOrchestrator(chatId, text, replyToText);
}

export default createTelegramHandler({
  agent: "reservas",
  botToken: BOT_TOKEN,
  authorizedChatId: process.env.TELEGRAM_CHAT_ID_RESERVAS,
  resolveReply,
});
