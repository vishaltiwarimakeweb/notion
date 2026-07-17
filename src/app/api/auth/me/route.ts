import { NextResponse } from "next/server";
import { getCurrentManager } from "@/lib/auth";

export async function GET() {
  const manager = await getCurrentManager();

  if (!manager) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  return NextResponse.json({
    manager: { id: manager._id, name: manager.name, email: manager.email },
  });
}
