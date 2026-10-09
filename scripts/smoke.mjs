// Prueba de arranque multiplataforma: inicia dist/server.js, espera /health y lo detiene.
import { spawn } from "node:child_process";

const port = process.env.SMOKE_PORT ?? "3999";
const url = `http://127.0.0.1:${port}/health`;
const server = spawn(process.execPath, ["dist/server.js"], {
  env: { ...process.env, PORT: port, HOST: "127.0.0.1" },
  stdio: "inherit",
});

let ok = false;
for (let i = 0; i < 30 && !ok; i++) {
  await new Promise((r) => setTimeout(r, 500));
  try {
    const res = await fetch(url);
    const body = await res.json();
    ok = res.ok && body.status === "ok";
    if (ok) console.log(`Arranque correcto: ${JSON.stringify(body)}`);
  } catch {
    // el servidor aún no acepta conexiones
  }
}
server.kill();
if (!ok) {
  console.error(`El servidor no respondió en ${url}`);
  process.exit(1);
}
