import { promises as fs } from "node:fs";
import { NextResponse } from "next/server";

import { source } from "@/lib/source";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug?: string[] }> },
) {
  const { slug } = await params;
  const page = source.getPage(slug);
  if (!page?.absolutePath) {
    return new NextResponse("Not found", { status: 404 });
  }

  const content = await fs.readFile(page.absolutePath, "utf-8");
  return new NextResponse(content, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}

export function generateStaticParams() {
  return source.generateParams();
}
