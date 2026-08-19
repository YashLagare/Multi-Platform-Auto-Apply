/**
 * Unit Test Suite for Foundit Two-Layer Decision Pipeline
 */
const assert = require('assert');

const TITLE_HARD_EXCLUSIONS = [
  /\b(?:technical\s+)?co-?founder\b/i,
  /\bcto\b|\bchief\s+technology\s+officer\b/i,
  /\bfounder\b/i,
  /\bhead\s+of\b/i,
  /\bdirector\b/i,
  /\bvp\b|\bvice\s+president\b/i,
  /\b(?:engineering|product|project|tech|general|program)\s+manager\b/i,
  /\bsenior\b|\bsr\.?\b/i,
  /\blead\b/i,
  /\bprincipal\b/i,
  /\bstaff\b/i,
  /\barchitect\b/i,
  /\bintern\b|\binternship\b/i,
  /\bdesigner\b|\bui\s*\/\s*ux\b/i,
  /\bqa\b|\btester\b|\btest\s+engineer\b|\bquality\s+assurance\b/i,
  /\bdevops\b|\bsre\b|\binfrastructure\b/i,
  /\bdata\s+engineer\b|\bdata\s+scientist\b|\bdata\s+analyst\b/i,
  /\bsales\b|\bmarketing\b|\bbdr\b|\bsdr\b/i,
  /\btutor\b|\bteacher\b|\btrainer\b|\binstructor\b|\bcoach\b/i,
  /\bjava\b(?!\s*script)/i,
  /\bspring(?:\s*boot)?\b/i,
  /\b\.net\b|\bc#\b/i,
  /\bphp\b|\blaravel\b/i,
  /\bruby(?:\s*on\s*rails)?\b|\brails\b/i,
  /\bgolang\b|\bgo\s+developer\b/i,
  /\brust\b/i,
  /\bflutter\b/i,
  /\bswift\b|\bios\b/i,
  /\bandroid(?:\s+native)?\b/i,
  /\bsalesforce\b|\bsap\b/i,
  /\bc\+\+\b/i,
];

const TARGET_ROLE_PATTERNS = [
  /\breact(?:\.js|js)?\b/i,
  /\bnext(?:\.js|js)?\b/i,
  /\bfrontend\b|\bfront-end\b|\bfront\s+end\b/i,
  /\bjavascript\b|\bjs\s+developer\b|\btypescript\b|\bts\s+developer\b/i,
  /\bmern(?:\s+stack)?\b/i,
  /\bfull\s*stack\b|\bfullstack\b/i,
  /\bsoftware\s+engineer\b|\bsoftware\s+developer\b|\bsde\b/i,
  /\bweb\s+developer\b/i,
];

function checkTitle(title) {
  for (const regex of TITLE_HARD_EXCLUSIONS) {
    if (regex.test(title)) return { pass: false, reason: `HARD_TITLE_EXCLUSION (${regex.source})` };
  }
  const isTarget = TARGET_ROLE_PATTERNS.some((r) => r.test(title));
  if (!isTarget) return { pass: false, reason: 'NOT_A_TARGET_ROLE' };
  return { pass: true };
}

function checkExperience(expText) {
  const t = (expText || '').toLowerCase();
  const rangeMatch = t.match(/\b(?:2\s*[-–to]\s*5|3\s*[-–to]\s*5|3\s*[-–to]\s*6|4\s*[-–to]\s*[678]|5\s*[-–to]\s*[89]|5\s*[-–to]\s*10)\s*(?:years?|yrs?)\b/i);
  if (rangeMatch) return { pass: false, reason: `EXPERIENCE_EXCEEDS_LIMIT (${rangeMatch[0]})` };

  const numMatch = t.match(/\b([3-9]|1\d)\s*(?:\+|-\s*\d+)?\s*(?:years?|yrs?)\b/i);
  if (numMatch) {
    const minNum = parseInt(numMatch[1], 10);
    if (minNum >= 4) return { pass: false, reason: `EXPERIENCE_EXCEEDS_LIMIT (${numMatch[0]})` };
  }
  return { pass: true };
}

function checkLocation(locText) {
  const t = (locText || '').toLowerCase();
  const isRemote = /\bremote\b|\bwork\s*from\s*home\b|\bwfh\b|\banywhere\b/i.test(t);
  if (/\b(?:us\s+only|uk\s+only|eu\s+only)\b/i.test(t)) return { pass: false, reason: 'FOREIGN_LOCATION_RESTRICTION' };

  const p1 = /\bbengaluru\b|\bbangalore\b|\bpune\b|\bhyderabad\b/i.test(t);
  const p2 = /\bmumbai\b|\bchennai\b|\bgurgaon\b|\bgurugram\b|\bnoida\b|\bdelhi\b/i.test(t);
  const p3 = /\bahmedabad\b/i.test(t);

  if (p1 || p2 || p3 || isRemote) return { pass: true };
  return { pass: false, reason: 'NON_PRIORITY_ONSITE_LOCATION' };
}

