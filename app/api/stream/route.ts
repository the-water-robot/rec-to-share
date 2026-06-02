import { NextRequest, NextResponse } from "next/server";
import { streamFile } from "@/lib/drive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Proxy-stream di un file di Drive verso il browser (per <audio>), inoltrando l'header Range.
// Il token resta sul server: il client riceve solo i byte.
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Parametro 'id' mancante." }, { status: 400 });
  }
  const download = req.nextUrl.searchParams.get("download");

  try {
    const upstream = await streamFile(id, req.headers.get("range"));
    if (!upstream.ok && upstream.status !== 206) {
      return NextResponse.json(
        { error: `Drive ${upstream.status}` },
        { status: upstream.status === 404 ? 404 : 502 },
      );
    }

    const headers = new Headers();
    for (const h of ["content-type", "content-length", "content-range", "accept-ranges", "last-modified", "etag"]) {
      const v = upstream.headers.get(h);
      if (v) headers.set(h, v);
    }
    if (!headers.has("accept-ranges")) headers.set("accept-ranges", "bytes");
    headers.set("cache-control", "private, max-age=3600");
    if (download) headers.set("content-disposition", "attachment");

    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore";
    console.error("[stream]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
