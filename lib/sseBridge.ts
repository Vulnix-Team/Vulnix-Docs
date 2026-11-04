// The assistants' bridges to core-api (app/api/assistant, app/api/public-assistant): read the
// browser's body within a byte limit, post it upstream, pipe the Server-Sent Events back. One
// place, so the two cannot drift. The docs site (vulnix-docs) keeps a byte-for-byte copy at the
// same path; PublicAssistantShared.test.ts fails on drift.

const encoder = new TextEncoder();

function refusal(code: string, message: string, status: number): Response {
  return Response.json({ error: { code, message } }, { status });
}

export async function bridgeToCoreApi(
  request: Request,
  url: string,
  headers: Record<string, string>,
  maxBytes: number,
): Promise<Response> {
  // A declared size over the limit is refused before anything is read.
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > maxBytes) return refusal("too_large", "The conversation is too long.", 413);
  const body = await request.text();
  if (encoder.encode(body).length > maxBytes) return refusal("too_large", "The conversation is too long.", 413);

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body,
      cache: "no-store",
      // Closing the panel stops the answer upstream too, so no tokens are spent on nobody.
      signal: request.signal,
    });
  } catch (error) {
    // The browser left (nothing to answer), or core-api could not be reached.
    if ((error as Error).name === "AbortError") return new Response(null, { status: 499 });
    return refusal("unreachable", "The assistant could not answer just now. Try again in a moment.", 502);
  }

  if (!upstream.ok || !upstream.body) {
    // Only core-api's own JSON error goes through; anything else (a gateway's HTML page) is
    // replaced by a plain one.
    const isJson = (upstream.headers.get("content-type") ?? "").includes("application/json");
    if (isJson) {
      return new Response(await upstream.text().catch(() => ""), {
        status: upstream.status,
        headers: { "Content-Type": "application/json" },
      });
    }
    return refusal("upstream_error", "The assistant could not answer just now. Try again in a moment.", upstream.status || 502);
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
