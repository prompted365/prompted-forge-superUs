// Log-only perf budget; never fails the build yet
const budget = {
  mcpOverhead: { p50: "<=5ms", p95: "<=15ms" },
  enforced: false
};
console.log("[perf] PERF_BUDGET", JSON.stringify(budget));
