// Texto que viene de una API externa se escapa antes de insertarlo en el
// HTML que interpreta Telegram (parse_mode: HTML) — compartido por cualquier
// agente que arme reportes con datos de terceros.

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
