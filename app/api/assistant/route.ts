import { bridgeToCoreApi } from "@/lib/sseBridge";

// The public assistant's bridge on docs.vulnix.dev (components/public-assistant/PublicAssistant.tsx;
// main repo docs/Vulnix_Public_Assistant.md). No session: it forwards the visitor's question to
// core-api's POST /public/assistant/chat, which does the human check, the pass and the caps, and
// pipes the Server-Sent Events back. Same as apps/web's /api/public-assistant.
export const dynamic = "force-dynamic";

const CORE_API_URL = process.env.CORE_API_URL ?? "https://api.vulnix.dev";
const MAX_BODY_BYTES = 64_000;

export async function POST(request: Request) {
  return bridgeToCoreApi(request, `${CORE_API_URL}/public/assistant/chat`, {}, MAX_BODY_BYTES);
}
