// Registra el menú de "/" de un bot de Telegram (setMyCommands). Genérico —
// cada agente le pasa su propio token y su propia lista.

export interface BotCommand {
  command: string;
  description: string;
}

export async function setBotCommands(token: string, commands: BotCommand[]): Promise<void> {
  const res = await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ commands }),
  });

  const data = await res.json();
  if (!data.ok) {
    throw new Error(`Telegram rechazó setMyCommands: ${JSON.stringify(data)}`);
  }
}
