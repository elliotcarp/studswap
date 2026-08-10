import fs from "fs";
import path from "path";

// Legal docs live in legal/*.md at the repo root (not under src/) so they're
// easy for a non-engineer (e.g. a lawyer) to find and edit directly.
export function readLegalDoc(filename: string): string {
  return fs.readFileSync(path.join(process.cwd(), "legal", filename), "utf8");
}
