// Uso: npx tsx scripts/set-telegram-commands.ts

import "dotenv/config";
import { setBotCommands } from "../src/core/telegram-commands.js";

await setBotCommands(process.env.TELEGRAM_BOT_TOKEN_RESERVAS!, [
  // Se completa cuando esté definido el set de comandos del agente.
]);

console.log("Menú de comandos registrado (reservas).");
