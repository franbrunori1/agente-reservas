// Verifica que un initData de una Telegram Mini App sea de verdad — lo
// firma Telegram con el token del bot, así que si alguien adivina la URL de
// edición (id de borrador) sin haberla abierto desde el botón real, esto lo
// frena. Algoritmo documentado por Telegram (HMAC-SHA256, clave derivada de
// "WebAppData" + el token del bot).

import { createHmac } from "crypto";

export interface VerifiedInitData {
  userId: string;
}

const MAX_AGE_SECONDS = 24 * 60 * 60;

export function verifyInitData(initData: string, botToken: string): VerifiedInitData | null {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const computedHash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  if (computedHash !== hash) return null;

  const authDate = Number(params.get("auth_date") ?? "0");
  if (!authDate || Date.now() / 1000 - authDate > MAX_AGE_SECONDS) return null;

  const userRaw = params.get("user");
  if (!userRaw) return null;
  const user = JSON.parse(userRaw);
  return { userId: String(user.id) };
}
