import type { AgentHealth, HealthCheck } from "../../core/health.js";
import { db } from "../../memory/client.js";

async function checkDb(): Promise<HealthCheck> {
  try {
    await db.query("select 1");
    return { item: "Base de datos", ok: true };
  } catch (err) {
    return { item: "Base de datos", ok: false, detail: err instanceof Error ? err.message : String(err) };
  }
}

async function checkTelegramWebhook(): Promise<HealthCheck> {
  const res = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN_RESERVAS}/getWebhookInfo`);
  const { result } = await res.json();
  const url: string = result?.url ?? "";
  return {
    item: "Webhook de Telegram",
    ok: url.length > 0,
    detail: url.length > 0 ? url : "no hay webhook registrado (correr setWebhook)",
  };
}

export const reservasHealth: AgentHealth = {
  name: "reservas",
  async check() {
    return Promise.all([checkDb(), checkTelegramWebhook()]);
  },
};
