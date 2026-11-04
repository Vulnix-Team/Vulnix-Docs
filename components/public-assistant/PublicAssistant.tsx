"use client";

// The public assistant on vulnix.dev and docs.vulnix.dev (docs/Vulnix_Public_Assistant.md).
//
// Self-contained on purpose: React only, its own icons, its own small Markdown renderer (React
// elements, never injected HTML) and its own styles, so the docs site (vulnix-docs, no motion,
// no Markdown library) carries a byte-for-byte copy. PublicAssistantShared.test.ts fails on drift:
// change this file, then copy it to vulnix-docs/components/public-assistant/PublicAssistant.tsx.
//
// A floating button opens a dark panel (the same on both sites, over light or dark pages). The
// visitor's first question waits for a Cloudflare Turnstile token (`interaction-only`: most people
// never see it); core-api answers with a signed pass the rest of the conversation rides on. When
// the model calls `suggest_demo`, a "Book a demo" card appears with the site's own booking link.
// The conversation and the pass stay in this tab only (sessionStorage).

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

type Source = { title: string; url: string };
type Turn = {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  demo?: boolean;
  searching?: boolean;
  error?: string;
  streaming?: boolean;
};

export type PublicAssistantEvent = "opened" | "question_sent" | "demo_clicked" | "source_opened" | "reset";

type Props = {
  /** This site's proxy to core-api's POST /public/assistant/chat. */
  endpoint: string;
  site: "marketing" | "docs";
  /** The booking page (lib/marketing/bookDemo.ts on vulnix.dev). */
  bookDemoHref: string;
  /** Cloudflare Turnstile site key; without one the check is skipped (local dev). */
  turnstileSiteKey?: string;
  suggestions: string[];
  onEvent?: (event: PublicAssistantEvent, properties?: Record<string, string>) => void;
  /** The site's body and heading fonts (CSS font-family values); a system sans-serif otherwise. */
  font?: string;
  headingFont?: string;
};

const STORAGE_KEY = "vulnix:public-assistant";
const TURNSTILE_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const CLOSE_MS = 240;

type TurnstileApi = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};

function turnstileApi(): TurnstileApi | undefined {
  return (window as unknown as { turnstile?: TurnstileApi }).turnstile;
}

function load(): { turns: Turn[]; pass: string | null } {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { turns: [], pass: null };
    const parsed = JSON.parse(raw) as { turns?: Turn[]; pass?: string | null };
    const turns = (parsed.turns ?? []).map((t) => ({ ...t, streaming: false, searching: false }));
    return { turns, pass: parsed.pass ?? null };
  } catch {
    return { turns: [], pass: null };
  }
}

function save(turns: Turn[], pass: string | null) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ turns: turns.slice(-30), pass }));
  } catch {
    // A private window or blocked storage: the conversation just does not survive a reload.
  }
}

const REFUSALS: Record<number, string> = {
  403: "The human check did not go through. Try again in a moment.",
  413: "That conversation is too long. Start a new one.",
  429: "That is a lot of questions for now. The docs are always open, and so is a demo.",
  503: "The assistant is off right now. The docs and a demo are always open.",
};

// ---- a small, safe Markdown renderer: paragraphs, lists, headings, bold, italic, code, links ----

function safeHref(url: string): string | null {
  return /^(https?:|mailto:)/i.test(url) ? url : null;
}

