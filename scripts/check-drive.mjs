// Diagnostica: verifica che le credenziali in .env.local funzionino e che la cartella Drive sia accessibile.
// Uso:  node scripts/check-drive.mjs   (non stampa nessun segreto)
import { OAuth2Client } from "google-auth-library";
import { readFileSync } from "node:fs";

const envPath = new URL("../.env.local", import.meta.url);
const env = {};
for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].trim();
}

for (const k of ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REFRESH_TOKEN", "DRIVE_FOLDER_ID"]) {
  if (!env[k]) {
    console.log(`❌ Manca ${k} in .env.local`);
    process.exit(1);
  }
}

const client = new OAuth2Client(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET);
client.setCredentials({ refresh_token: env.GOOGLE_REFRESH_TOKEN });

try {
  const { token } = await client.getAccessToken();
  if (!token) throw new Error("nessun access token ottenuto");

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${env.DRIVE_FOLDER_ID}?fields=id,name,mimeType,capabilities(canAddChildren)&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const body = await res.json();
  if (!res.ok) {
    console.log("❌ Drive HTTP", res.status, "-", body.error?.message || JSON.stringify(body));
    process.exit(1);
  }
  console.log("✅ Token valido e access token ottenuto.");
  console.log("✅ Cartella raggiunta:", JSON.stringify({
    name: body.name,
    isFolder: body.mimeType === "application/vnd.google-apps.folder",
    canAddChildren: body.capabilities?.canAddChildren,
  }));
} catch (e) {
  console.log("❌", e.message);
  process.exit(1);
}
