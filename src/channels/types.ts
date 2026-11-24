// Contrato que cualquier canal tiene que cumplir. El orquestador programa contra
// esto, nunca contra un proveedor puntual (Telegram, WhatsApp, lo que sea).

export interface Channel {
  send(text: string): Promise<void>;
}
