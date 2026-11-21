/**
 * Application Suite Statistics & Analytics Reporter
 * Reads applications.csv and generates a clean CLI summary.
 * Usage: node stats.js
 */
const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, 'applications.csv');
const PLATFORMS = [
  'wellfound',
  'instahyre',
  'foundit',
  'naukri',
  'cutshort',
  'hirist',
  'yc',
  'indeed',
  'linkedin',
];

const content = fs.existsSync(CSV_PATH)
  ? fs.readFileSync(CSV_PATH, 'utf8').trim()
  : '';

const lines = content.split('\n').filter(Boolean);
const records = [];

function parseCsvLine(line) {
  const cols = [];
  let col = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' && quoted && line[i + 1] === '"') {
      col += '"';
      i++;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      cols.push(col);
      col = '';
    } else {
      col += char;
    }
  }
  cols.push(col);
  return cols;
}

for (let i = 1; i < lines.length; i++) {
  const cols = parseCsvLine(lines[i]);
  if (!cols.length) continue;
  records.push({
    date: cols[0] || '',
    platform: (cols[1] || 'unknown').toLowerCase(),
    title: cols[2] || 'N/A',
    company: cols[3] || 'N/A',
    skills: cols[5] || 'N/A',
    scoreRaw: cols[6] || '0/100',
    id: cols[7] || '',
    outcome: (cols[9] || 'applied').toLowerCase(),
    outcomeDate: cols[10] || '',
    outcomeNote: cols[11] || '',
  });
}

console.log('\n===============================================================');
console.log('📊 MULTI-PLATFORM AUTO-APPLY STATS & ANALYTICS DASHBOARD');
console.log('===============================================================\n');

console.log(`🎯 Total Live Applications Recorded: ${records.length}\n`);

// Breakdown by Platform
const byPlatform = {};
let totalScore = 0;
let scoreCount = 0;

for (const r of records) {
  byPlatform[r.platform] = (byPlatform[r.platform] || 0) + 1;
  const match = r.scoreRaw.match(/(\d+)/);
  if (match) {
    totalScore += parseInt(match[1], 10);
    scoreCount++;
  }
}

const PLATFORM_ICONS = {
  wellfound: '🔵',
  instahyre: '🟢',
  foundit: '🔴',
  naukri: '🔷',
  cutshort: '🟠',
  hirist: '⚡',
  yc: '🟧',
  indeed: '🌐',
  linkedin: '💼',
};

console.log('🏛 Applications by Platform:');
for (const [p, count] of Object.entries(byPlatform)) {
  const icon = PLATFORM_ICONS[p] || '🔹';
  console.log(`  ${icon} ${p.toUpperCase().padEnd(12)} : ${count} applications`);
}

const avgScore = scoreCount ? Math.round(totalScore / scoreCount) : 0;
console.log(`\n⭐ Average Match Score: ${avgScore}/100`);

const outcomes = {};
for (const r of records) {
  outcomes[r.outcome] = (outcomes[r.outcome] || 0) + 1;
}

console.log('\n📈 Application Outcome Funnel:');
const funnelStatuses = [
  'applied',
  'viewed',
  'phone-screen',
  'assessment',
  'interview',
  'offer',
  'rejected',
  'withdrawn',
];
for (const status of funnelStatuses) {
  console.log(`  ${status.padEnd(13)}: ${outcomes[status] || 0}`);
}
const interviewCount = outcomes['interview'] || 0;
const offerCount = outcomes['offer'] || 0;
console.log(`\n  Interview conversion: ${records.length ? ((interviewCount / records.length) * 100).toFixed(1) : '0.0'}%`);
console.log(`  Offer conversion: ${records.length ? ((offerCount / records.length) * 100).toFixed(1) : '0.0'}%`);

const searchPerformance = [];
for (const platform of PLATFORMS) {
  const statePath = path.join(
    __dirname,
    `search-performance-${platform}.json`,
  );
  if (!fs.existsSync(statePath)) continue;
  try {
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    for (const [url, metric] of Object.entries(state.searches || {})) {
      searchPerformance.push({ platform, url, ...metric });
    }
  } catch (error) {
    console.warn(`⚠ Could not read ${path.basename(statePath)}: ${error.message}`);
  }
}

console.log('\n🔎 Highest-yield searches (eligible jobs, then confirmed applications):');
if (searchPerformance.length) {
  searchPerformance
    .sort(
      (a, b) =>
        b.eligibleJobs - a.eligibleJobs ||
        b.confirmedApplications - a.confirmedApplications ||
        b.visits - a.visits,
    )
    .slice(0, 10)
    .forEach((search, index) => {
      console.log(
        `  ${index + 1}. [${search.platform.toUpperCase()}] ${search.query} ${search.location ? `(${search.location})` : ''} — eligible: ${search.eligibleJobs}, confirmed: ${search.confirmedApplications}, visits: ${search.visits}`,
      );
    });
} else {
  console.log('  No search data yet. Run a dry run or live application first.');
}

console.log('\n📋 Recent 5 Applications:');
if (records.length) {
  records.slice(-5).reverse().forEach((r, idx) => {
    console.log(`  ${idx + 1}. [${r.platform.toUpperCase()}] ${r.title} @ ${r.company} (Score: ${r.scoreRaw}) — ${r.date}`);
  });
} else {
  console.log('  No applications recorded yet.');
}

console.log('\n===============================================================\n');
