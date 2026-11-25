const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  createRunReport,
  recordRunEvent,
  finishRunReport,
  writeRunReport,
} = require("./run-report");

const report = createRunReport({
  platform: "instahyre",
  platformName: "Instahyre",
  mode: "dry-run",
  target: 30,
});
recordRunEvent(report, "navigation_started", {
  url: "https://example.test/jobs?q=private&token=secret#results",
});
recordRunEvent(report, "verification_required", { url: "https://example.test/captcha?token=secret" });
recordRunEvent(report, "navigation_failed", {
  message: "Navigation failed: https://example.test/jobs?q=private&token=secret",
});
recordRunEvent(report, "job_evaluated", { score: 82 });
finishRunReport(report, "blocked");

assert.strictEqual(report.outcome, "blocked");
assert.strictEqual(report.metrics.navigations, 1);
assert.strictEqual(report.metrics.verificationPrompts, 1);
assert.strictEqual(report.metrics.navigationFailures, 1);
assert.strictEqual(report.metrics.jobsEvaluated, 1);
assert.strictEqual(report.events[0].url, "https://example.test/jobs");
assert(!JSON.stringify(report).includes("secret"));
assert(!JSON.stringify(report).includes("private"));

const timedOutReport = createRunReport({
  platform: "wellfound",
  platformName: "Wellfound",
  mode: "dry-run",
  target: 50,
});
recordRunEvent(timedOutReport, "runtime_limit_reached", {
  limitMs: 100 * 60 * 1000,
});
finishRunReport(timedOutReport, "timed_out");
assert.strictEqual(timedOutReport.outcome, "timed_out");
assert.strictEqual(timedOutReport.metrics.runtimeLimitStops, 1);

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "auto-apply-run-report-"));
let reportPath;
try {
  reportPath = writeRunReport(report, tempDir);
  const saved = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  assert.strictEqual(saved.runId, report.runId);
  assert.strictEqual(saved.metrics.verificationPrompts, 1);
} finally {
  if (reportPath && fs.existsSync(reportPath)) fs.unlinkSync(reportPath);
  fs.rmdirSync(tempDir);
}

console.log("Structured run report tests passed.");
