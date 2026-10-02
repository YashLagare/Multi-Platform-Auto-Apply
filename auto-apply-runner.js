/**
 * Multi-Platform Auto-Apply Runner â€” Playwright Stealth Automation Suite
 * Supports: Wellfound (wellfound.com), Instahyre (instahyre.com), Foundit (foundit.in), Naukri (naukri.com)
 *
 * Usage:
 *   # Wellfound
 *   node auto-apply-runner.js wellfound login
 *   node auto-apply-runner.js wellfound
 *   node auto-apply-runner.js wellfound --live
 *
 *   # Instahyre
 *   node auto-apply-runner.js instahyre login
 *   node auto-apply-runner.js instahyre
 *   node auto-apply-runner.js instahyre --live
 *
 *   # Foundit
 *   node auto-apply-runner.js foundit login
 *   node auto-apply-runner.js foundit
 *   node auto-apply-runner.js foundit --live
 *
 *   # Naukri
 *   node auto-apply-runner.js naukri login
 *   node auto-apply-runner.js naukri
 *   node auto-apply-runner.js naukri --live
 */
const path = require("path");
const fs = require("fs");
const { CV, geminiKey } = require("./config");

let chromium;
try {
  const { addExtra } = require("playwright-extra");
  chromium = addExtra(require("playwright-core").chromium);
  chromium.use(require("puppeteer-extra-plugin-stealth")());
} catch (e) {
  ({ chromium } = require("playwright-core"));
}

process.on("unhandledRejection", (e) =>
  console.log(
    `[${new Date().toLocaleString()}] unhandledRejection (ignored): ${String((e && e.message) || e).split("\n")[0]}`,
  ),
);
process.on("uncaughtException", (e) =>
  console.log(
    `[${new Date().toLocaleString()}] uncaughtException (ignored): ${String((e && e.message) || e).split("\n")[0]}`,
  ),
);

const SITE_ARG = (process.argv[2] || "wellfound").toLowerCase();
const LOGIN_MODE = process.argv.includes("login");
const LIVE = process.argv.includes("--live");

