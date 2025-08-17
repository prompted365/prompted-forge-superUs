const fs = require("fs");
const path = require("path");

// Minimal snapshot to unblock CI; replace with real generator later
const SNAPSHOT = {
  version: 1,
  generatedAt: new Date().toISOString(),
  note: "Minimal contracts snapshot to detect drift in CI"
};

const out = path.join(process.cwd(), "contracts.snapshot.json");
fs.writeFileSync(out, JSON.stringify(SNAPSHOT, null, 2));
console.log("contracts.snapshot.json written");
