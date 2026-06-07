import { NextResponse } from "next/server";
import { localEngineer } from "@/lib/copilot/advisor";
import { formatCopilotContext } from "@/lib/copilot/format";
import type { CopilotContext } from "@/lib/copilot/context";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * POST { messages, context } → { reply, source }
 *
 * If OPENAI_API_KEY is set, the live simulator state (context) is injected as a
 * system message and forwarded to the LLM. Otherwise the state-aware local
 * engineer answers — so the Copilot works out-of-the-box with zero config.
 */
export async function POST(req: Request) {
  let messages: ChatMessage[] = [];
  let context: CopilotContext | null = null;
  try {
    const body = await req.json();
    messages = body.messages ?? [];
    context = body.context ?? null;
  } catch {
    return NextResponse.json({ reply: "Invalid request.", source: "error" }, { status: 400 });
  }
  const last = messages.length ? messages[messages.length - 1].content : "";

  const key = process.env.OPENAI_API_KEY;
  if (key && context) {
    try {
      const system =
        "You are the Chief Process Engineer inside ProSim Studio, an educational chemical-process " +
        "simulator. Give concise, practical, safety-first advice (≤120 words). Refer to the operator's " +
        "controls by name. If any control or output is in warning/danger, address it first. For oil reason " +
        "about the 8-cut slate, Column ΔP and COT; for cement about Free Lime, C₃S/C₂S, CO and kiln torque.\n\n" +
        "╔══════════════════ LIVE PLANT STATE ══════════════════╗\n" +
        formatCopilotContext(context) +
        "\n╚══════════════════════════════════════════════════════╝\n\n" +
        "Provide real-time engineering advice strictly based on these live inputs and outputs.";
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.4,
          messages: [{ role: "system", content: system }, ...messages],
        }),
      });
      const j = await res.json();
      const reply: string | undefined = j?.choices?.[0]?.message?.content;
      if (reply) return NextResponse.json({ reply, source: "llm" });
    } catch {
      // fall through to local engineer
    }
  }

  return NextResponse.json({
    reply: context ? localEngineer(context, last) : "No simulator context received.",
    source: "local",
  });
}