const SITES = {
  wellfound: {
    name: "Wellfound",
    script: "wellfound-auto-apply.js",
    profile: ".wellfound-chrome-profile",
    searches: ["https://wellfound.com/jobs"],
    loginUrl: "https://wellfound.com/login",
    injectOn: (url) => /wellfound\.com/.test(url),
    submittedRe: /application sent|DRY_RUN — would click/i,
    dailyCap: 50,
  },
  instahyre: {
    name: "Instahyre",
    script: "instahyre-auto-apply.js",
    profile: ".instahyre-chrome-profile",
    searches: ["https://www.instahyre.com/candidate/opportunities/"],
    loginUrl: "https://www.instahyre.com/login",
    injectOn: (url) => /instahyre\.com\/candidate\/opportunities/.test(url),
    submittedRe:
      /application submitted|1-Click Apply submitted|DRY_RUN — would click/i,
    dailyCap: 30,
  },
  foundit: {
    name: "Foundit",
    script: "foundit-auto-apply.js",
    profile: ".foundit-chrome-profile",
    searches: [
      "https://www.foundit.in/srp/results?query=react+developer&experienceRanges=0~3&sort=1",
      "https://www.foundit.in/srp/results?query=frontend+developer&experienceRanges=0~3&sort=1",
      "https://www.foundit.in/srp/results?query=full+stack+developer&experienceRanges=0~3&sort=1",
      "https://www.foundit.in/srp/results?query=next.js+developer&experienceRanges=0~3&sort=1",
      "https://www.foundit.in/srp/results?query=javascript+developer&experienceRanges=0~3&sort=1",
      "https://www.foundit.in/srp/results?query=mern+stack+developer&experienceRanges=0~3&sort=1",
      "https://www.foundit.in/srp/results?query=software+engineer&experienceRanges=0~3&sort=1",
    ],
    loginUrl:
      "https://www.foundit.in/rio/login?return_url=%2Fseeker%2Fprofile%3Fviewport%3Ddesktop",
    injectOn: (url) => /foundit\.in\/(?:srp|job)/.test(url),
    submittedRe:
      /application submitted|Quick Apply submitted|DRY_RUN — would click/i,
    dailyCap: 30,
  },
  naukri: {
    name: "Naukri",
    script: "naukri-auto-apply.js",
    profile: ".naukri-chrome-profile",
    searches: [
      "https://www.naukri.com/react-js-developer-jobs?experience=0&experience=1&experience=2&experience=3",
      "https://www.naukri.com/frontend-developer-jobs?experience=0&experience=1&experience=2&experience=3",
      "https://www.naukri.com/full-stack-developer-jobs?experience=0&experience=1&experience=2&experience=3",
      "https://www.naukri.com/next-js-developer-jobs?experience=0&experience=1&experience=2&experience=3",
      "https://www.naukri.com/javascript-developer-jobs?experience=0&experience=1&experience=2&experience=3",
      "https://www.naukri.com/mern-stack-developer-jobs?experience=0&experience=1&experience=2&experience=3",
      "https://www.naukri.com/software-engineer-jobs?experience=0&experience=1&experience=2&experience=3",
      "https://www.naukri.com/web-developer-jobs?experience=0&experience=1&experience=2&experience=3",
    ],
    loginUrl: "https://www.naukri.com/nlogin/login",
    injectOn: (url) => /naukri\.com/.test(url),
    submittedRe:
      /application submitted|Direct 1-Click Apply submitted|DRY_RUN — would click/i,
    dailyCap: 30,
  },
  cutshort: {
    name: "Cutshort",
    script: "cutshort-auto-apply.js",
    profile: ".cutshort-chrome-profile",
    searches: [
      "https://cutshort.io/jobs/react-jobs",
      "https://cutshort.io/jobs/frontend-developer-jobs",
      "https://cutshort.io/jobs/full-stack-developer-jobs",
      "https://cutshort.io/jobs/javascript-jobs",
      "https://cutshort.io/jobs/nextjs-jobs",
      "https://cutshort.io/candidate/discover",
    ],
    loginUrl: "https://cutshort.io/login",
    injectOn: (url) => /cutshort\.io/.test(url),
    submittedRe:
      /Cutshort Application submitted|application submitted|DRY_RUN — would click/i,
    dailyCap: 30,
  },
  hirist: {
    name: "Hirist",
    script: "hirist-auto-apply.js",
    profile: ".hirist-chrome-profile",
    searches: [
      "https://www.hirist.tech/c/react-js-jobs.html?exp=0-3",
      "https://www.hirist.tech/c/frontend-development-jobs.html?exp=0-3",
      "https://www.hirist.tech/c/full-stack-development-jobs.html?exp=0-3",
      "https://www.hirist.tech/c/javascript-jobs.html?exp=0-3",
      "https://www.hirist.tech/c/node-js-jobs.html?exp=0-3",
    ],
    loginUrl: "https://www.hirist.tech/login",
    injectOn: (url) => /hirist\.tech/.test(url),
    submittedRe:
      /Hirist Application submitted|application submitted|DRY_RUN — would click/i,
    dailyCap: 30,
  },
  yc: {
    name: "YC Work at a Startup",
    script: "yc-auto-apply.js",
    profile: ".yc-chrome-profile",
    searches: [
      "https://www.workatastartup.com/jobs?roles=frontend,fullstack&role=Frontend%20Engineer&role=Full%20Stack%20Engineer",
    ],
    loginUrl:
      "https://account.ycombinator.com/?continue=https%3A%2F%2Fwww.workatastartup.com%2F",
    injectOn: (url) => /workatastartup\.com/.test(url),
    submittedRe:
      /YC Application submitted|application sent|DRY_RUN — would click/i,
    dailyCap: 25,
  },
  indeed: {
    name: "Indeed",
    script: "indeed-auto-apply.js",
    profile: ".indeed-chrome-profile",
    searches: [
      "https://in.indeed.com/jobs?q=react+developer&l=India&sc=0kf%3Aattr%28DS3S6%29%3B",
      "https://in.indeed.com/jobs?q=frontend+developer&l=India&sc=0kf%3Aattr%28DS3S6%29%3B",
      "https://in.indeed.com/jobs?q=full+stack+developer&l=India&sc=0kf%3Aattr%28DS3S6%29%3B",
      "https://in.indeed.com/jobs?q=next.js+developer&l=India&sc=0kf%3Aattr%28DS3S6%29%3B",
      "https://in.indeed.com/jobs?q=javascript+developer&l=India&sc=0kf%3Aattr%28DS3S6%29%3B",
    ],
    loginUrl: "https://secure.indeed.com/auth",
    injectOn: (url) => /indeed\.com/.test(url),
    submittedRe:
      /Indeed Application submitted|application submitted|DRY_RUN — would click/i,
    dailyCap: 25,
  },
  linkedin: {
    name: "LinkedIn",
    script: "linkedin-auto-apply.js",
    profile: ".linkedin-chrome-profile",
    searches: [
      "https://www.linkedin.com/jobs/search/?keywords=react%20developer&location=India&f_AL=true&f_E=2%2C3",
      "https://www.linkedin.com/jobs/search/?keywords=frontend%20developer&location=India&f_AL=true&f_E=2%2C3",
      "https://www.linkedin.com/jobs/search/?keywords=full%20stack%20developer&location=India&f_AL=true&f_E=2%2C3",
      "https://www.linkedin.com/jobs/search/?keywords=next.js%20developer&location=India&f_AL=true&f_E=2%2C3",
      "https://www.linkedin.com/jobs/search/?keywords=javascript%20developer&location=India&f_AL=true&f_E=2%2C3",
    ],
    loginUrl: "https://www.linkedin.com/login",
    injectOn: (url) => /linkedin\.com\/jobs/.test(url),
    submittedRe:
      /LinkedIn Easy Apply submitted|application submitted|DRY_RUN — would click/i,
    dailyCap: 20,
  },
};

