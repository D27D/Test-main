import { createApp, VERSION } from "./app.js";

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";

const server = createApp().listen(port, host, () => {
  console.log(`test-main ${VERSION} escuchando en http://${host}:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    console.log(`${signal} recibido, cerrando servidor…`);
    server.close(() => process.exit(0));
  });
}
