import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const required = [
  "contracts/http/health-response.schema.json",
  "contracts/http/error-response.schema.json",
  "contracts/events/event-envelope.schema.json",
  "contracts/avatar/avatar-manifest.schema.json",
  "contracts/skills/skill-manifest.schema.json"
];

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