function checkFullStack(title, skills) {
  const isFullStack = /\bfull\s*stack\b|\bfullstack\b|\bsoftware\s+engineer\b|\bsde\b/i.test(title);
  if (!isFullStack) return { pass: true };
  const hasReact = /\breact(?:\.js|js)?\b|\bnext(?:\.js|js)?\b|\bmern\b|\btypescript\b|\bfrontend\b|\bfront-end\b|\bjavascript\b|\btailwind\b/i.test(skills);
  if (!hasReact) return { pass: false, reason: 'FULLSTACK_MISSING_REACT_STACK' };
  return { pass: true };
}

function evaluateFounditJob(job, appliedHistory = {}) {
  if (appliedHistory[job.id]) return { pass: false, reason: `ALREADY_APPLIED (${job.id})` };
  if (job.isExternalRedirect) return { pass: false, reason: 'EXTERNAL_ATS_REDIRECT' };

  const tCheck = checkTitle(job.title);
  if (!tCheck.pass) return { pass: false, reason: tCheck.reason };

  const expCheck = checkExperience(job.experience);
  if (!expCheck.pass) return { pass: false, reason: expCheck.reason };

  const locCheck = checkLocation(job.location);
  if (!locCheck.pass) return { pass: false, reason: locCheck.reason };

  const fsCheck = checkFullStack(job.title, job.skills);
  if (!fsCheck.pass) return { pass: false, reason: fsCheck.reason };

  let score = 0;
  const breakdown = [];
  const lowerTitle = job.title.toLowerCase();
  const lowerSkills = (job.skills || '').toLowerCase();

  // Role
  if (/\breact\b|\bnext(?:\.js|js)?\b|\bfrontend\b|\bfront-end\b|\bmern\b/.test(lowerTitle)) {
    score += 25; breakdown.push('Role: React/Next/Frontend/MERN (+25)');
  } else if (/full\s*stack|fullstack/.test(lowerTitle)) {
    score += 22; breakdown.push('Role: Full Stack (+22)');
  } else {
    score += 18; breakdown.push('Role: SDE/Other (+18)');
  }

  // Skills
  let tech = 0;
  if (/\breact(?:\.js|js)?\b/.test(lowerSkills)) { tech += 10; breakdown.push('React (+10)'); }
  if (/\bnext(?:\.js|js)?\b/.test(lowerSkills)) { tech += 8; breakdown.push('Next.js (+8)'); }
  if (/\btypescript\b/.test(lowerSkills)) { tech += 7; breakdown.push('TypeScript (+7)'); }
  else if (/\bjavascript\b/.test(lowerSkills)) { tech += 5; breakdown.push('JavaScript (+5)'); }
  if (/\bnode(?:\.js|js)?\b|\bmongodb\b/.test(lowerSkills)) { tech += 5; breakdown.push('Node/Mongo (+5)'); }
  if (/\btailwind(?:\s*css)?\b|\brest\b/.test(lowerSkills)) { tech += 5; breakdown.push('Tailwind/REST (+5)'); }
  score += Math.min(35, tech);

  // Exp
  if (/\b(?:0\s*-\s*2|1\s*-\s*3|0\s*-\s*1|0\s*-\s*3)\s*yrs\b/i.test(job.experience)) {
    score += 20; breakdown.push('Exp: 0-3 yrs (+20)');
  } else {
    score += 10; breakdown.push('Exp: 2-3 yrs (+10)');
  }

  // Loc
  const loc = (job.location || '').toLowerCase();
  if (/bengaluru|bangalore|pune|hyderabad|remote|work from home/.test(loc)) {
    score += 10; breakdown.push('Loc: P1 / Remote (+10)');
  } else if (/mumbai|chennai|gurgaon|gurugram|noida|delhi/.test(loc)) {
    score += 8; breakdown.push('Loc: P2 (+8)');
  } else {
    score += 6; breakdown.push('Loc: P3 (+6)');
  }

  // Freshness
  score += 10; breakdown.push('Active Search Result (+10)');

  const pass = score >= 65;
  return {
    pass,
    score,
    breakdown: breakdown.join(', '),
    reason: pass ? (score >= 75 ? 'HIGH_PRIORITY_MATCH' : 'MODERATE_MATCH') : 'LOW_MATCH_SCORE',
  };
}

