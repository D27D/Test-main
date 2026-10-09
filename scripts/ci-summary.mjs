// Escribe en el resumen del job de GitHub Actions el resultado de pruebas y la cobertura.
import { appendFileSync, existsSync, readFileSync } from "node:fs";

const label = process.argv[2] ?? "";
const lines = [`### Pruebas ${label}`, ""];

if (existsSync("reports/junit.xml")) {
  const xml = readFileSync("reports/junit.xml", "utf8");
  const attr = (name) => Number((xml.match(new RegExp(`<testsuites[^>]*\\b${name}="(\\d+)"`)) ?? [])[1] ?? 0);
  const tests = attr("tests");
  const failures = attr("failures") + attr("errors");
  lines.push(`| Pruebas | Correctas | Fallidas |`, `|---:|---:|---:|`, `| ${tests} | ${tests - failures} | ${failures} |`, "");
}

if (existsSync("coverage/coverage-summary.json")) {
  const { total } = JSON.parse(readFileSync("coverage/coverage-summary.json", "utf8"));
  lines.push(
    "| Cobertura | Líneas | Ramas | Funciones | Sentencias |",
    "|---|---:|---:|---:|---:|",
    `| total | ${total.lines.pct}% | ${total.branches.pct}% | ${total.functions.pct}% | ${total.statements.pct}% |`,
    "",
  );
}

const out = lines.join("\n");
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, out + "\n");
console.log(out);
