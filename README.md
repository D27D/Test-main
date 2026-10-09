# Test-main

API de gestión de tareas (Node.js + TypeScript + Express) con un **pipeline CI/CD en GitHub Actions** que, ante cada cambio del repositorio y sin pasos manuales:

1. **Compila y prueba** el proyecto en **Windows y Ubuntu** (Node 22 y 24).
2. **Construye la imagen Docker** y la prueba como contenedor.
3. **Publica la imagen en GitHub Container Registry (GHCR)**.
4. Ejecuta un **análisis de seguridad dinámico con OWASP ZAP** sobre la imagen publicada.

## Pipeline

Archivo: [`.github/workflows/ci-cd.yml`](.github/workflows/ci-cd.yml)

```
                ┌─ Compilación y pruebas · ubuntu-latest  · Node 22 ─┐
 push / PR ───► ├─ Compilación y pruebas · ubuntu-latest  · Node 24 ─┤
                ├─ Compilación y pruebas · windows-latest · Node 22 ─┼──► Imagen Docker y ──► Análisis de seguridad
                └─ Compilación y pruebas · windows-latest · Node 24 ─┘    publicación GHCR      OWASP ZAP
```

| Etapa (job) | Qué hace | Resultado visible en Actions |
|---|---|---|
| `build-test` (matriz 2 SO × 2 versiones de Node) | `npm ci` → verificación de tipos → `tsc` → 9 pruebas Vitest con cobertura (umbral 80 %) → prueba de arranque del servidor | Resumen con pruebas y cobertura; artefactos `test-reports-*` (JUnit + lcov) |
| `docker` | Buildx con caché de GitHub, etiquetas OCI (`latest`, `main`, `sha-xxxxxxx`, `vX.Y.Z`), prueba del contenedor (salud, API, usuario no root), `docker push` a `ghcr.io/<usuario>/<repo>` | Resumen con digest y etiquetas; artefacto `docker-image` |
| `zap` | Carga la misma imagen probada, la levanta y ejecuta `zaproxy/action-baseline` con las reglas de [`.zap/rules.tsv`](.zap/rules.tsv) | Resumen del escaneo; artefacto `zap-report` (HTML, JSON, Markdown) |

**Disparadores:** push a `main`, tags `v*.*.*`, pull requests a `main` y ejecución manual (*Run workflow*). En pull requests se construye y escanea la imagen, pero **no se publica**.

**Política de seguridad de ZAP:** las reglas marcadas `FAIL` (falta de CSP, de anti-clickjacking, de `X-Content-Type-Options` o exposición de `X-Powered-By`) detienen el pipeline; las `WARN` quedan en el informe sin bloquear. La app envía estas cabeceras con Helmet y las pruebas lo verifican.

**Mantenimiento:** [`.github/dependabot.yml`](.github/dependabot.yml) propone semanalmente actualizaciones de npm, de las acciones y de la imagen base.

## Publicar el proyecto y ver la ejecución

```bash
git init -b main          # si aún no es un repositorio
git add . && git commit -m "Pipeline CI/CD"
git remote add origin https://github.com/<usuario>/Test.git
git push -u origin main
```

Luego en GitHub: **Actions → CI/CD → la ejecución más reciente**. El grafo muestra los 4 jobs de la matriz, `Imagen Docker y publicación en GHCR` y `Análisis de seguridad OWASP ZAP`. La imagen aparece en **Packages** del perfil (si quieres descargarla sin autenticación, cambia la visibilidad del paquete a pública).

No hay que configurar secretos: el pipeline usa el `GITHUB_TOKEN` automático con permiso `packages: write` solo en el job de publicación.

Para generar una versión etiquetada:

```bash
git tag v1.0.0 && git push origin v1.0.0     # publica :1.0.0, :1.0 y :sha-xxxxxxx
```

## Desarrollo local

```bash
npm ci
npm run dev          # http://localhost:3000 con recarga automática
npm run build        # compila a dist/
npm test             # pruebas
npm run test:ci      # pruebas + cobertura + reporte JUnit
npm run smoke        # arranca dist/server.js y verifica /health

docker build -t test-main .
docker run --rm -p 3000:3000 test-main
```

## API

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | Estado y versión |
| GET | `/api/tasks` | Lista de tareas y estadísticas |
| POST | `/api/tasks` | Crea `{ "title": "…", "done": false }` |
| GET | `/api/tasks/:id` | Obtiene una tarea |
| PATCH | `/api/tasks/:id` | Modifica `title` y/o `done` |
| DELETE | `/api/tasks/:id` | Elimina una tarea |

La raíz `/` sirve una interfaz web simple para gestionar las tareas.

## Estructura

```
Test-main/
├── .github/
│   ├── workflows/ci-cd.yml   # pipeline
│   └── dependabot.yml
├── .zap/rules.tsv            # política del escaneo OWASP ZAP
├── src/                      # app.ts (Express + Helmet), tasks.ts, server.ts
├── public/                   # interfaz web estática
├── tests/                    # Vitest + Supertest
├── scripts/                  # smoke.mjs, ci-summary.mjs
├── Dockerfile                # multi-etapa, usuario no root, HEALTHCHECK
└── package.json
```
