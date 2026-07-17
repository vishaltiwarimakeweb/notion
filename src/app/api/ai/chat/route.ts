import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { retrieveContext } from "@/lib/rag";
import { generateTextWithFallback } from "@/lib/inlineAi";
import { createAssistantTools } from "@/lib/assistantTools";
import { Message } from "@/models/Message";
import { Page } from "@/models/Page";

const MAX_MESSAGE_LENGTH = 2000;

const SYSTEM_PROMPT = `You are an assistant for a team's internal workspace app.

For questions about the content of pages, answer using ONLY the knowledge base excerpts provided below — do not use outside knowledge. If the answer isn't contained in the excerpts, say you don't know rather than guessing.

For requests to find, list, create, rename, or delete pages/workspaces, use the tools available to you instead of guessing. Tools only ever affect what the current user has access to — if a tool reports something wasn't found, say so plainly rather than assuming it doesn't exist at all.`;

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  await connectToDatabase();
  const messages = await Message.find({ userId: session.userId }).sort({ createdAt: 1 });

  return NextResponse.json({ messages });
}

export async function POST(request: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await request.json();
  const text = String(body.message ?? "").trim();
  if (!text) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }
  if (text.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: `Message is too long (max ${MAX_MESSAGE_LENGTH} characters).` },
      { status: 400 }
    );
  }

  await connectToDatabase();
  await Message.create({
    organizationId: session.organizationId,
    userId: session.userId,
    userType: session.userType,
    message: text,
    sender: "user",
  });

  let chunks: Awaited<ReturnType<typeof retrieveContext>> = [];
  try {
    chunks = await retrieveContext(session, text);
  } catch (error) {
    // Degrade gracefully (e.g. the vector index isn't created/ready yet) rather than
    // 500ing — the assistant just answers with no context, which the system prompt
    // already instructs it to admit rather than guess at.
    console.error("Knowledge base retrieval failed:", error);
  }
  const context = chunks.map((chunk, i) => `[${i + 1}] ${chunk.text}`).join("\n\n");
  const prompt = context
    ? `Knowledge base excerpts:\n${context}\n\nQuestion: ${text}`
    : `Question: ${text}\n\n(No relevant knowledge base excerpts were found.)`;

  let reply: string;
  try {
    const result = await generateTextWithFallback({
      system: SYSTEM_PROMPT,
      prompt,
      tools: createAssistantTools(session),
    });
    reply = result.text.trim();
  } catch {
    return NextResponse.json(
      { error: "AI is unavailable right now. Please try again later." },
      { status: 502 }
    );
  }

  await Message.create({
    organizationId: session.organizationId,
    userId: session.userId,
    userType: session.userType,
    message: reply,
    sender: "assistant",
  });

  const pageIds = [...new Set(chunks.map((chunk) => chunk.pageId.toString()))];
  const sourcePages = await Page.find({ _id: { $in: pageIds } }, "title");

  return NextResponse.json({
    reply,
    sources: sourcePages.map((page) => ({ id: page._id.toString(), title: page.title })),
  });
}
