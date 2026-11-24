// Arranque del agente — todavía sin LLM ni tools reales (calendario, PDF).
// Contrato de agente (ARQUITECTURA.md §3) exige askOrchestrator(chatId,
// message, replyToText) aunque hoy no haga nada más que responder un fijo;
// se reemplaza por un createLlm(...) + tools cuando el flujo esté definido.

export async function askOrchestrator(
  _chatId: string,
  _message: string,
  _replyToText?: string | null,
): Promise<string> {
  return "Todavía no tengo nada armado — este agente está arrancando.";
}
