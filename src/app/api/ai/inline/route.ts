import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { generateWithFallback, type InlineAiAction } from "@/lib/inlineAi";

const VALID_ACTIONS: InlineAiAction[] = ["elaborate", "compact", "fix-grammar", "enhance"];
const MAX_TEXT_LENGTH = 5000;

export async function POST(request: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await request.json();
  const action = body.action as InlineAiAction;
  const text = String(body.text ?? "");

  if (!VALID_ACTIONS.includes(action)) {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }
  if (!text.trim()) {
    return NextResponse.json({ error: "No text selected." }, { status: 400 });
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json(
      { error: `Selected text is too long (max ${MAX_TEXT_LENGTH} characters).` },
      { status: 400 }
    );
  }

  try {
    const result = await generateWithFallback(action, text);
    return NextResponse.json({ result });
  } catch {
    return NextResponse.json(
      { error: "AI is unavailable right now. Please try again later." },
      { status: 502 }
    );
  }
}