function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\)|https?:\/\/[^\s<>()]*[^\s<>().,;:!?'"]|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g;
  let last = 0;
  let index = 0;
  for (const match of text.matchAll(pattern)) {
    const token = match[0];
    const at = match.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    const k = `${key}-${index++}`;
    if (token.startsWith("**")) out.push(<strong key={k}>{token.slice(2, -2)}</strong>);
    else if (token.startsWith("`")) out.push(<code key={k} className="vpa-code">{token.slice(1, -1)}</code>);
    else if (token.startsWith("[")) {
      const label = token.slice(1, token.indexOf("]"));
      const href = safeHref(token.slice(token.indexOf("(") + 1, -1));
      out.push(
        href ? (
          <a key={k} href={href} target="_blank" rel="noopener noreferrer" className="vpa-link">
            {label}
          </a>
        ) : (
          label
        ),
      );
    } else if (/^https?:/.test(token)) {
      out.push(
        <a key={k} href={token} target="_blank" rel="noopener noreferrer" className="vpa-link">
          {token.replace(/^https?:\/\//, "")}
        </a>,
      );
    } else out.push(<em key={k}>{token.slice(1, -1)}</em>);
    last = at + token.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  const lines = text.replace(/\r/g, "").split("\n");
  let list: { ordered: boolean; items: string[] } | null = null;
  let paragraph: string[] = [];
  const flushParagraph = () => {
    if (paragraph.length) blocks.push(<p key={`p${blocks.length}`} dir="auto">{inline(paragraph.join(" "), `p${blocks.length}`)}</p>);
    paragraph = [];
  };
  const flushList = () => {
    if (!list) return;
    const items = list.items.map((item, i) => (
      <li key={i} dir="auto">
        {inline(item, `l${blocks.length}-${i}`)}
      </li>
    ));
    // The list's own direction (bullets left or right) follows its first item's language.
    blocks.push(
      list.ordered ? (
        <ol key={`o${blocks.length}`} dir="auto">
          {items}
        </ol>
      ) : (
        <ul key={`u${blocks.length}`} dir="auto">
          {items}
        </ul>
      ),
    );
    list = null;
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    const heading = /^#{1,6}\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      flushParagraph();
      const ordered = Boolean(numbered);
      if (!list || list.ordered !== ordered) {
        flushList();
        list = { ordered, items: [] };
      }
      list.items.push((bullet ?? numbered)![1]);
    } else if (heading) {
      flushParagraph();
      flushList();
      blocks.push(
        <p key={`h${blocks.length}`} className="vpa-heading" dir="auto">
          {inline(heading[1], `h${blocks.length}`)}
        </p>,
      );
    } else if (!line.trim()) {
      flushParagraph();
      flushList();
    } else {
      flushList();
      paragraph.push(line.trim());
    }
  }
  flushParagraph();
  flushList();
  return (
    <div className="vpa-md" dir="auto">
      {blocks}
    </div>
  );
}

// ---- icons ----

function StarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path className="vpa-star" d="M11 4c.55 4.3 2.2 5.95 6.5 6.5-4.3.55-5.95 2.2-6.5 6.5-.55-4.3-2.2-5.95-6.5-6.5 4.3-.55 5.95-2.2 6.5-6.5Z" />
      <path className="vpa-spark" d="M19 2.5c.2 1.4.6 1.8 2 2-1.4.2-1.8.6-2 2-.2-1.4-.6-1.8-2-2 1.4-.2 1.8-.6 2-2Z" />
      <path className="vpa-spark" d="M18 16c.2 1.4.6 1.8 2 2-1.4.2-1.8.6-2 2-.2-1.4-.6-1.8-2-2 1.4-.2 1.8-.6 2-2Z" />
    </svg>
  );
}

const ICON = "size-4 shrink-0";
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" className={ICON} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);
const NewIcon = () => (
  <svg viewBox="0 0 24 24" className={ICON} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.4 2.6a2.1 2.1 0 1 1 3 3L12 15l-4 1 1-4Z" />
  </svg>
);
const SendIcon = () => (
  <svg viewBox="0 0 24 24" className={ICON} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="m5 12 7-7 7 7M12 19V5" />
  </svg>
);
const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" className={ICON} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

// ---- the component ----

