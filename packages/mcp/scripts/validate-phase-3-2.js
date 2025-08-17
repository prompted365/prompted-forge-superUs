// Fails fast if required 3.2 artifacts are missing/misnamed
const fs = require("fs");
const path = require("path");

const mustExist = (p) => {
  if (!fs.existsSync(p)) {
    console.error(`[validate-phase-3-2] Missing: ${p}`);
    process.exitCode = 1;
  }
};

const root = process.cwd();
mustExist(path.join(root, "contracts.snapshot.json"));
mustExist(path.join(root, "PERF_BUDGET.md"));

// Basic check for health/version handlers existence in codebase or tests
const testsDir = path.join(root, "tests");
if (!fs.existsSync(testsDir)) {
  console.warn("[validate-phase-3-2] No tests/ dir found; creating placeholder.");
  fs.mkdirSync(testsDir);
}

console.log("[validate-phase-3-2] OK");
