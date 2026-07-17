import { generateText, stepCountIs, type ToolSet } from "ai";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";

export type InlineAiAction = "elaborate" | "compact" | "fix-grammar" | "enhance";

const SYSTEM_PROMPTS: Record<InlineAiAction, string> = {
  elaborate:
    "Expand and elaborate on the given text, adding relevant detail while keeping the same tone and meaning. Return only the rewritten text, with no explanation or preamble.",
  compact:
    "Condense the given text to be more concise while preserving its key meaning. Return only the rewritten text, with no explanation or preamble.",
  "fix-grammar":
    "Fix any grammatical, spelling, and punctuation errors in the given text. Preserve the original meaning and tone. Return only the corrected text, with no explanation or preamble.",
  enhance:
    "Rewrite the given text to sound more professional and polished. Return only the rewritten text, with no explanation or preamble.",
};

// Tried in order; a missing/invalid key or a provider outage falls through to the next one.
const PROVIDERS = [
  () => openai(process.env.OPENAI_MODEL ?? "gpt-5-mini"),
  () => google(process.env.GEMINI_MODEL ?? "gemini-2.5-flash"),
  () => groq(process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile"),
];

// Shared fallback loop, reused by inline AI (fixed actions, below) and the RAG+tools
// chat assistant (src/app/api/ai/chat/route.ts), which needs an arbitrary system/prompt
// pair and optional tool-calling. Returns the full generateText result so callers that
// need tool-call/step info (the chat route) can inspect it; generateWithFallback below
// just extracts the final text for inline AI's fixed-action callers.
export async function generateTextWithFallback(options: {
  system: string;
  prompt: string;
  tools?: ToolSet;
}) {
  let lastError: unknown;

  for (const getModel of PROVIDERS) {
    try {
      return await generateText({
        model: getModel(),
        system: options.system,
        prompt: options.prompt,
        tools: options.tools,
        stopWhen: options.tools ? stepCountIs(5) : undefined,
      });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("All AI providers failed.");
}

export async function generateWithFallback(
  action: InlineAiAction,
  text: string
): Promise<string> {
  const result = await generateTextWithFallback({ system: SYSTEM_PROMPTS[action], prompt: text });
  return result.text.trim();
}
