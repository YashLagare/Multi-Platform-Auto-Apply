/**
 * Application Suite Statistics & Analytics Reporter
 * Reads applications.csv and generates a clean CLI summary.
 * Usage: node stats.js
 */
const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, 'applications.csv');

if (!fs.existsSync(CSV_PATH)) {
  console.log('❌ No applications.csv file found yet. Run an auto-apply task first!');
  process.exit(0);
}

const content = fs.readFileSync(CSV_PATH, 'utf8').trim();
if (!content) {
  console.log('ℹ applications.csv is currently empty.');
  process.exit(0);
}

const lines = content.split('\n').filter(Boolean);
const records = [];

for (const line of lines) {
  const matches = line.match(/"([^"]*)"/g);
  if (!matches) continue;
  const cols = matches.map((m) => m.replace(/^"|"$/g, ''));
  records.push({
    date: cols[0] || '',
    platform: (cols[1] || 'unknown').toLowerCase(),
    title: cols[2] || 'N/A',
    company: cols[3] || 'N/A',
    skills: cols[5] || 'N/A',
    scoreRaw: cols[6] || '0/100',
    id: cols[7] || '',
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

console.log('🏛 Applications by Platform:');
for (const [p, count] of Object.entries(byPlatform)) {
  const icon = p === 'wellfound' ? '🔵' : p === 'instahyre' ? '🟢' : p === 'foundit' ? '🔴' : '🔷';
  console.log(`  ${icon} ${p.toUpperCase().padEnd(10)} : ${count} applications`);
}

const avgScore = scoreCount ? Math.round(totalScore / scoreCount) : 0;
console.log(`\n⭐ Average Match Score: ${avgScore}/100`);

console.log('\n📋 Recent 5 Applications:');
records.slice(-5).reverse().forEach((r, idx) => {
  console.log(`  ${idx + 1}. [${r.platform.toUpperCase()}] ${r.title} @ ${r.company} (Score: ${r.scoreRaw}) — ${r.date}`);
});

console.log('\n===============================================================\n');
