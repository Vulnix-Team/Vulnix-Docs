// The public assistant's bridge on docs.vulnix.dev (components/public-assistant/PublicAssistant.tsx;
// main repo docs/Vulnix_Public_Assistant.md). No session: it forwards the visitor's question to
// core-api's POST /public/assistant/chat, which does the human check, the pass and the caps, and
// pipes the Server-Sent Events back. Same as apps/web's /api/public-assistant.
export const dynamic = "force-dynamic";

const CORE_API_URL = process.env.CORE_API_URL ?? "https://api.vulnix.dev";
const MAX_BODY_BYTES = 64_000;

export async function POST(request: Request) {
  const body = await request.text();
  if (body.length > MAX_BODY_BYTES) {
    return Response.json({ error: { code: "too_large", message: "The conversation is too long." } }, { status: 413 });
  }
  const upstream = await fetch(`${CORE_API_URL}/public/assistant/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    cache: "no-store",
    signal: request.signal,
  });
  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    return new Response(text || null, {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json" },
    });
  }
  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
