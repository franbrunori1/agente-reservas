// Ventana corta de charla libre por chat y por agente — continuidad básica
// entre mensajes, no el motor de aprendizaje (eso es memoria episódica/
// semántica, propia de cada agente). Compartido porque el canal (Telegram)
// es uno solo para toda la plataforma: cuando haya más de un agente, cada
// uno lee su propia ventana con el mismo módulo, sin duplicar nada.

import { db } from "../memory/client.js";
import type { ChatMessage } from "./llm.js";

const WINDOW = 15;

export async function getRecentMessages(chatId: string, agent: string): Promise<ChatMessage[]> {
  const { rows } = await db.query(
    `select role, content from reservas.conversation_messages
     where chat_id = $1 and agent = $2
     order by created_at desc limit $3`,
    [chatId, agent, WINDOW],
  );
  return rows.reverse();
}

export async function saveMessage(chatId: string, agent: string, role: "user" | "assistant", content: string): Promise<void> {
  await db.query(
    `insert into reservas.conversation_messages (chat_id, agent, role, content) values ($1, $2, $3, $4)`,
    [chatId, agent, role, content],
  );
}
