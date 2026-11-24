// Telegram llama acá. Comandos determinísticos primero; cualquier otra cosa
// cae al orquestador. Ver src/core/telegram-webhook.ts para el manejo de fallos.

import { createTelegramHandler } from "../src/core/telegram-webhook.js";
import { isCabanasCommand, parseAgregarCabanaCommand, parseReservarCommand } from "../src/agents/reservas/commands.js";
import { buildCabanasReport, handleAgregarCabana, handleReservar } from "../src/agents/reservas/report.js";
import { askOrchestrator } from "../src/agents/reservas/orchestrator.js";

async function resolveReply(chatId, text, replyToText) {
  if (isCabanasCommand(text)) return buildCabanasReport();

  const nuevaCabana = parseAgregarCabanaCommand(text);
  if (nuevaCabana) return handleAgregarCabana(nuevaCabana);

  const reserva = parseReservarCommand(text);
  if (reserva) return reserva.ok ? handleReservar(chatId, reserva.data) : reserva.error;

  return askOrchestrator(chatId, text, replyToText);
}

export default createTelegramHandler({
  agent: "reservas",
  botToken: process.env.TELEGRAM_BOT_TOKEN_RESERVAS,
  authorizedChatId: process.env.TELEGRAM_CHAT_ID_RESERVAS,
  resolveReply,
});
