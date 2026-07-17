import { getSessionFromCookies } from "@/lib/auth";
import { AiChatWidgetClient } from "@/components/AiChatWidgetClient";

// Server wrapper (mirrors Navbar's pattern): only render the chat widget for a
// logged-in session, keeping the auth check out of the client bundle.
export async function AiChatWidget() {
  const session = await getSessionFromCookies();
  if (!session) return null;

  return <AiChatWidgetClient />;
}
