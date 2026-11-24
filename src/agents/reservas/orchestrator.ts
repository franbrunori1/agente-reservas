// Sin LLM a propósito: reservas/calendario/PDF son todos flujos
// determinísticos (fechas, estados, campos fijos), no hace falta un modelo
// para decidir nada. Esto es solo el mensaje fijo para texto libre que no
// matchea ningún comando (ver commands.ts cuando exista). Contrato de
// agente (ARQUITECTURA.md §3) exige askOrchestrator(chatId, message,
// replyToText) aunque hoy no haga nada más que esto.

export async function askOrchestrator(
  _chatId: string,
  _message: string,
  _replyToText?: string | null,
): Promise<string> {
  return "Todavía no tengo comandos armados — este agente está arrancando.";
}