console.log('=== RUNNING FOUNDIT TWO-LAYER DECISION PIPELINE TESTS ===\n');

const applied = { 'fi-101': true };
const tests = [
  {
    name: '1. Negative: Technical Co-Founder @ Foundit',
    job: { id: 'fi-201', title: 'Technical Co-Founder', experience: '1 - 3 Yrs', location: 'Remote', skills: 'React, Node.js' },
    expectedPass: false,
    expectedReasonPrefix: 'HARD_TITLE_EXCLUSION',
  },
  {
    name: '2. Negative: Foundit card with 3 - 6 Yrs experience',
    job: { id: 'fi-202', title: 'Frontend Developer', experience: '3 - 6 Yrs', location: 'Bengaluru', skills: 'React, TypeScript' },
    expectedPass: false,
    expectedReasonPrefix: 'EXPERIENCE_EXCEEDS_LIMIT',
  },
  {
    name: '3. Negative: Non-priority on-site location (Jaipur On-site)',
    job: { id: 'fi-203', title: 'Full Stack Developer', experience: '1 - 3 Yrs', location: 'Jaipur', skills: 'React, Node.js' },
    expectedPass: false,
    expectedReasonPrefix: 'NON_PRIORITY_ONSITE_LOCATION',
  },
  {
    name: '4. Negative: Full Stack Developer with only Java/Spring',
    job: { id: 'fi-204', title: 'Full Stack Developer', experience: '1 - 3 Yrs', location: 'Bengaluru', skills: 'Java, Spring Boot, MySQL' },
    expectedPass: false,
    expectedReasonPrefix: 'FULLSTACK_MISSING_REACT_STACK',
  },
  {
    name: '5. Negative: External ATS redirect link',
    job: { id: 'fi-205', title: 'React Developer', experience: '1 - 3 Yrs', location: 'Bengaluru', skills: 'React.js', isExternalRedirect: true },
    expectedPass: false,
    expectedReasonPrefix: 'EXTERNAL_ATS_REDIRECT',
  },
  {
    name: '6. Negative: Duplicate Job ID fi-101',
    job: { id: 'fi-101', title: 'React Developer', experience: '1 - 3 Yrs', location: 'Bengaluru', skills: 'React.js, Next.js' },
    expectedPass: false,
    expectedReasonPrefix: 'ALREADY_APPLIED',
  },
  {
    name: '7. Positive: React Developer @ Bengaluru (1 - 3 Yrs, React, Next, TS, Tailwind)',
    job: { id: 'fi-301', title: 'React Developer', experience: '1 - 3 Yrs', location: 'Bengaluru', skills: 'React.js, Next.js, TypeScript, Tailwind CSS, REST APIs' },
    expectedPass: true,
    minScore: 85,
  },
  {
    name: '8. Positive: Frontend Engineer @ Work from home (0 - 2 Yrs, Next.js, React, Node)',
    job: { id: 'fi-302', title: 'Frontend Engineer', experience: '0 - 2 Yrs', location: 'Work from home', skills: 'Next.js, React.js, JavaScript, Node.js, Tailwind CSS' },
    expectedPass: true,
    minScore: 85,
  },
];

let allPassed = true;
for (const tc of tests) {
  const res = evaluateFounditJob(tc.job, applied);
  console.log(`Test: ${tc.name}`);
  console.log(`  -> Pass: ${res.pass} | Score: ${res.score || 'N/A'} | Reason: ${res.reason}`);
  if (res.breakdown) console.log(`  -> Breakdown: ${res.breakdown}`);

  if (tc.expectedPass) {
    if (!res.pass || (tc.minScore && res.score < tc.minScore)) {
      console.error(`  ❌ FAILED: Expected pass with score >= ${tc.minScore}, got ${res.pass} (${res.score})`);
      allPassed = false;
    } else {
      console.log(`  ✅ PASSED\n`);
    }
  } else {
    if (res.pass || !res.reason.startsWith(tc.expectedReasonPrefix)) {
      console.error(`  ❌ FAILED: Expected fail with ${tc.expectedReasonPrefix}, got ${res.reason}`);
      allPassed = false;
    } else {
      console.log(`  ✅ PASSED\n`);
    }
  }
}

if (allPassed) {
  console.log('🎉 ALL FOUNDIT PIPELINE TESTS PASSED WITH 100% ACCURACY!');
} else {
  process.exit(1);
}
