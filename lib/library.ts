// Helper lato CLIENT per la sezione "Prove" (lista cartelle, file audio, metadati, streaming).
import type { ProvaMeta } from "./band";

export interface DriveFolder {
  id: string;
  name: string;
}
export interface AudioFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
}

async function jsonOrThrow(res: Response) {
  if (!res.ok) {
    let msg = `Errore ${res.status}`;
    try {
      msg = (await res.json()).error || msg;
    } catch {
      /* corpo non JSON */
    }
    throw new Error(msg);
  }
  return res.json();
}

export async function fetchFolders(): Promise<DriveFolder[]> {
  return (await jsonOrThrow(await fetch("/api/folders"))).folders;
}

export async function fetchFiles(folder: string): Promise<AudioFile[]> {
  return (await jsonOrThrow(await fetch(`/api/files?folder=${encodeURIComponent(folder)}`))).files;
}

export async function fetchMeta(folder: string): Promise<ProvaMeta> {
  return (await jsonOrThrow(await fetch(`/api/meta?folder=${encodeURIComponent(folder)}`))).meta;
}

export async function saveMeta(folder: string, meta: ProvaMeta, pin?: string): Promise<ProvaMeta> {
  const res = await fetch("/api/meta", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder, meta, pin }),
  });
  return (await jsonOrThrow(res)).meta;
}

export function streamUrl(id: string, download = false): string {
  return `/api/stream?id=${encodeURIComponent(id)}${download ? "&download=1" : ""}`;
}
