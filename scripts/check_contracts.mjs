import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contractRoot = path.join(root, "contracts");
const required = fs
  .readdirSync(contractRoot, { recursive: true })
  .filter((entry) => entry.endsWith(".schema.json"))
  .map((entry) => path.join("contracts", entry))
  .sort();

for (const relative of required) {
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) {
    throw new Error(`Missing contract: ${relative}`);
  }
  const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  if (parsed.$schema === undefined || parsed.schema_version === undefined) {
    throw new Error(`Contract must declare $schema and schema_version: ${relative}`);
  }
}

console.log(`Validated ${required.length} JSON contracts.`);
