/**
 * Auto-Apply Runner — drives the console auto-apply script with Playwright & Stealth.
 * Manages persistent job ID database, daily quotas, rate-limiting, and CSV logging.
 *
 * Usage:
 *   node auto-apply-runner.js wellfound login      one-time: visible Chrome opens — log in manually, then close window
 *   node auto-apply-runner.js wellfound            dry run: evaluates, fills forms, simulates submit
 *   node auto-apply-runner.js wellfound --live     applies for real & logs to CSV + applied-jobs.json
 */
const path = require('path');
const fs = require('fs');
const { CV, geminiKey } = require('./config');

let chromium;
try {
  const { addExtra } = require('playwright-extra');
  chromium = addExtra(require('playwright-core').chromium);
  chromium.use(require('puppeteer-extra-plugin-stealth')());
} catch (e) {
  ({ chromium } = require('playwright-core'));
}

process.on('unhandledRejection', (e) => console.log(`[${new Date().toLocaleString()}] unhandledRejection (ignored): ${String(e && e.message || e).split('\n')[0]}`));
process.on('uncaughtException', (e) => console.log(`[${new Date().toLocaleString()}] uncaughtException (ignored): ${String(e && e.message || e).split('\n')[0]}`));

const SITE_ARG = process.argv[2] || 'wellfound';
const LOGIN_MODE = process.argv.includes('login');
const LIVE = process.argv.includes('--live');

const SITES = {
  wellfound: {
    script: 'wellfound-auto-apply.js',
    profile: '.wellfound-chrome-profile',
    searches: ['https://wellfound.com/jobs'],
    loginUrl: 'https://wellfound.com/login',
    injectOn: (url) => /wellfound\.com/.test(url),
    submittedRe: /application sent|DRY_RUN — would click/i,
    dailyCap: 50,
  },
};

const site = SITES[SITE_ARG];
if (!site) {
  console.log('Usage: node auto-apply-runner.js wellfound [login|--live]');
  process.exit(1);
}

// ======== Persistent Job ID Database (applied-jobs.json) ========
const APPLIED_DB_FILE = path.join(__dirname, 'applied-jobs.json');
const CSV_FILE = path.join(__dirname, 'applications.csv');

function loadAppliedDatabase() {
  let db = { appliedIds: {} };
  try {
    if (fs.existsSync(APPLIED_DB_FILE)) {
      db = JSON.parse(fs.readFileSync(APPLIED_DB_FILE, 'utf8').replace(/^﻿/, ''));
    }
  } catch (e) {}

  // Seed from applications.csv if any IDs are missing
  try {
    if (fs.existsSync(CSV_FILE)) {
      const lines = fs.readFileSync(CSV_FILE, 'utf8').split(/\r?\n/);
      for (const line of lines) {
        const m = line.match(/\/jobs\/(\d+)/);
        if (m && m[1]) {
          db.appliedIds[m[1]] = db.appliedIds[m[1]] || { date: 'historical', source: 'csv' };
        }
      }
    }
  } catch (e) {}

  return db;
}

const appliedDb = loadAppliedDatabase();
function recordAppliedJob(jobId, jobData) {
  if (!jobId) return;
  appliedDb.appliedIds[jobId] = {
    date: new Date().toLocaleString(),
    title: jobData.title || '',
    company: jobData.company || '',
    score: jobData.score || '',
    breakdown: jobData.breakdown || '',
    link: jobData.link || `https://wellfound.com/jobs/${jobId}`,
  };
  try {
    fs.writeFileSync(APPLIED_DB_FILE, JSON.stringify(appliedDb, null, 2));
  } catch (e) {
    console.error('Failed to write applied-jobs.json:', e.message);
  }
}

// Daily Cap Tracking
const DAILY_CAP = site.dailyCap || 50;
const STATE_FILE = path.join(__dirname, `apply-state-${SITE_ARG}.json`);
const todayKey = new Date().toDateString();
let dayState = { date: todayKey, count: 0 };
try {
  const s = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8').replace(/^﻿/, ''));
  if (s.date === todayKey) dayState = s;
} catch (e) {}
const bumpDayCount = () => {
  dayState.count++;
  try { fs.writeFileSync(STATE_FILE, JSON.stringify(dayState)); } catch (e) {}
};
const TARGET = DAILY_CAP - dayState.count;
const MAX_RUNTIME_MS = 100 * 60 * 1000;

const log = (msg) => console.log(`[${new Date().toLocaleString()}] [${SITE_ARG}] ${msg}`);

// CSV Logging
const SKILLS = ['JavaScript', 'TypeScript', 'Python', 'React', 'Next.js', 'Node.js', 'Express',
  'MongoDB', 'PostgreSQL', 'Prisma', 'Drizzle', 'REST', 'Tailwind', 'Redux', 'Zustand', 'Docker', 'AWS', 'Gemini'];