export function PublicAssistant({ endpoint, site, bookDemoHref, turnstileSiteKey, suggestions, onEvent, font, headingFont }: Props) {
  const fontStyle = { ...(font ? { "--vpa-font": font } : {}), ...(headingFont ? { "--vpa-heading": headingFont } : {}) } as CSSProperties;
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const passRef = useRef<string | null>(null);
  // Whether a human check is due: no pass yet, or the last one was refused. In state, so the
  // Turnstile widget renders again after a refusal.
  const [needsHuman, setNeedsHuman] = useState(true);
  const tokenRef = useRef<string | null>(null);
  const scriptFailed = useRef(false);
  const closeTimer = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const widgetRef = useRef<string | null>(null);
  const turnstileBox = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const restored = useRef(false);

  // Restore this tab's conversation once, on the first open.
  const show = useCallback(() => {
    if (!restored.current) {
      restored.current = true;
      const saved = load();
      setTurns(saved.turns);
      passRef.current = saved.pass;
      setNeedsHuman(!saved.pass);
    }
    // Reopened while it was still closing: keep it.
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
    setMounted(true);
    window.requestAnimationFrame(() => setOpen(true));
    onEvent?.("opened", { path: window.location.pathname });
  }, [onEvent]);

  const hide = useCallback(() => {
    setOpen(false);
    // Closing stops the answer, upstream too (the bridge passes the abort on).
    abortRef.current?.abort();
    closeTimer.current = window.setTimeout(() => {
      closeTimer.current = null;
      setMounted(false);
    }, CLOSE_MS);
  }, []);

  useEffect(
    () => () => {
      abortRef.current?.abort();
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (!mounted) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") hide();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mounted, hide]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Saved once an answer has settled, not on every streamed word.
  useEffect(() => {
    if (restored.current && !busy) save(turns, passRef.current);
  }, [turns, busy]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [turns]);

  // Turnstile, only while the panel is open and there is no pass yet.
  useEffect(() => {
    if (!mounted || !turnstileSiteKey || !needsHuman) return;
    let cancelled = false;
    const render = () => {
      const api = turnstileApi();
      if (cancelled || !api || !turnstileBox.current || widgetRef.current) return;
      widgetRef.current = api.render(turnstileBox.current, {
        sitekey: turnstileSiteKey,
        theme: "dark",
        appearance: "interaction-only",
        "refresh-expired": "auto",
        callback: (token: string) => {
          tokenRef.current = token;
        },
        "expired-callback": () => {
          tokenRef.current = null;
        },
      });
    };
    if (turnstileApi()) render();
    else {
      let script = document.querySelector<HTMLScriptElement>(`script[src="${TURNSTILE_SRC}"]`);
      if (!script) {
        script = document.createElement("script");
        script.src = TURNSTILE_SRC;
        script.async = true;
        document.head.appendChild(script);
      }
      script.addEventListener("load", render);
      script.addEventListener("error", () => {
        scriptFailed.current = true;
      });
    }
    return () => {
      cancelled = true;
      const api = turnstileApi();
      if (api && widgetRef.current) api.remove(widgetRef.current);
      widgetRef.current = null;
      tokenRef.current = null;
    };
  }, [mounted, turnstileSiteKey, needsHuman]);

  async function humanToken(): Promise<string | null> {
    if (!turnstileSiteKey) return null;
    for (let i = 0; i < 60 && !tokenRef.current && !scriptFailed.current; i++) {
      await new Promise((r) => window.setTimeout(r, 250));
    }
    return tokenRef.current;
  }

  function patchLast(update: (turn: Turn) => Turn) {
    setTurns((current) => {
      // The conversation was cleared meanwhile: nothing to update.
      if (!current.length || current[current.length - 1].role !== "assistant") return current;
      const next = current.slice();
      next[next.length - 1] = update(next[next.length - 1]);
      return next;
    });
  }

  function handle(event: Record<string, unknown>) {
    if (event.type === "pass") {
      passRef.current = String(event.token);
      setNeedsHuman(false);
    } else if (event.type === "text") {
      patchLast((t) => ({ ...t, content: t.content + String(event.delta ?? ""), searching: false }));
    } else if (event.type === "tool") {
      if (event.name === "suggest_demo") patchLast((t) => ({ ...t, demo: true }));
      else patchLast((t) => ({ ...t, searching: event.status === "running" }));
    } else if (event.type === "sources") {
      // The best few: the search returns many candidates, ranked.
      const items = Array.isArray(event.items) ? (event.items as Source[]) : [];
      patchLast((t) => ({ ...t, sources: items.slice(0, 4) }));
    } else if (event.type === "error") {
      patchLast((t) => ({ ...t, error: String(event.message ?? "Something went wrong.") }));
    }
  }

  async function ask(question: string) {
    const text = question.trim();
    if (!text || busy) return;
    setDraft("");
    setBusy(true);
    onEvent?.("question_sent", { path: window.location.pathname });
    const history = [...turns, { role: "user" as const, content: text }];
    setTurns([...history, { role: "assistant", content: "", streaming: true }]);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const token = passRef.current ? null : await humanToken();
      if (!passRef.current && turnstileSiteKey && !token) {
        // No token came (the check could not load or was not finished): say so now rather
        // than send a request that can only be refused.
        patchLast((t) => ({ ...t, streaming: false, error: REFUSALS[403] }));
        return;
      }
      const response = await fetch(endpoint, {
        signal: controller.signal,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.filter((t) => t.content).slice(-10).map((t) => ({ role: t.role, content: t.content })),
          page: window.location.pathname.slice(0, 200),
          site,
          pass: passRef.current,
          turnstile_token: token,
        }),
      });
      if (!response.ok || !response.body) {
        if (response.status === 403) {
          passRef.current = null;
          tokenRef.current = null;
          const api = turnstileApi();
          if (api && widgetRef.current) api.reset(widgetRef.current);
          setNeedsHuman(true);
        }
        patchLast((t) => ({ ...t, streaming: false, error: REFUSALS[response.status] ?? "Something went wrong. Try again." }));
        return;
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (let finished = false; !finished; ) {
        const { value, done } = await reader.read();
        finished = done;
        buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
        const frames = buffer.replace(/\r\n/g, "\n").split("\n\n");
        // The last piece may be half a frame; at the end of the stream it is a whole one.
        buffer = done ? "" : (frames.pop() ?? "");
        for (const frame of frames) {
          if (!frame.startsWith("data: ")) continue;
          try {
            handle(JSON.parse(frame.slice(6)) as Record<string, unknown>);
          } catch {
            // A malformed frame is skipped, never fatal to the answer.
          }
        }
      }
      patchLast((t) => ({ ...t, streaming: false, searching: false }));
    } catch (error) {
      const aborted = (error as Error).name === "AbortError";
      patchLast((t) => ({ ...t, streaming: false, searching: false, error: aborted ? undefined : "The connection dropped. Try again." }));
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setBusy(false);
    }
  }

  function reset() {
    if (busy) abortRef.current?.abort();
    setTurns([]);
    onEvent?.("reset");
    inputRef.current?.focus();
  }

  return (
    <>
      <style>{STYLES}</style>
      <button
        type="button"
        onClick={() => (mounted ? hide() : show())}
        aria-label={mounted ? "Close the assistant" : "Ask Vulnix"}
        aria-expanded={mounted}
        data-open={mounted}
        className="vpa-launcher"
        style={fontStyle}
      >
        <StarIcon className="vpa-launcher-icon" />
        <span className="vpa-launcher-label">Ask Vulnix</span>
      </button>

      {mounted ? (
        <section role="dialog" aria-label="Ask Vulnix" data-open={open} className="vpa-panel" style={fontStyle}>
          <header className="vpa-header">
            <span className="vpa-dot" aria-hidden />
            <div className="vpa-title">
              <strong>Ask Vulnix</strong>
              <span>Answers from the Vulnix docs</span>
            </div>
            {turns.length ? (
              <button type="button" onClick={reset} className="vpa-icon-button" aria-label="New conversation" title="New conversation">
                <NewIcon />
              </button>
            ) : null}
            <button type="button" onClick={hide} className="vpa-icon-button" aria-label="Close" title="Close">
              <CloseIcon />
            </button>
          </header>

          <div className="vpa-body">
            {turns.length === 0 ? (
              <div className="vpa-empty">
                <p className="vpa-empty-title">How can I help?</p>
                <p className="vpa-empty-sub">
                  Ask anything about Vulnix: what it tests, how it works, plans and pricing. For the rest, book a
                  meeting with the team.
                </p>
                <div className="vpa-suggestions">
                  {suggestions.map((s) => (
                    <button key={s} type="button" className="vpa-chip" onClick={() => ask(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              turns.map((turn, i) =>
                turn.role === "user" ? (
                  <div key={i} className="vpa-user" dir="auto">
                    {turn.content}
                  </div>
                ) : (
                  <div key={i} className="vpa-answer">
                    {turn.searching ? <p className="vpa-status">Searching the docs…</p> : null}
                    {turn.content ? <Markdown text={turn.content} /> : null}
                    {turn.streaming && !turn.content && !turn.searching ? <span className="vpa-pending" aria-label="Thinking" /> : null}
                    {turn.demo && !turn.streaming ? (
                      <div className="vpa-demo">
                        <div>
                          <strong>Talk to the team</strong>
                          <span>A short call about your setup, pricing and next steps.</span>
                        </div>
                        <a
                          href={bookDemoHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="vpa-demo-button"
                          onClick={() => onEvent?.("demo_clicked", { path: window.location.pathname })}
                        >
                          <CalendarIcon />
                          Book a demo
                        </a>
                      </div>
                    ) : null}
                    {turn.sources?.length && !turn.streaming ? (
                      <div className="vpa-sources">
                        {turn.sources.map((source) => (
                          <a
                            key={source.url}
                            href={safeHref(source.url) ?? undefined}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="vpa-chip vpa-chip-small"
                            onClick={() => onEvent?.("source_opened", { url: source.url })}
                          >
                            {source.title}
                          </a>
                        ))}
                      </div>
                    ) : null}
                    {turn.error ? (
                      <p role="alert" className="vpa-error">
                        {turn.error}
                      </p>
                    ) : null}
                  </div>
                ),
              )
            )}
            <div ref={endRef} />
          </div>

          <form
            className="vpa-composer"
            onSubmit={(event) => {
              event.preventDefault();
              void ask(draft);
            }}
          >
            <textarea
              ref={inputRef}
              dir="auto"
              value={draft}
              onChange={(event) => setDraft(event.target.value.slice(0, 2000))}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void ask(draft);
                }
              }}
              rows={2}
              placeholder="Ask about Vulnix…"
              aria-label="Your question"
            />
            <div className="vpa-composer-foot">
              <span>Answers come from the public docs.</span>
              <button type="submit" disabled={busy || !draft.trim()} className="vpa-send" aria-label="Send">
                <SendIcon />
              </button>
            </div>
          </form>
          <div ref={turnstileBox} className="vpa-turnstile" />
        </section>
      ) : null}
    </>
  );
}

// Scoped under `vpa-`; the same on both sites. Dark on purpose: it floats over light and dark pages.
const STYLES = `
.vpa-launcher,.vpa-panel{font-family:var(--vpa-font,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif);-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-rendering:optimizeLegibility;font-feature-settings:"cv11","ss01","ss03";letter-spacing:-.006em}
.vpa-launcher{position:fixed;right:20px;bottom:20px;z-index:60;display:flex;align-items:center;gap:8px;height:46px;padding:0 18px 0 15px;border-radius:999px;border:1px solid rgb(255 255 255/.12);background:#0c0c0c;color:#f2f3ee;font-size:14px;font-weight:600;line-height:1;letter-spacing:-.01em;cursor:pointer;box-shadow:0 12px 32px -10px rgb(254 66 2/.55),0 2px 6px rgb(0 0 0/.3);transition:transform .2s ease,box-shadow .2s ease,opacity .2s ease}
.vpa-launcher:hover{transform:translateY(-1px);box-shadow:0 16px 40px -10px rgb(254 66 2/.7),0 2px 6px rgb(0 0 0/.3)}
.vpa-launcher:focus-visible{outline:2px solid #fe4202;outline-offset:3px}
.vpa-launcher-icon{width:19px;height:19px;color:#fe4202}
.vpa-launcher .vpa-star,.vpa-launcher .vpa-spark{transform-box:fill-box;transform-origin:center}
.vpa-launcher .vpa-star{transition:transform .52s cubic-bezier(.34,1.56,.64,1)}
.vpa-launcher:hover .vpa-star{transform:rotate(90deg) scale(1.08)}
.vpa-launcher:hover .vpa-spark{animation:vpa-twinkle .9s ease-in-out infinite}
.vpa-launcher:hover .vpa-spark:last-of-type{animation-delay:.3s}
@keyframes vpa-twinkle{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(.4);opacity:.35}}
.vpa-panel{position:fixed;right:20px;bottom:78px;z-index:61;display:flex;flex-direction:column;width:min(400px,calc(100vw - 40px));height:min(600px,calc(100dvh - 160px));border-radius:22px;border:1px solid rgb(255 255 255/.1);background:#0c0c0c;color:#f2f3ee;box-shadow:0 30px 80px -20px rgb(0 0 0/.6),0 20px 60px -30px rgb(254 66 2/.45);transform-origin:bottom right;opacity:0;transform:translateY(12px) scale(.96);transition:opacity .24s ease,transform .24s cubic-bezier(.32,.72,0,1);overflow:hidden}
.vpa-panel[data-open=true]{opacity:1;transform:none}
@media (max-width:640px){.vpa-panel{inset:0;width:auto;height:auto;border-radius:0;transform-origin:bottom center}.vpa-launcher[data-open=true]{opacity:0;pointer-events:none}}
.vpa-header{display:flex;align-items:center;gap:11px;padding:14px 12px 13px 18px;border-bottom:1px solid rgb(255 255 255/.07)}
.vpa-dot{width:7px;height:7px;border-radius:999px;background:#fe4202;box-shadow:0 0 10px #fe4202}
.vpa-title{display:flex;flex-direction:column;gap:3px;flex:1;min-width:0}
.vpa-title strong{font-family:var(--vpa-heading,var(--vpa-font,inherit));font-size:15px;font-weight:600;line-height:1.2;letter-spacing:-.015em}
.vpa-title span{font-size:12px;line-height:1.2;color:rgb(242 243 238/.5)}
.vpa-icon-button{display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:999px;border:0;background:transparent;color:rgb(242 243 238/.65);cursor:pointer;transition:background .15s,color .15s}
.vpa-icon-button:hover{background:rgb(255 255 255/.08);color:#f2f3ee}
.vpa-icon-button:focus-visible,.vpa-chip:focus-visible,.vpa-send:focus-visible,.vpa-demo-button:focus-visible{outline:2px solid #fe4202;outline-offset:2px}
.vpa-body{flex:1;min-height:0;overflow-y:auto;padding:20px 18px;display:flex;flex-direction:column;gap:18px;scrollbar-width:thin;scrollbar-color:rgb(255 255 255/.14) transparent}
.vpa-empty{margin-top:auto;display:flex;flex-direction:column;gap:8px}
.vpa-empty-title{margin:0;font-family:var(--vpa-heading,var(--vpa-font,inherit));font-size:24px;font-weight:600;line-height:1.15;letter-spacing:-.025em}
.vpa-empty-sub{margin:0 0 4px;font-size:14px;line-height:1.55;color:rgb(242 243 238/.6)}
.vpa-suggestions{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px}
.vpa-chip{border:1px solid rgb(255 255 255/.11);background:rgb(255 255 255/.02);color:rgb(242 243 238/.82);border-radius:999px;padding:8px 13px;font:inherit;font-size:13px;font-weight:500;line-height:18px;text-align:left;cursor:pointer;text-decoration:none;transition:border-color .2s,color .2s,background .2s}
.vpa-chip:hover{border-color:rgb(254 66 2/.5);background:rgb(254 66 2/.06);color:#f2f3ee}
.vpa-chip-small{padding:5px 11px;font-size:12px;line-height:16px}
.vpa-user{align-self:flex-end;max-width:85%;padding:10px 14px;border-radius:18px 6px 18px 18px;background:rgb(254 66 2/.13);font-size:14px;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere}
.vpa-answer{display:flex;flex-direction:column;gap:12px;font-size:14px;line-height:1.65;color:rgb(242 243 238/.9)}
.vpa-md{display:flex;flex-direction:column;gap:10px;overflow-wrap:anywhere}
.vpa-md p,.vpa-md ul,.vpa-md ol{margin:0}
.vpa-md p,.vpa-md li{unicode-bidi:plaintext;text-align:start}
.vpa-md ul,.vpa-md ol{padding-inline-start:18px;display:flex;flex-direction:column;gap:5px}
.vpa-md li::marker{color:rgb(242 243 238/.4)}
.vpa-md strong{font-weight:600;color:#f2f3ee}
.vpa-heading{font-weight:600;color:#f2f3ee}
.vpa-code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12.5px;padding:1px 5px;border-radius:5px;background:rgb(255 255 255/.08)}
.vpa-link{color:#ff8a5c;text-decoration:underline;text-decoration-color:rgb(255 138 92/.35);text-decoration-thickness:1px;text-underline-offset:3px;transition:text-decoration-color .15s}
.vpa-link:hover{text-decoration-color:#ff8a5c}
.vpa-status{margin:0;font-size:12.5px;color:rgb(242 243 238/.5)}
.vpa-pending{display:block;width:44px;height:10px;border-radius:999px;background:linear-gradient(90deg,rgb(255 255 255/.06),rgb(255 255 255/.18),rgb(255 255 255/.06));background-size:200% 100%;animation:vpa-shimmer 1.2s linear infinite}
@keyframes vpa-shimmer{to{background-position:-200% 0}}
.vpa-demo{display:flex;flex-direction:column;gap:12px;padding:14px;border-radius:16px;border:1px solid rgb(254 66 2/.35);background:linear-gradient(135deg,rgb(254 66 2/.14),rgb(255 166 64/.05))}
.vpa-demo div{display:flex;flex-direction:column;gap:3px}
.vpa-demo strong{font-size:14px;font-weight:600;color:#f2f3ee}
.vpa-demo span{font-size:13px;line-height:1.45;color:rgb(242 243 238/.7)}
.vpa-demo-button{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:40px;border-radius:999px;background:#fe4202;color:#010101;font-weight:600;font-size:14px;text-decoration:none;transition:filter .2s}
.vpa-demo-button:hover{filter:brightness(1.08)}
.vpa-sources{display:flex;flex-wrap:wrap;gap:6px}
.vpa-error{margin:0;padding:8px 12px;border-radius:10px;background:rgb(239 68 68/.12);color:#fca5a5;font-size:13px}
.vpa-composer{margin:0 12px 12px;border-radius:20px;border:1px solid transparent;background:linear-gradient(#141414,#141414) padding-box,linear-gradient(135deg,rgb(254 66 2/.85),rgb(255 166 64/.5) 40%,rgb(255 255 255/.1) 78%) border-box;box-shadow:0 14px 34px -14px rgb(254 66 2/.45);padding:10px 10px 8px 14px}
.vpa-composer textarea{width:100%;resize:none;border:0;outline:0;background:transparent;color:#f2f3ee;font:inherit;font-size:14px;line-height:1.5}
.vpa-composer textarea::placeholder{color:rgb(242 243 238/.38)}
.vpa-composer-foot{display:flex;align-items:center;justify-content:space-between;gap:8px}
.vpa-composer-foot span{font-size:11.5px;color:rgb(242 243 238/.42)}
.vpa-send{display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:999px;border:0;background:#fe4202;color:#010101;cursor:pointer;transition:opacity .2s}
.vpa-send:disabled{background:rgb(255 255 255/.1);color:rgb(242 243 238/.4);cursor:default}
.vpa-turnstile{display:flex;justify-content:center}
.vpa-turnstile:empty{display:none}
@media (prefers-reduced-motion:reduce){.vpa-panel,.vpa-launcher,.vpa-launcher .vpa-star{transition:none}.vpa-launcher:hover .vpa-star{transform:none}.vpa-launcher:hover .vpa-spark,.vpa-pending{animation:none}}
`;
