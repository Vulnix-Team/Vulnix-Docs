"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Check, ChevronDown, Copy, ExternalLink, FileText } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "fumadocs-ui/components/ui/popover";
import { useCopyButton } from "fumadocs-ui/utils/use-copy-button";

import { cn } from "@/lib/utils";

const buttonClass =
  "inline-flex items-center gap-2 rounded-md border border-fd-border bg-fd-secondary px-2.5 py-1.5 text-sm text-fd-secondary-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground [&_svg]:size-3.5 [&_svg]:text-fd-muted-foreground";

export function MarkdownCopyButton({ markdownUrl }: { markdownUrl: string }) {
  const [isLoading, setLoading] = useState(false);
  const [checked, onClick] = useCopyButton(async () => {
    setLoading(true);
    try {
      const text = await fetch(markdownUrl).then((res) => res.text());
      await navigator.clipboard.writeText(text);
    } finally {
      setLoading(false);
    }
  });

  return (
    <button type="button" disabled={isLoading} onClick={onClick} className={buttonClass}>
      {checked ? <Check /> : <Copy />}
      Copy Markdown
    </button>
  );
}

interface ViewOption {
  title: string;
  href: string;
  icon: React.ReactNode;
}

export function ViewOptionsPopover({
  markdownUrl,
  githubUrl,
}: {
  markdownUrl: string;
  githubUrl?: string;
}) {
  const pathname = usePathname();

  const items = useMemo<ViewOption[]>(() => {
    const pageUrl =
      typeof window === "undefined" ? pathname : new URL(pathname, window.location.origin).toString();
    const q = `Read ${pageUrl}, I want to ask questions about it.`;

    const options: (ViewOption | undefined)[] = [
      githubUrl
        ? {
            title: "Open in GitHub",
            href: githubUrl,
            icon: <GitHubIcon />,
          }
        : undefined,
      {
        title: "View as Markdown",
        href: markdownUrl,
        icon: <FileText />,
      },
      {
        title: "Open in Scira AI",
        href: `https://scira.ai/?${new URLSearchParams({ q })}`,
        icon: <SciraIcon />,
      },
      {
        title: "Open in ChatGPT",
        href: `https://chatgpt.com/?${new URLSearchParams({ prompt: q, hints: "search" })}`,
        icon: <ChatGPTIcon />,
      },
      {
        title: "Open in Claude",
        href: `https://claude.ai/new?${new URLSearchParams({ q })}`,
        icon: <ClaudeIcon />,
      },
      {
        title: "Open in Cursor",
        href: `https://cursor.com/link/prompt?${new URLSearchParams({ text: q })}`,
        icon: <CursorIcon />,
      },
    ];

    return options.filter((option): option is ViewOption => Boolean(option));
  }, [githubUrl, markdownUrl, pathname]);

  return (
    <Popover>
      <PopoverTrigger className={cn(buttonClass, "data-[state=open]:bg-fd-accent data-[state=open]:text-fd-accent-foreground")}>
        Open
        <ChevronDown className="size-3.5 text-fd-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="flex flex-col">
        {items.map((item) => (
          <a
            key={item.href}
            href={item.href}
            rel="noreferrer noopener"
            target="_blank"
            className="inline-flex items-center gap-2 rounded-lg p-2 text-sm hover:bg-fd-accent hover:text-fd-accent-foreground [&_svg]:size-4"
          >
            {item.icon}
            {item.title}
            <ExternalLink className="ms-auto size-3.5 text-fd-muted-foreground" />
          </a>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function GitHubIcon() {
  return (
    <svg fill="currentColor" role="img" viewBox="0 0 24 24">
      <title>GitHub</title>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

function SciraIcon() {
  return (
    <svg viewBox="0 0 910 934" fill="none" xmlns="http://www.w3.org/2000/svg">
      <title>Scira AI</title>
      <path
        d="M647.664 197.775C569.13 189.049 525.5 145.419 516.774 66.8849C508.048 145.419 464.418 189.049 385.884 197.775C464.418 206.501 508.048 250.131 516.774 328.665C525.5 250.131 569.13 206.501 647.664 197.775Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinejoin="round"
      />
      <path
        d="M857.5 508.116C763.259 497.644 710.903 445.288 700.432 351.047C689.961 445.288 637.605 497.644 543.364 508.116C637.605 518.587 689.961 570.943 700.432 665.184C710.903 570.943 763.259 518.587 857.5 508.116Z"
        stroke="currentColor"
        strokeWidth="20"
        strokeLinejoin="round"
      />
      <path
        d="M889.949 121.237C831.049 114.692 798.326 81.9698 791.782 23.0692C785.237 81.9698 752.515 114.692 693.614 121.237C752.515 127.781 785.237 160.504 791.782 219.404C798.326 160.504 831.049 127.781 889.949 121.237Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChatGPTIcon() {
  return (
    <svg role="img" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <title>OpenAI</title>
      <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
    </svg>
  );
}

function ClaudeIcon() {
  return (
    <svg fill="currentColor" role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <title>Anthropic</title>
      <path d="M17.3041 3.541h-3.6718l6.696 16.918H24Zm-10.6082 0L0 20.459h3.7442l1.3693-3.5527h7.0052l1.3693 3.5528h3.7442L10.5363 3.5409Zm-.3712 10.2232 2.2914-5.9456 2.2914 5.9456Z" />
    </svg>
  );
}

function CursorIcon() {
  return (
    <svg fill="currentColor" role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <title>Cursor</title>
      <path d="M11.503.131 1.891 5.678a.84.84 0 0 0-.42.726v11.188c0 .3.162.575.42.724l9.609 5.55a1 1 0 0 0 .998 0l9.61-5.55a.84.84 0 0 0 .42-.724V6.404a.84.84 0 0 0-.42-.726L12.497.131a1.01 1.01 0 0 0-.996 0M2.657 6.338h18.55c.263 0 .43.287.297.515L12.23 22.918c-.062.107-.229.064-.229-.06V12.335a.59.59 0 0 0-.295-.51l-9.11-5.257c-.109-.063-.064-.23.061-.23" />
    </svg>
  );
}
