import { generateText } from "ai";
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

export async function generateWithFallback(
  action: InlineAiAction,
  text: string
): Promise<string> {
  let lastError: unknown;

  for (const getModel of PROVIDERS) {
    try {
      const { text: result } = await generateText({
        model: getModel(),
        system: SYSTEM_PROMPTS[action],
        prompt: text,
      });
      return result.trim();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("All AI providers failed.");
}