const site = SITES[SITE_ARG];
if (!site) {
  console.log(
    "Usage: node auto-apply-runner.js <wellfound|instahyre|foundit|naukri|cutshort|hirist|yc|indeed|linkedin> [login|--live]",
  );
  process.exit(1);
}

// ======== Persistent Job ID Database ========
const APPLIED_DB_FILE = path.join(__dirname, `applied-jobs-${SITE_ARG}.json`);
const CSV_FILE = path.join(__dirname, "applications.csv");

function loadAppliedDatabase() {
  let db = { appliedIds: {} };
  try {
    if (fs.existsSync(APPLIED_DB_FILE)) {
      db = JSON.parse(
        fs.readFileSync(APPLIED_DB_FILE, "utf8").replace(/^ï»¿/, ""),
      );
    }
  } catch (e) {}

  // Seed from applications.csv if present
  try {
    if (fs.existsSync(CSV_FILE)) {
      const lines = fs.readFileSync(CSV_FILE, "utf8").split(/\r?\n/);
      for (const line of lines) {
        if (line.includes(`"${SITE_ARG}"`)) {
          const m =
            line.match(/\/jobs\/(\d+)/) || line.match(/https?:\/\/[^\s",]+/);
          if (m && m[1]) {
            db.appliedIds[m[1]] = db.appliedIds[m[1]] || {
              date: "historical",
              source: "csv",
            };
          }
        }
      }
    }
  } catch (e) {}

  return db;
}

function getJobLink(jobId, explicitLink) {
  if (explicitLink) return explicitLink;
  switch (SITE_ARG) {
    case "wellfound":
      return `https://wellfound.com/jobs/${jobId}`;
    case "instahyre":
      return `https://www.instahyre.com/candidate/opportunities/${jobId}`;
    case "foundit":
      return `https://www.foundit.in/job/${jobId}`;
    case "naukri":
      return `https://www.naukri.com/job-listings-${jobId}`;
    case "cutshort":
      return `https://cutshort.io/job/${jobId}`;
    case "hirist":
      return `https://www.hirist.tech/j/${jobId}.html`;
    case "yc":
      return `https://www.workatastartup.com/jobs/${jobId}`;
    case "indeed":
      return `https://in.indeed.com/viewjob?jk=${jobId}`;
    case "linkedin":
      return `https://www.linkedin.com/jobs/view/${jobId}/`;
    default:
      return "";
  }
}

const appliedDb = loadAppliedDatabase();
function recordAppliedJob(jobId, jobData) {
  if (!jobId) return;
  appliedDb.appliedIds[jobId] = {
    date: new Date().toLocaleString(),
    title: jobData.title || "",
    company: jobData.company || "",
    score: jobData.score || "",
    breakdown: jobData.breakdown || "",
    link: getJobLink(jobId, jobData.link),
  };
  try {
    fs.writeFileSync(APPLIED_DB_FILE, JSON.stringify(appliedDb, null, 2));
  } catch (e) {
    console.error("Failed to write applied DB:", e.message);
  }
}

// Daily Cap Tracking
const DAILY_CAP = site.dailyCap || 30;
const STATE_FILE = path.join(__dirname, `apply-state-${SITE_ARG}.json`);
const todayKey = new Date().toDateString();
let dayState = { date: todayKey, count: 0 };
try {
  const s = JSON.parse(fs.readFileSync(STATE_FILE, "utf8").replace(/^ï»¿/, ""));
  if (s.date === todayKey) dayState = s;
} catch (e) {}
const bumpDayCount = () => {
  dayState.count++;
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(dayState));
  } catch (e) {}
};
const TARGET = DAILY_CAP - dayState.count;
const MAX_RUNTIME_MS = 100 * 60 * 1000;