const matchSkills = (t) => {
  const l = (t || '').toLowerCase();
  return SKILLS.filter((s) => l.includes(s.toLowerCase())).join('; ');
};
const csvRow = (vals) => vals.map((v) => '"' + String(v || '').replace(/"/g, '""').replace(/\s+/g, ' ').trim() + '"').join(',') + '\n';

function logApplication(job) {
  if (!fs.existsSync(CSV_FILE)) {
    fs.writeFileSync(CSV_FILE, '﻿' + csvRow(['Date', 'Site', 'Role', 'Company', 'CTC/Salary', 'Skills', 'Match Score', 'Job Link', 'Job Description']));
  }
  fs.appendFileSync(CSV_FILE, csvRow([
    new Date().toLocaleString(),
    SITE_ARG,
    job.title,
    job.company,
    job.salary,
    job.skills || matchSkills(job.title + ' ' + (job.jd || '')),
    job.score ? `${job.score}/100` : '',
    job.link,
    (job.jd || '').slice(0, 1200),
  ]));
}

// Injected Script Builder
function buildInjection() {
  const raw = fs
    .readFileSync(path.join(__dirname, site.script), 'utf8')
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
  if (!LOGIN_MODE && TARGET <= 0) {
    log(`Daily cap of ${DAILY_CAP} applications reached (${dayState.count} today) — exiting.`);
    return;
  }

  const ctx = await chromium.launchPersistentContext(path.join(__dirname, site.profile), {
    channel: 'chrome',
    headless: false,
    viewport: { width: 1280, height: 900 },
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-popup-blocking',
      ...(LOGIN_MODE ? [] : ['--window-position=-32000,-32000']),
    ],
  });

  const mainPage = ctx.pages()[0] || (await ctx.newPage());

  if (LOGIN_MODE) {
    await mainPage.goto(site.loginUrl, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    log('Chrome is open — log in to Wellfound, then CLOSE the browser window.');
    await new Promise((res) => ctx.on('close', res));
    log('Login session saved. Test with: npm run dry-run');
    return;
  }

  log(`Starting Decision Pipeline Runner. Mode=${LIVE ? 'LIVE' : 'DRY RUN'}, Target=${TARGET}, Known Applied IDs=${Object.keys(appliedDb.appliedIds).length}`);
  const injection = buildInjection();
  const deadline = Date.now() + MAX_RUNTIME_MS;
  let submitted = 0;
  let lastActivity = Date.now();
  let pendingJob = null;

  const isBusy = (p) => p.evaluate('!!window.__aaBusy').catch(() => false);

  function wire(page) {
    page.on('console', (msg) => {
      const text = msg.text();
      if (!/auto-apply/.test(text)) return;
      lastActivity = Date.now();
      const clean = text.replace(/%c\[auto-apply\]\s*\S*/, '').trim();
      log('  ' + clean.slice(0, 160));

      // Capture job evaluation info
      const mEval = clean.match(/▶ Evaluating: (.+)/);
      if (mEval) {
        const [main, linkPart, idPart] = mEval[1].split(' | ');
        const atParts = main.split(' @ ');
        const company = atParts.length > 1 ? atParts.pop() : '';
        const title = atParts.join(' @ ');
        const jobId = (idPart || '').replace('Job ID:', '').trim() || (linkPart || '').match(/\/jobs\/(\d+)/)?.[1] || '';
        pendingJob = {
          id: jobId,
          title: title.trim(),
          company: (company || '').replace(/^\?$/, '').trim(),
          link: (linkPart || '').trim(),
          salary: '',
          skills: '',
          jd: '',
          score: '',
          breakdown: '',
        };
      }

      // Capture score
      const mScore = clean.match(/Evaluation Score: (\d+)\/100/);
      if (mScore && pendingJob) {
        pendingJob.score = mScore[1];
      }

      const mBreak = clean.match(/Breakdown: (.+)/);
      if (mBreak && pendingJob) {
        pendingJob.breakdown = mBreak[1];
      }

      if (site.submittedRe.test(text)) {
        submitted++;
        log(`==> ${submitted}/${TARGET} this run (${dayState.count + 1}/${DAILY_CAP} today)`);
        if (pendingJob && pendingJob.id) {
          recordAppliedJob(pendingJob.id, pendingJob);
        }
        if (LIVE) {
          bumpDayCount();
          try {
            logApplication(pendingJob || { title: 'Unknown' });
          } catch (e) {
            log('CSV write error: ' + e.message);
          }
        }
        pendingJob = null;
      }
    });

    page.on('load', async () => {
      if (!site.injectOn(page.url())) return;
      lastActivity = Date.now();
      await page.evaluate(injection).catch(() => {});
    });
  }

  ctx.pages().forEach(wire);
  ctx.on('page', wire);

  await mainPage.goto(site.searches[0], { waitUntil: 'domcontentloaded', timeout: 60000 });
  await mainPage.waitForTimeout(8000);
  await mainPage.evaluate(injection).catch(() => {});

  while (submitted < TARGET && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 30000));

    const pages = ctx.pages();
    let anyBusy = false;
    for (const p of pages) {
      if (await isBusy(p)) anyBusy = true;
    }

    if (!anyBusy) {
      await mainPage.evaluate(injection).catch(() => {});
    }
  }

  log(`Finished: ${submitted}/${TARGET} applications ${LIVE ? 'submitted' : 'simulated (dry run)'}.`);
  await ctx.close();
})().catch((e) => {
  log('FATAL: ' + e.message.split('\n')[0]);
  process.exit(1);
});
