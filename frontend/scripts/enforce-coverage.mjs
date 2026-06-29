import fs from 'node:fs';
import path from 'node:path';

const summaryPath = path.resolve('coverage', 'coverage-summary.json');

if (!fs.existsSync(summaryPath)) {
  console.error(`[coverage] No se encontró ${summaryPath}. Ejecuta primero vitest con --coverage.`);
  process.exit(1);
}

const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
const metrics = ['statements', 'lines', 'branches', 'functions'];

const GLOBAL_MIN = 90;
const FILE_MIN = 80;

const failures = [];

const total = summary.total;
if (!total) {
  console.error('[coverage] El reporte no incluye sección total.');
  process.exit(1);
}

for (const metric of metrics) {
  const pct = total[metric]?.pct ?? 0;
  if (pct < GLOBAL_MIN) {
    failures.push(`Global ${metric}: ${pct}% < ${GLOBAL_MIN}%`);
  }
}

for (const [file, values] of Object.entries(summary)) {
  if (file === 'total') continue;
  if (!file.includes(path.sep + 'src' + path.sep) && !file.includes('src/')) continue;

  const typed = values;
  for (const metric of metrics) {
    const pct = typed[metric]?.pct ?? 0;
    if (pct < FILE_MIN) {
      failures.push(`${file} -> ${metric}: ${pct}% < ${FILE_MIN}%`);
    }
  }
}

if (failures.length > 0) {
  console.error('[coverage] Umbrales incumplidos:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`[coverage] OK: global >= ${GLOBAL_MIN}% y cada archivo >= ${FILE_MIN}% en statements/lines/branches/functions.`);
