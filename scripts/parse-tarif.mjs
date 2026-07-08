import * as XLSX from "xlsx";
import { readFileSync } from "node:fs";

const file = process.argv[2];
const wb = XLSX.read(readFileSync(file));
for (const name of wb.SheetNames) {
  const ws = wb.Sheets[name];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
  console.log(`\n=== Sheet: ${name} (${rows.length} rows) ===`);
  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    const row = rows[i];
    if (row && row.some((c) => c !== null)) {
      console.log(row.map((c) => (c == null ? "" : String(c).slice(0, 30))).join(" | "));
    }
  }
}
