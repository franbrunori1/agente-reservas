// Telegram llama acá. Ver src/core/telegram-webhook.ts para el manejo de fallos.

import { createTelegramHandler } from "../src/core/telegram-webhook.js";
import { askOrchestrator } from "../src/agents/reservas/orchestrator.js";

export default createTelegramHandler({
  agent: "reservas",
  botToken: process.env.TELEGRAM_BOT_TOKEN_RESERVAS,
  authorizedChatId: process.env.TELEGRAM_CHAT_ID_RESERVAS,
  resolveReply: askOrchestrator,
});
