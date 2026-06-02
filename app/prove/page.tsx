"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchFolders, fetchMeta, type DriveFolder } from "@/lib/library";
import { moodById, type ProvaMeta } from "@/lib/band";

export default function ProveList() {
  const [folders, setFolders] = useState<DriveFolder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [metas, setMetas] = useState<Record<string, ProvaMeta>>({});

  useEffect(() => {
    fetchFolders()
      .then((fs) => {
        setFolders(fs);
        // riassunti metadati in parallelo (mood + presenti)
        fs.forEach((f) =>
          fetchMeta(f.id)
            .then((m) => setMetas((prev) => ({ ...prev, [f.id]: m })))
            .catch(() => {}),
        );
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Errore"));
  }, []);

  return (
    <main className="pb-tabbar mx-auto flex min-h-[100dvh] max-w-md flex-col gap-4 px-4 pt-6">
      <header className="flex items-center gap-3">
        <img src="/icons/icon.svg" alt="" width={40} height={40} className="rounded-xl" />
        <div>
          <h1 className="font-display text-2xl font-bold leading-tight">Prove</h1>
          <p className="text-sm text-sand/60">Ascolta e annota le prove</p>
        </div>
      </header>

      {error && (
        <p className="card border-coral/40 bg-coral/10 p-4 text-sm text-coral">{error}</p>
      )}
      {folders === null && !error && <p className="text-sm text-sand/50">Carico…</p>}
      {folders && folders.length === 0 && (
        <p className="card p-5 text-sm text-sand/60">
          Ancora nessuna prova. Vai su <b>Carica</b> per iniziare.
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {folders?.map((f) => {
          const m = metas[f.id];
          const mood = m ? moodById(m.mood) : null;
          return (
            <li key={f.id}>
              <Link
                href={`/prove/${f.id}?d=${encodeURIComponent(f.name)}`}
                className="card flex items-center gap-3 p-4 transition active:scale-[0.99]"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet/30 to-sky/20 text-lg">
                  {mood ? mood.emoji : "🎶"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base font-semibold">{f.name}</p>
                  <p className="text-xs text-sand/50">
                    {m
                      ? m.present.length
                        ? `${m.present.length} presenti`
                        : "presenze non segnate"
                      : "…"}
                    {mood ? ` · ${mood.label}` : ""}
                  </p>
                </div>
                <ChevronGlyph />
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}

function ChevronGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-sand/30">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