const log = (msg) =>
  console.log(`[${new Date().toLocaleString()}] [${SITE_ARG}] ${msg}`);

// CSV Logging
const SKILLS = [
  "JavaScript",
  "TypeScript",
  "Python",
  "React",
  "Next.js",
  "Node.js",
  "Express",
  "MongoDB",
  "PostgreSQL",
  "Prisma",
  "Drizzle",
  "REST",
  "Tailwind",
  "Redux",
  "Zustand",
  "Docker",
  "AWS",
  "Gemini",
];
const matchSkills = (t) => {
  const l = (t || "").toLowerCase();
  return SKILLS.filter((s) => l.includes(s.toLowerCase())).join("; ");
};
const csvRow = (vals) =>
  vals
    .map(
      (v) =>
        '"' +
        String(v || "")
          .replace(/"/g, '""')
          .replace(/\s+/g, " ")
          .trim() +
        '"',
    )
    .join(",") + "\n";

function logApplication(job) {
  if (!fs.existsSync(CSV_FILE)) {
    fs.writeFileSync(
      CSV_FILE,
      "ï»¿" +
        csvRow([
          "Date",
          "Site",
          "Role",
          "Company",
          "CTC/Salary",
          "Skills",
          "Match Score",
          "Job Link",
          "Job Description",
        ]),
    );
  }
  fs.appendFileSync(
    CSV_FILE,
    csvRow([
      new Date().toLocaleString(),
      SITE_ARG,
      job.title,
      job.company,
      job.salary || job.ctc || "",
      job.skills ||
        matchSkills(job.title + " " + (job.jd || job.description || "")),
      job.score ? `${job.score}/100` : "",
      getJobLink(job.id, job.link),
      (job.jd || job.description || "").slice(0, 1200),
    ]),
  );
}

// Injected Script Builder
function buildInjection() {
  const raw = fs
    .readFileSync(path.join(__dirname, site.script), "utf8")
    .replace(/DRY_RUN: true/, `DRY_RUN: ${!LIVE}`)
    .replace(/MAX_APPLICATIONS: \d+/, `MAX_APPLICATIONS: ${TARGET}`);

  return `(async () => {
    if (window.__aaBusy) return; window.__aaBusy = true;
    window.__APPLY_CONFIG = ${JSON.stringify({ CV, geminiKey, appliedJobIds: appliedDb.appliedIds })};
    try { await ${raw}
    } finally { window.__aaBusy = false; }
  })()`;
}

(async () => {
  if (LOGIN_MODE) {
    const { spawn } = require("child_process");
    const profilePath = path.resolve(__dirname, site.profile);
    const chromePaths = [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      path.join(
        process.env.LOCALAPPDATA || "",
        "Google\\Chrome\\Application\\chrome.exe",
      ),
    ];
    const chromeExe = chromePaths.find((p) => fs.existsSync(p)) || "chrome";

    log(`Opening Native Chrome for ${site.name} login...`);
    log(`Profile Directory: ${profilePath}`);
    log(
      `👉 Log in with Google or Mobile/Email + OTP / Password. When finished, CLOSE the browser window.`,
    );

    const chromeProcess = spawn(
      chromeExe,
      [
        `--user-data-dir=${profilePath}`,
        "--no-first-run",
        "--no-default-browser-check",
        "--start-maximized",
        site.loginUrl,
      ],
      { stdio: "ignore", detached: false },
    );

    await new Promise((resolve) => {
      chromeProcess.on("exit", resolve);
      chromeProcess.on("close", resolve);
    });

    log(`✅ Login window closed. Session saved to ${site.profile}!`);
    log(
      `Now test your automated applications with: npm run dry-run:${SITE_ARG}`,
    );
    return;
  }

  if (TARGET <= 0) {
    log(
      `Daily cap of ${DAILY_CAP} applications reached (${dayState.count} today) — exiting.`,
    );
    return;
  }

  const ctx = await chromium.launchPersistentContext(
    path.join(__dirname, site.profile),
    {
      channel: "chrome",
      headless: false,
      viewport: { width: 1280, height: 900 },
      ignoreDefaultArgs: ["--enable-automation"],
      args: [
        "--disable-blink-features=AutomationControlled",
        "--no-default-browser-check",
        "--no-first-run",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
        "--disable-popup-blocking",
        "--window-position=-32000,-32000",
      ],
    },
  );

  const mainPage = ctx.pages()[0] || (await ctx.newPage());

  log(
    `Starting ${site.name} Runner. Mode=${LIVE ? "LIVE" : "DRY RUN"}, Target=${TARGET}, Known Applied IDs=${Object.keys(appliedDb.appliedIds).length}`,
  );
  const injection = buildInjection();
  const deadline = Date.now() + MAX_RUNTIME_MS;
  let submitted = 0;
  let lastActivity = Date.now();
  let pendingJob = null;

  const isBusy = (p) => p.evaluate("!!window.__aaBusy").catch(() => false);

  function wire(page) {
    page.on("console", (msg) => {
      const text = msg.text();
      if (!/(?:auto-apply|instahyre-apply|foundit-apply|naukri-apply|cutshort-apply|hirist-apply|yc-apply|indeed-apply|linkedin-apply)/.test(text))
        return;
      lastActivity = Date.now();
      const clean = text
        .replace(
          /%c\[(?:auto-apply|instahyre-apply|foundit-apply|naukri-apply|cutshort-apply|hirist-apply|yc-apply|indeed-apply|linkedin-apply)\]\s*\S*/,
          "",
        )
        .trim();
      log("  " + clean.slice(0, 160));

      // Capture job evaluation info
      const mEval = clean.match(/â–¶ Evaluating: (.+)/);
      if (mEval) {
        const parts = mEval[1].split(" | ");
        const atParts = parts[0].split(" @ ");
        const company = atParts.length > 1 ? atParts.pop() : "";
        const title = atParts.join(" @ ");
        const idPart = parts.find(
          (p) => p.includes("ID:") || p.includes("jobs/") || p.includes("job/"),
        );
        const jobId =
          idPart?.replace(/Job ID:|ID:/, "").trim() ||
          idPart?.match(/(?:\/jobs\/|\/job\/|\/job-listings-|-)(\d+)/)?.[1] ||
          "";
        pendingJob = {
          id: jobId,
          title: title.trim(),
          company: (company || "").replace(/^\?$/, "").trim(),
          link: (parts[1] || "").trim(),
          salary: "",
          skills: "",
          jd: "",
          score: "",
          breakdown: "",
        };
      }

      // Capture score
      const mScore = clean.match(/(?:Evaluation Score|Score): (\d+)\/100/);
      if (mScore && pendingJob) {
        pendingJob.score = mScore[1];
      }

      const mBreak = clean.match(/Breakdown: (.+)/);
      if (mBreak && pendingJob) {
        pendingJob.breakdown = mBreak[1];
      }

      if (site.submittedRe.test(text)) {
        submitted++;
        log(
          `==> ${submitted}/${TARGET} this run (${dayState.count + 1}/${DAILY_CAP} today)`,
        );
        if (pendingJob && pendingJob.id) {
          recordAppliedJob(pendingJob.id, pendingJob);
        }
        if (LIVE) {
          bumpDayCount();
          try {
            logApplication(pendingJob || { title: "Unknown" });
          } catch (e) {
            log("CSV write error: " + e.message);
          }
        }
        pendingJob = null;
      }
    });

    page.on("load", async () => {
      if (!site.injectOn(page.url())) return;
      lastActivity = Date.now();
      await page.evaluate(injection).catch(() => {});
    });
  }

  ctx.pages().forEach(wire);
  ctx.on("page", wire);

  for (
    let searchIdx = 0;
    searchIdx < site.searches.length &&
    submitted < TARGET &&
    Date.now() < deadline;
    searchIdx++
  ) {
    const searchUrl = site.searches[searchIdx];
    log(
      `Navigating to search URL (${searchIdx + 1}/${site.searches.length}): ${searchUrl}`,
    );
    await mainPage
      .goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 60000 })
      .catch(() => {});
    await mainPage.waitForTimeout(8000);
    await mainPage.evaluate(injection).catch(() => {});

    // Allow search page to process
    let searchWait = 0;
    while (searchWait < 180000 && submitted < TARGET && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 30000));
      searchWait += 30000;
      const pages = ctx.pages();
      let anyBusy = false;
      for (const p of pages) {
        if (await isBusy(p)) anyBusy = true;
      }
      if (!anyBusy) {
        await mainPage.evaluate(injection).catch(() => {});
      }
    }
  }

  log(
    `Finished: ${submitted}/${TARGET} applications ${LIVE ? "submitted" : "simulated (dry run)"}.`,
  );
  await ctx.close();
})().catch((e) => {
  log("FATAL: " + e.message.split("\n")[0]);
  process.exit(1);
});

