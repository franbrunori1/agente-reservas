// Fábrica del handler de webhook de Telegram — compartida por todos los
// bots. Antes cada api/*-webhook.js tenía su propio try/catch que, si algo
// fallaba, solo logueaba en la consola de Vercel (invisible para el
// usuario) y nunca mandaba nada: silencio total. Esto nunca pasa más —
// fallar visible, no en silencio (ver ARQUITECTURA.md §7).

import { sendMessage, answerCallbackQuery } from "./telegram-api.js";
import { logEvent, errorContext } from "./logger.js";

export type ResolveReply = (chatId: string, text: string, replyToText: string | null) => Promise<string>;

/**
 * Botón de un teclado inline apretado (ej. Enviar/Editar/Cancelar de un
 * borrador). No devuelve el texto a mandar como mensaje nuevo — el handler
 * ya responde el callback; si hace falta reflejar algo en el chat, la
 * resolución lo hace ella misma (ej. editMessageText sobre el mensaje del
 * borrador), porque sabe qué mensaje es el que tiene que tocar.
 */
export type ResolveCallback = (chatId: string, data: string, callbackQueryId: string) => Promise<void>;

export interface TelegramHandlerConfig {
  /** Nombre del agente, tal cual lo usa el resto del sistema (ej. "email") — para que cada log diga de dónde salió. */
  agent: string;
  botToken: string;
  authorizedChatId: string;
  resolveReply: ResolveReply;
  resolveCallback?: ResolveCallback;
}

export function createTelegramHandler(config: TelegramHandlerConfig) {
  return async function handler(req: any, res: any) {
    const update = req.body;

    const callback = update?.callback_query;
    if (callback) {
      const chatId = callback.message?.chat?.id?.toString();
      if (chatId !== config.authorizedChatId || !config.resolveCallback) {
        if (chatId) {
          await logEvent(config.agent, "warn", "Callback de un chat no autorizado", { chatId, data: callback.data });
        }
        await answerCallbackQuery(config.botToken, callback.id).catch(() => {});
        res.status(200).end();
        return;
      }
      try {
        await config.resolveCallback(chatId, callback.data ?? "", callback.id);
      } catch (err) {
        await logEvent(config.agent, "error", "Falló resolveCallback", { chatId, data: callback.data, ...errorContext(err) });
        await answerCallbackQuery(config.botToken, callback.id, "Uy, algo falló. Mirá el chat.").catch(() => {});
      }
      res.status(200).end();
      return;
    }

    const chatId = update?.message?.chat?.id?.toString();

    // Solo responde al chat autorizado — cualquier otro mensaje se ignora en silencio
    // de cara al remitente, pero queda registrado (puede ser alguien probando el bot a ciegas).
    if (chatId !== config.authorizedChatId) {
      if (chatId) await logEvent(config.agent, "warn", "Mensaje de un chat no autorizado", { chatId });
      res.status(200).end();
      return;
    }

    const text = update?.message?.text ?? "";
    const replyToText = update?.message?.reply_to_message?.text ?? null;

    let reply: string;
    try {
      reply = await config.resolveReply(chatId, text, replyToText);
    } catch (err) {
      await logEvent(config.agent, "error", "Falló resolveReply", { chatId, text, ...errorContext(err) });
      reply = "Uy, algo falló procesando tu mensaje. Probá de nuevo, o con un pedido más simple si el error se repite.";
    }

    try {
      await sendMessage(config.botToken, chatId, reply);
    } catch (err) {
      // Si ni siquiera esto funciona (ej. Telegram caído), ya no hay forma
      // de avisarle al usuario por este medio — al menos queda logueado.
      await logEvent(config.agent, "error", "No se pudo mandar el mensaje a Telegram", { chatId, ...errorContext(err) });
    }

    res.status(200).end();
  };
}
