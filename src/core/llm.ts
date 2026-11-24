// Única pieza del sistema que sabe qué proveedor de LLM se usa. El
// orquestador y las tools programan contra `Tool`/`llm`, nunca contra el SDK
// de un proveedor puntual — cambiar de proveedor es reescribir este archivo,
// no tocar el resto.

import OpenAI from "openai";

export interface Tool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>; // JSON Schema
  run(input: Record<string, any>): Promise<string>;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface Llm {
  /** Corre el ciclo completo (llamar al modelo, ejecutar tools, repetir) y devuelve el texto final. `history` incluye el mensaje nuevo al final. */
  run(systemPrompt: string, history: ChatMessage[], tools: Tool[]): Promise<string>;
}

const MODEL = "gpt-6-luna";
const MAX_TURNS = 5;

// El canal manda con parse_mode HTML, pero el modelo a veces elige Markdown
// para destacar texto (**negrita**) — HTML no lo entiende, llega como
// asteriscos literales. Se normaliza acá, no se le prohíbe al modelo elegir
// el formato que le parezca más legible, solo se traduce al que el canal
// puede mostrar.
function normalizeToHtml(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
}

/**
 * Cada agente tiene su propia clave de OpenAI (billing/cuota aislados, mismo
 * criterio que todo lo demás) — por eso esto es una fábrica, no un singleton.
 * Cada agente llama `createLlm(process.env.OPENAI_API_KEY_<AGENTE>)` una vez.
 */
export function createLlm(apiKey: string): Llm {
  const client = new OpenAI({ apiKey });

  return {
    async run(systemPrompt, history, tools) {
      const openaiTools: OpenAI.Chat.ChatCompletionTool[] = tools.map((t) => ({
        type: "function",
        function: { name: t.name, description: t.description, parameters: t.inputSchema },
      }));

      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
        ...history.map((m) => ({ role: m.role, content: m.content }) as OpenAI.Chat.ChatCompletionMessageParam),
      ];

      for (let turn = 0; turn < MAX_TURNS; turn++) {
        const res = await client.chat.completions.create({
          model: MODEL,
          max_completion_tokens: 1024,
          reasoning_effort: "none",
          tools: openaiTools,
          messages,
        });

        const message = res.choices[0].message;
        const toolCalls = message.tool_calls ?? [];
        if (toolCalls.length === 0) {
          return normalizeToHtml(message.content ?? "No pude armar una respuesta.");
        }

        messages.push(message);
        for (const call of toolCalls) {
          if (call.type !== "function") continue;
          const tool = tools.find((t) => t.name === call.function.name);
          const input = JSON.parse(call.function.arguments);

          // Si la tool tira (ej. la API externa rechaza el pedido), no se
          // corta toda la conversación con un genérico — el modelo ve el
          // error real como resultado de la tool y lo explica él mismo, en
          // vez de que el usuario tenga que venir a preguntar qué pasó.
          let output: string;
          try {
            output = tool ? await tool.run(input) : "Herramienta no encontrada.";
          } catch (err) {
            output = `La herramienta tiró un error: ${err instanceof Error ? err.message : String(err)}`;
          }

          messages.push({ role: "tool", tool_call_id: call.id, content: output });
        }
      }

      return "No pude armar una respuesta — probá de nuevo o con un pedido más simple.";
    },
  };
}
