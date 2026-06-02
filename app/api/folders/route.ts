import { NextResponse } from "next/server";
import { listRehearsalFolders } from "@/lib/drive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const folders = await listRehearsalFolders();
    return NextResponse.json({ folders });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore";
    console.error("[folders]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
