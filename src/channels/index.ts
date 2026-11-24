// Único punto de entrada que usa el resto del sistema. El día que se sume
// otro canal (WhatsApp, Slack), se escribe su archivo igual a telegram.ts
// y se cambia esta línea — nada más en el sistema se toca.

import { telegramChannel } from "./telegram.js";
import type { Channel } from "./types.js";

export const activeChannel: Channel = telegramChannel;
