// Llamadas directas a la API de Telegram, compartidas por cualquier bot —
// no solo el webhook (las tools también las usan, ej. para mandar una foto).

export interface InlineButton {
  text: string;
  callback_data?: string;
  web_app?: { url: string };
}

export interface InlineKeyboard {
  inline_keyboard: InlineButton[][];
}

/** Devuelve el message_id mandado — hace falta para poder editar ese mensaje después (ej. al cambiar un borrador). */
export async function sendMessage(
  token: string,
  chatId: string,
  text: string,
  replyMarkup?: InlineKeyboard,
): Promise<number> {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", reply_markup: replyMarkup }),
  });
  if (!res.ok) throw new Error(`Telegram respondió ${res.status}: ${await res.text()}`);
  const { result } = await res.json();
  return result.message_id;
}

/** Reescribe un mensaje ya mandado (ej. un borrador que se editó o se mandó/canceló). */
export async function editMessageText(
  token: string,
  chatId: string,
  messageId: number,
  text: string,
  replyMarkup?: InlineKeyboard,
): Promise<void> {
  const res = await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, text, parse_mode: "HTML", reply_markup: replyMarkup }),
  });
  if (!res.ok) throw new Error(`Telegram (editMessageText) respondió ${res.status}: ${await res.text()}`);
}

/** Apaga el "cargando..." del botón apretado — Telegram lo pide siempre, aunque no haya nada para mostrar. */
export async function answerCallbackQuery(token: string, callbackQueryId: string, text?: string): Promise<void> {
  const res = await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  });
  if (!res.ok) throw new Error(`Telegram (answerCallbackQuery) respondió ${res.status}: ${await res.text()}`);
}

export async function sendDocument(
  token: string,
  chatId: string,
  document: Buffer,
  filename: string,
  caption?: string,
): Promise<void> {
  const form = new FormData();
  form.set("chat_id", chatId);
  if (caption) form.set("caption", caption);
  form.set("document", new Blob([new Uint8Array(document)]), filename);

  const res = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, { method: "POST", body: form });
  if (!res.ok) throw new Error(`Telegram (sendDocument) respondió ${res.status}: ${await res.text()}`);
}

export async function sendPhoto(token: string, chatId: string, photo: Buffer, caption?: string): Promise<void> {
  const form = new FormData();
  form.set("chat_id", chatId);
  if (caption) form.set("caption", caption);
  form.set("photo", new Blob([new Uint8Array(photo)]), "image.png");

  const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, { method: "POST", body: form });
  if (!res.ok) throw new Error(`Telegram (sendPhoto) respondió ${res.status}: ${await res.text()}`);
}
