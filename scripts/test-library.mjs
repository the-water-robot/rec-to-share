// Test end-to-end della sezione "Prove" contro un server in esecuzione.
// Crea una cartella fittizia ("1999 01 02"), verifica auto-metadati/lista/stream/round-trip, poi pulisce.
// Uso:  node scripts/test-library.mjs [http://localhost:3100]
import { OAuth2Client } from "google-auth-library";
import { readFileSync } from "node:fs";

const BASE = process.argv[2] || "http://localhost:3100";
const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].trim();
}
const client = new OAuth2Client(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET);
client.setCredentials({ refresh_token: env.GOOGLE_REFRESH_TOKEN });

const getJSON = async (u) => (await fetch(u)).json();
const postJSON = async (u, body) =>
  (await fetch(u, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })).json();

let folderId = null;
const checks = [];
const ok = (name, cond, extra = "") => {
  checks.push(cond);
  console.log(`${cond ? "✅" : "❌"} ${name}${extra ? "  " + extra : ""}`);
};

try {
  // 1) crea cartella + carica un finto mp3 tramite gli endpoint dell'app
  const up = await postJSON(`${BASE}/api/upload-url`, {
    rehearsalDate: "1999-01-02",
    fileName: "test-tone.mp3",
    mimeType: "audio/mpeg",
    origin: BASE,
  });
  folderId = up.folderId;
  ok("upload-url crea cartella + sessione", !!up.sessionUrl && !!folderId, `folder="${up.folderName}"`);

  const put = await fetch(up.sessionUrl, {
    method: "PUT",
    headers: { "Content-Type": "audio/mpeg" },
    body: new Uint8Array([0xff, 0xfb, 0x90, 0x64, 0x00, 0x0f, 0x00, 0x00]),
  });
  ok("PUT finto audio", put.status >= 200 && put.status < 300, `status=${put.status}`);

  // 2) auto-metadati creati alla creazione cartella
  const meta0 = (await getJSON(`${BASE}/api/meta?folder=${folderId}`)).meta;
  ok("metadati auto-creati (default)", meta0 && meta0.version === 1 && meta0.present.length === 0);

  // 3) lista cartelle e file
  const folders = (await getJSON(`${BASE}/api/folders`)).folders;
  ok("cartella compare in /api/folders", folders.some((f) => f.id === folderId));
  const files = (await getJSON(`${BASE}/api/files?folder=${folderId}`)).files;
  ok("file audio elencato in /api/files", files.length === 1 && files[0].mimeType.startsWith("audio/"), files[0] && files[0].name);

  // 4) stream con Range
  const st = await fetch(`${BASE}/api/stream?id=${files[0].id}`, { headers: { Range: "bytes=0-3" } });
  const buf = new Uint8Array(await st.arrayBuffer());
  ok("stream risponde con bytes (Range)", (st.status === 206 || st.status === 200) && buf.length > 0, `status=${st.status} bytes=${buf.length}`);

  // 5) round-trip metadati
  await postJSON(`${BASE}/api/meta`, {
    folder: folderId,
    meta: { present: ["pit", "dave"], paidRehearsal: { who: "pit", amount: 20 }, beers: ["marce"], mood: "pesciato", notes: "prova di test" },
  });
  const meta1 = (await getJSON(`${BASE}/api/meta?folder=${folderId}`)).meta;
  ok(
    "metadati salvati e riletti",
    meta1.present.length === 2 && meta1.paidRehearsal.who === "pit" && meta1.paidRehearsal.amount === 20 && meta1.beers[0] === "marce" && meta1.mood === "pesciato",
    JSON.stringify({ present: meta1.present, paid: meta1.paidRehearsal, beers: meta1.beers, mood: meta1.mood }),
  );

  // 6) validazione: membri/mood non validi vengono scartati
  await postJSON(`${BASE}/api/meta`, { folder: folderId, meta: { present: ["pit", "sconosciuto"], mood: "inventato" } });
  const meta2 = (await getJSON(`${BASE}/api/meta?folder=${folderId}`)).meta;
  ok("sanitize scarta valori non validi", meta2.present.length === 1 && meta2.present[0] === "pit" && meta2.mood === null);
} catch (e) {
  console.log("❌ Eccezione:", e.message);
  checks.push(false);
} finally {
  // cleanup: cestina la cartella di test (con dentro tutto)
  if (folderId) {
    try {
      const { token } = await client.getAccessToken();
      const del = await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}?supportsAllDrives=true`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log(`🧹 cleanup cartella di test → ${del.status === 204 ? "ok" : "HTTP " + del.status}`);
    } catch (e) {
      console.log("⚠️ cleanup fallito:", e.message);
    }
  }
  const passed = checks.length > 0 && checks.every(Boolean);
  console.log(`\n${passed ? "✅ TUTTO OK" : "❌ QUALCOSA NON VA"} (${checks.filter(Boolean).length}/${checks.length})`);
  process.exit(passed ? 0 : 1);
}
