// Test end-to-end contro l'app in produzione: health → crea sessione → preflight CORS → PUT reale → cleanup.
// Uso:  node scripts/prod-test.mjs [https://rec-to-share.vercel.app]
import { OAuth2Client } from "google-auth-library";
import { readFileSync } from "node:fs";

const BASE = process.argv[2] || "https://rec-to-share.vercel.app";

const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].trim();
}
const log = (...a) => console.log(...a);

// 1) health
const health = await (await fetch(`${BASE}/api/health`)).json();
log("1) /api/health      →", JSON.stringify(health));

// 2) richiedi una sessione di upload (crea anche la cartella della data)
const d = new Date();
const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const upRes = await fetch(`${BASE}/api/upload-url`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ rehearsalDate: iso, fileName: "__deploy_test.txt", mimeType: "text/plain", label: "deploy-test" }),
});
const up = await upRes.json();
log("2) /api/upload-url  →", upRes.status, JSON.stringify({ folder: up.folderName, hasSession: !!up.sessionUrl, err: up.error }));
if (!up.sessionUrl) process.exit(1);

// 3) preflight CORS, come farebbe il browser del telefono
const pf = await fetch(up.sessionUrl, {
  method: "OPTIONS",
  headers: { Origin: BASE, "Access-Control-Request-Method": "PUT", "Access-Control-Request-Headers": "content-type" },
});
log("3) CORS preflight   →", pf.status,
  "| Allow-Origin:", pf.headers.get("access-control-allow-origin") || "(nessuno)",
  "| Allow-Methods:", pf.headers.get("access-control-allow-methods") || "(nessuno)");

// 4) PUT reale dei byte
const putRes = await fetch(up.sessionUrl, {
  method: "PUT",
  headers: { "Content-Type": "text/plain" },
  body: `deploy test ${new Date().toISOString()}`,
});
const put = await putRes.json().catch(() => ({}));
log("4) PUT (upload)     →", putRes.status, "| fileId:", put.id || "(nessuno)");

// 5) cleanup: cancella il file di test (la cartella della data la lasciamo)
const client = new OAuth2Client(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET);
client.setCredentials({ refresh_token: env.GOOGLE_REFRESH_TOKEN });
const { token } = await client.getAccessToken();
if (put.id) {
  const del = await fetch(`https://www.googleapis.com/drive/v3/files/${put.id}?supportsAllDrives=true`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  log("5) cleanup file     →", del.status === 204 ? "cancellato ✓" : `HTTP ${del.status}`);
}

const ok = health.ok && up.sessionUrl && putRes.status >= 200 && putRes.status < 300;
const corsOk = !!pf.headers.get("access-control-allow-origin");
log(`\n${ok ? "✅" : "❌"} Pipeline upload: ${ok ? "FUNZIONA" : "PROBLEMA"} | CORS browser: ${corsOk ? "OK ✓" : "DA VERIFICARE"}`);
