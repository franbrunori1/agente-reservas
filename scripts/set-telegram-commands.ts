// Uso: npx tsx scripts/set-telegram-commands.ts

import "dotenv/config";
import { setBotCommands } from "../src/core/telegram-commands.js";

await setBotCommands(process.env.TELEGRAM_BOT_TOKEN_RESERVAS!, [
  { command: "reservar", description: "Anota una reserva nueva (ver formato en el chat)" },
  { command: "cabanas", description: "Lista las 4 cabañas" },
]);

console.log("Menú de comandos registrado (reservas).");
