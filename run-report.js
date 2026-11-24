const fs = require("fs");
const path = require("path");

const METRIC_BY_EVENT = {
  navigation_started: "navigations",
  page_diagnostic: "pageDiagnostics",
  job_evaluated: "jobsEvaluated",
  job_eligible: "eligibleJobs",
  application_detected: "applicationsDetected",
  application_confirmed: "confirmedApplications",
  dry_run_application: "dryRunApplications",
  login_required: "loginPrompts",
  verification_required: "verificationPrompts",
  navigation_failed: "navigationFailures",
  page_error: "pageErrors",
  request_failed: "requestFailures",
  injection_failed: "injectionFailures",
};

function safeUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    return "";
  }
}

function safeText(value) {
  return String(value)
    .split("\n", 1)[0]
    .replace(/https?:\/\/[^\s"'<>]+/g, (url) => safeUrl(url))
    .slice(0, 500);
}

function createRunReport({ platform, platformName, mode, target }) {
  const startedAt = new Date();
  const timestamp = startedAt.toISOString().replace(/[:.]/g, "-");
  return {
    schemaVersion: 1,
    runId: `${platform}-${timestamp}-${process.pid}`,
    platform,
    platformName,
    mode,
    target,
    outcome: "running",
    startedAt: startedAt.toISOString(),
    finishedAt: null,
    durationMs: null,
    metrics: {
      navigations: 0,
      pageDiagnostics: 0,
      jobsEvaluated: 0,
      eligibleJobs: 0,
      applicationsDetected: 0,
      confirmedApplications: 0,
      dryRunApplications: 0,
      loginPrompts: 0,
      verificationPrompts: 0,
      navigationFailures: 0,
      pageErrors: 0,
      requestFailures: 0,
      injectionFailures: 0,
    },
    events: [],
  };
}

function recordRunEvent(report, type, details = {}) {
  if (!report || !report.metrics) {
    throw new TypeError("A valid run report is required");
  }
  const metric = METRIC_BY_EVENT[type];
  if (metric) report.metrics[metric]++;

  const event = { timestamp: new Date().toISOString(), type };
  for (const [key, value] of Object.entries(details)) {
    if (value == null) continue;
    event[key] =
      key === "url" || key === "searchUrl"
        ? safeUrl(value)
        : typeof value === "string"
          ? safeText(value)
          : value;
  }
  report.events.push(event);
  return event;
}

function finishRunReport(report, outcome) {
  if (!["completed", "blocked", "failed"].includes(outcome)) {
    throw new TypeError(`Invalid run outcome: ${outcome}`);
  }
  const finishedAt = new Date();
  report.outcome = outcome;
  report.finishedAt = finishedAt.toISOString();
  report.durationMs = Math.max(
    0,
    finishedAt.getTime() - Date.parse(report.startedAt),
  );
  return report;
}

function writeRunReport(report, directory = path.join(__dirname, "run-reports")) {
  fs.mkdirSync(directory, { recursive: true });
  const destination = path.join(directory, `${report.runId}.json`);
  const temporary = `${destination}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(report, null, 2), {
    encoding: "utf8",
    flag: "wx",
  });
  fs.renameSync(temporary, destination);
  return destination;
}

module.exports = {
  createRunReport,
  recordRunEvent,
  finishRunReport,
  writeRunReport,
};
